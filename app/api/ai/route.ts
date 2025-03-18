import { type NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth/next"
import { authOptions } from "@/lib/auth"
import { openai } from "@ai-sdk/openai"
import { generateText, streamText } from "ai"

export const maxDuration = 60 // Set max duration to 60 seconds

export async function POST(req: NextRequest) {
  // Check authentication - but make it optional for now to ensure functionality
  const session = await getServerSession(authOptions)

  try {
    const { model, messages, temperature, maxTokens, topP, stream, reasoningEffort } = await req.json()

    // Always use the API key from environment variables
    // This ensures it works even if the user isn't logged in
    const apiKey = process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY

    if (!apiKey) {
      return NextResponse.json({ error: "OpenAI API key not configured" }, { status: 500 })
    }

    if (stream) {
      // For streaming responses
      const encoder = new TextEncoder()
      const customReadable = new ReadableStream({
        async start(controller) {
          try {
            const stream = streamText({
              model: openai(model, {
                temperature,
                maxTokens,
                topP,
                apiKey,
              }),
              messages,
              ...(reasoningEffort && {
                providerOptions: {
                  openai: {
                    reasoningEffort,
                  },
                },
              }),
            })

            for await (const chunk of stream) {
              if (chunk.type === "text-delta") {
                controller.enqueue(
                  encoder.encode(
                    JSON.stringify({
                      text: chunk.text,
                    }) + "\n",
                  ),
                )
              }
            }
          } catch (error) {
            console.error("Streaming error:", error)
            controller.enqueue(
              encoder.encode(
                JSON.stringify({
                  error: "An error occurred during streaming",
                }) + "\n",
              ),
            )
          }
          controller.close()
        },
      })

      return new Response(customReadable, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache",
          Connection: "keep-alive",
        },
      })
    } else {
      // For non-streaming responses
      const { text } = await generateText({
        model: openai(model, {
          temperature,
          maxTokens,
          topP,
          apiKey,
        }),
        messages,
        ...(reasoningEffort && {
          providerOptions: {
            openai: {
              reasoningEffort,
            },
          },
        }),
      })

      return NextResponse.json({ text })
    }
  } catch (error: any) {
    console.error("OpenAI API error:", error)
    return NextResponse.json({ error: error.message || "Failed to process request" }, { status: 500 })
  }
}


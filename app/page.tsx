"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export default function Home() {
  const [input, setInput] = useState("")
  const [output, setOutput] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return

    setLoading(true)
    try {
      const { text } = await generateText({
        model: openai("gpt-4o"),
        prompt: input,
        apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY || process.env.OPENAI_API_KEY,
      })

      setOutput(text)
    } catch (error) {
      console.error("Error:", error)
      setOutput("Error: Failed to generate response. Please check your API key.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6 text-center">AI Playground</h1>

      <Card>
        <CardHeader>
          <CardTitle>Ask anything</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit}>
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message here..."
              className="min-h-[120px] mb-4"
            />
            <Button type="submit" disabled={loading || !input.trim()}>
              {loading ? "Generating..." : "Generate"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {output && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Response</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap">{output}</div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


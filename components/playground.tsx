"use client"

import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable"
import { ModelSelector } from "@/components/model-selector"
import { ParameterControls } from "@/components/parameter-controls"
import { FileUploader } from "@/components/file-uploader"
import { ChatInterface } from "@/components/chat-interface"
import { ConsoleViewer } from "@/components/console-viewer"
import { ExportOptions } from "@/components/export-options"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { ModelConfig, LogEntry, FileData, ChatMessage } from "@/types/playground"
import { defaultModelConfig } from "@/lib/model-defaults"
import { ThemeToggle } from "@/components/theme-toggle"
import { BrightnessControl } from "@/components/brightness-control"
import { callOpenAI, processAudioInput, generateAudioResponse } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useSession } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChatHistorySidebar } from "@/components/chat-history-sidebar"
import { Sparkles, Settings } from "lucide-react"

export function Playground() {
  const [modelConfig, setModelConfig] = useState<ModelConfig>(defaultModelConfig)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [files, setFiles] = useState<FileData[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [currentStreamedText, setCurrentStreamedText] = useState("")
  const { toast } = useToast()
  const [chatSessions, setChatSessions] = useState<any[]>([])
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const { data: session } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Add this useEffect to load chat sessions and current session
  useEffect(() => {
    if (session) {
      // Fetch chat sessions
      const fetchChatSessions = async () => {
        try {
          const response = await fetch("/api/chat/sessions")
          if (response.ok) {
            const data = await response.json()
            setChatSessions(data)
          }
        } catch (error) {
          console.error("Error fetching chat sessions:", error)
        }
      }

      fetchChatSessions()

      // Check if a session ID is in the URL
      const sessionId = searchParams.get("session")
      if (sessionId) {
        setCurrentSessionId(sessionId)
        loadChatSession(sessionId)
      }
    }
  }, [session, searchParams])

  // Add this function to load a chat session
  const loadChatSession = async (sessionId: string) => {
    try {
      const response = await fetch(`/api/chat/sessions/${sessionId}`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages)
      }
    } catch (error) {
      console.error("Error loading chat session:", error)
    }
  }

  const addLog = (type: string, message: string, details?: any) => {
    const timestamp = new Date().toISOString()
    setLogs((prev) => [...prev, { timestamp, type, message, details }])
  }

  const handleModelChange = (config: Partial<ModelConfig>) => {
    setModelConfig((prev) => ({ ...prev, ...config }))
    addLog("config", "Model configuration updated", config)
  }

  const handleFileUpload = (newFiles: FileData[]) => {
    setFiles((prev) => [...prev, ...newFiles])
    addLog(
      "files",
      `${newFiles.length} file(s) uploaded`,
      newFiles.map((f) => f.name),
    )
  }

  const handleAudioRecorded = async (audioBlob: Blob) => {
    setIsProcessing(true)
    addLog("audio", "Processing audio recording")

    try {
      const result = await processAudioInput(audioBlob, modelConfig)

      // Create a user message with the transcribed text
      const userMessage: ChatMessage = {
        role: "user",
        content: result.text,
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, userMessage])
      addLog("audio", "Audio transcription completed", { text: result.text })

      // Automatically send the transcribed text to the API
      await handleSendMessage(result.text)
    } catch (error) {
      addLog("error", "Error processing audio", error)
      toast({
        title: "Audio Processing Error",
        description: "Failed to process audio recording.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Modify the handleSendMessage function to save messages
  const handleSendMessage = async (content: string) => {
    if ((!content.trim() && files.length === 0) || isProcessing) return

    // Create a new session if none exists
    if (!currentSessionId) {
      try {
        const response = await fetch("/api/chat/sessions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: content.slice(0, 30) + (content.length > 30 ? "..." : ""),
          }),
        })

        if (response.ok) {
          const data = await response.json()
          setCurrentSessionId(data.id)
          setChatSessions([data, ...chatSessions])
          router.push(`/?session=${data.id}`)
        }
      } catch (error) {
        console.error("Error creating chat session:", error)
      }
    }

    const userMessage = {
      role: "user" as const,
      content,
      files: [...files],
      timestamp: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setFiles([])
    setIsProcessing(true)
    setCurrentStreamedText("")

    // Save user message to the database if we have a session
    if (currentSessionId) {
      try {
        await fetch(`/api/chat/sessions/${currentSessionId}/messages`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            role: "user",
            content,
          }),
        })
      } catch (error) {
        console.error("Error saving user message:", error)
      }
    }

    addLog("request", "Sending request to OpenAI API", {
      model: modelConfig.model,
      content,
      files: files.map((f) => f.name),
      parameters: {
        temperature: modelConfig.temperature,
        maxTokens: modelConfig.maxTokens,
        topP: modelConfig.topP,
        reasoningEffort: modelConfig.reasoningEffort,
      },
    })

    try {
      // Use the streaming API if enabled
      if (modelConfig.streaming) {
        const handleChunk = (chunk: string) => {
          setCurrentStreamedText((prev) => prev + chunk)
        }

        const fullText = await callOpenAI(modelConfig, messages.concat(userMessage), handleChunk, (error) => {
          addLog("error", "Error calling OpenAI API", error)
          toast({
            title: "API Error",
            description: error.message || "Failed to get a response from the API.",
            variant: "destructive",
          })
        })

        // Create the assistant message with the full response
        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: fullText || currentStreamedText,
          timestamp: new Date().toISOString(),
        }

        // If this is an audio model that supports audio output, generate speech
        if (modelConfig.supportsAudio && modelConfig.supportsAudioOutput) {
          try {
            const audioResult = await generateAudioResponse(fullText || currentStreamedText, modelConfig)
            assistantMessage.audioUrl = audioResult.audio
          } catch (error) {
            addLog("error", "Error generating audio response", error)
          }
        }

        setMessages((prev) => [...prev, assistantMessage])
        setCurrentStreamedText("")

        addLog("response", "Received response from OpenAI API", {
          model: modelConfig.model,
          content: fullText,
        })

        // After getting the AI response, save it to the database
        if (currentSessionId) {
          try {
            await fetch(`/api/chat/sessions/${currentSessionId}/messages`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                role: "assistant",
                content: fullText || currentStreamedText,
              }),
            })
          } catch (error) {
            console.error("Error saving assistant message:", error)
          }
        }
      } else {
        // Non-streaming API call
        const text = await callOpenAI(modelConfig, messages.concat(userMessage), undefined, (error) => {
          addLog("error", "Error calling OpenAI API", error)
          toast({
            title: "API Error",
            description: "Failed to get a response from the API.",
            variant: "destructive",
          })
        })

        const assistantMessage: ChatMessage = {
          role: "assistant",
          content: text,
          timestamp: new Date().toISOString(),
        }

        // If this is an audio model that supports audio output, generate speech
        if (modelConfig.supportsAudio && modelConfig.supportsAudioOutput) {
          try {
            const audioResult = await generateAudioResponse(text, modelConfig)
            assistantMessage.audioUrl = audioResult.audio
          } catch (error) {
            addLog("error", "Error generating audio response", error)
          }
        }

        setMessages((prev) => [...prev, assistantMessage])

        addLog("response", "Received response from OpenAI API", {
          model: modelConfig.model,
          content: text,
        })

        // After getting the AI response, save it to the database
        if (currentSessionId) {
          try {
            await fetch(`/api/chat/sessions/${currentSessionId}/messages`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                role: "assistant",
                content: text,
              }),
            })
          } catch (error) {
            console.error("Error saving assistant message:", error)
          }
        }
      }
    } catch (error: any) {
      addLog("error", "Error calling OpenAI API", error)
      toast({
        title: "API Error",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      })

      // Add a system message to the chat
      const errorMessage: ChatMessage = {
        role: "system",
        content: `Error: ${error.message || "Failed to get a response from the API. Please check your API key and try again."}`,
        timestamp: new Date().toISOString(),
      }

      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsProcessing(false)
    }
  }

  const clearConversation = () => {
    setMessages([])
    addLog("system", "Conversation cleared")
  }

  // Update the return statement to include the sidebar
  return (
    <ResizablePanelGroup direction="vertical" className="min-h-screen">
      <div className="flex items-center justify-between p-3 border-b bg-card">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold flex items-center">
            <Sparkles className="h-5 w-5 mr-2 text-primary" />
            AI Playground
          </h1>
          <BrightnessControl />
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="outline" size="sm" className="h-8">
            <Settings className="h-4 w-4 mr-1" />
            Settings
          </Button>
        </div>
      </div>
      <ResizablePanel defaultSize={80} minSize={30}>
        <ResizablePanelGroup direction="horizontal">
          <ResizablePanel defaultSize={20} minSize={15} maxSize={30} className="border-r">
            <ChatHistorySidebar />
          </ResizablePanel>
          <ResizablePanel defaultSize={25} minSize={15} maxSize={40} className="border-r overflow-hidden">
            <div className="p-4">
              <h2 className="text-lg font-medium mb-4">Model Settings</h2>
              <div className="space-y-6">
                <ModelSelector modelConfig={modelConfig} onChange={handleModelChange} />
                <ParameterControls modelConfig={modelConfig} onChange={handleModelChange} />
                <FileUploader
                  onFilesSelected={handleFileUpload}
                  files={files}
                  onClearFiles={() => setFiles([])}
                  onAudioRecorded={modelConfig.supportsAudio ? handleAudioRecorded : undefined}
                />
                <ExportOptions messages={messages} />
              </div>
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle />
          <ResizablePanel defaultSize={55}>
            <ChatInterface
              messages={messages}
              onSendMessage={handleSendMessage}
              isProcessing={isProcessing}
              modelConfig={modelConfig}
              files={files}
              onClearConversation={clearConversation}
              currentStreamedText={currentStreamedText}
            />
          </ResizablePanel>
        </ResizablePanelGroup>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={20} minSize={10}>
        <Tabs defaultValue="console" className="h-full flex flex-col">
          <TabsList className="mx-4 mt-2 justify-start">
            <TabsTrigger value="console">Console</TabsTrigger>
            <TabsTrigger value="context">Context Window</TabsTrigger>
          </TabsList>
          <TabsContent value="console" className="flex-1 overflow-hidden">
            <ConsoleViewer logs={logs} onClearLogs={() => setLogs([])} />
          </TabsContent>
          <TabsContent value="context" className="flex-1 p-4 overflow-auto">
            <div className="h-full">
              <h3 className="text-lg font-medium mb-2">Current Context Window</h3>
              <div className="text-sm space-y-2">
                <p>Total tokens: {calculateTokens(messages)}</p>
                <p>Max context size: {getMaxContextSize(modelConfig.model)}</p>
                <div className="w-full bg-secondary h-2 mt-2 rounded-full overflow-hidden">
                  <div
                    className="bg-primary h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (calculateTokens(messages) / getMaxContextSize(modelConfig.model)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

// Helper functions
function calculateTokens(messages: ChatMessage[]): number {
  // This is a very rough estimation
  return messages.reduce((acc, msg) => {
    return acc + msg.content.length / 4
  }, 0)
}

function getMaxContextSize(model: string): number {
  const contextSizes: Record<string, number> = {
    "gpt-4o": 128000,
    "gpt-4o-mini": 128000,
    "gpt-4.5-preview": 128000,
    o1: 32000,
    "o1-mini": 32000,
    "o3-mini": 32000,
    "whisper-1": 0,
  }

  return contextSizes[model] || 8000
}


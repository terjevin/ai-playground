"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Mic, MicOff, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { useMediaRecorder } from "@/hooks/use-media-recorder"
import type { ModelConfig } from "@/types/playground"

interface ChatInputProps {
  onSendMessage: (message: string) => void
  isProcessing: boolean
  modelConfig: ModelConfig
  onAudioRecorded?: (blob: Blob) => void
}

export function ChatInput({ onSendMessage, isProcessing, modelConfig, onAudioRecorded }: ChatInputProps) {
  const [message, setMessage] = useState("")
  const [isCodeDetected, setIsCodeDetected] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { isRecording, startRecording, stopRecording, audioBlob, isPermissionDenied } = useMediaRecorder()

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "inherit"
      const scrollHeight = textareaRef.current.scrollHeight
      textareaRef.current.style.height = `${scrollHeight}px`
    }
  }, [message])

  // Detect code in the message
  useEffect(() => {
    // Simple code detection heuristics
    const codePatterns = [
      /```[\s\S]*?```/, // Markdown code blocks
      /<[a-z]+(\s+[a-z]+=".*?")*>[\s\S]*?<\/[a-z]+>/, // HTML tags
      /function\s+\w+\s*$$.*?$$\s*{[\s\S]*?}/, // JavaScript functions
      /const|let|var\s+\w+\s*=/, // JavaScript variable declarations
      /import\s+.*?from\s+['"].*?['"]/, // JavaScript imports
      /class\s+\w+(\s+extends\s+\w+)?\s*{[\s\S]*?}/, // JavaScript/TypeScript classes
      /def\s+\w+\s*$$.*?$$:/, // Python functions
      /\{\s*".*?":\s*.*?\}/, // JSON objects
    ]

    const hasCode = codePatterns.some((pattern) => pattern.test(message))
    setIsCodeDetected(hasCode)
  }, [message])

  const handleSend = () => {
    if (message.trim() && !isProcessing) {
      onSendMessage(message)
      setMessage("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleAudioComplete = () => {
    if (audioBlob && onAudioRecorded) {
      onAudioRecorded(audioBlob)
    }
  }

  return (
    <div className={cn("flex items-end gap-2 p-4 border-t bg-background", isCodeDetected && "border-amber-500")}>
      {isCodeDetected && (
        <div className="absolute -top-6 left-0 right-0 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 text-xs px-4 py-1 text-center">
          Code detected - formatting will be preserved
        </div>
      )}
      <Textarea
        ref={textareaRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Type a message..."
        className={cn(
          "min-h-[60px] max-h-[200px] resize-none",
          isCodeDetected && "border-amber-500 focus-visible:ring-amber-500",
        )}
        disabled={isProcessing}
      />
      <div className="flex flex-col gap-2">
        {modelConfig.supportsAudio && onAudioRecorded && (
          <Button
            variant={isRecording ? "destructive" : "outline"}
            size="icon"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing || isPermissionDenied}
            title={isPermissionDenied ? "Microphone access denied" : isRecording ? "Stop recording" : "Start recording"}
          >
            {isRecording ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
        )}
        <Button
          onClick={isRecording ? handleAudioComplete : handleSend}
          disabled={(isRecording ? false : !message.trim()) || (isProcessing && !isRecording)}
          size="icon"
        >
          {isProcessing && !isRecording ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
        </Button>
      </div>
    </div>
  )
}


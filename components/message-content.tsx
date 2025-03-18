"use client"

import { useState, useEffect } from "react"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus, vs } from "react-syntax-highlighter/dist/esm/styles/prism"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Check, Copy } from "lucide-react"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"

interface MessageContentProps {
  content: string
}

export function MessageContent({ content }: MessageContentProps) {
  const { theme } = useTheme()
  const isDarkTheme = theme === "dark"

  return (
    <div className="prose dark:prose-invert max-w-none">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "")
            const language = match ? match[1] : ""

            if (inline) {
              return (
                <code className={cn("px-1 py-0.5 rounded bg-muted font-mono text-sm", className)} {...props}>
                  {children}
                </code>
              )
            }

            return (
              <CodeBlock
                language={language || "text"}
                value={String(children).replace(/\n$/, "")}
                isDarkTheme={isDarkTheme}
              />
            )
          },
          pre({ children }) {
            return <>{children}</>
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

interface CodeBlockProps {
  language: string
  value: string
  isDarkTheme: boolean
}

function CodeBlock({ language, value, isDarkTheme }: CodeBlockProps) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (copied) {
      const timeout = setTimeout(() => setCopied(false), 2000)
      return () => clearTimeout(timeout)
    }
  }, [copied])

  const handleCopy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
  }

  return (
    <div className="relative group">
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-8 w-8 bg-background/80 backdrop-blur-sm" onClick={handleCopy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </Button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={isDarkTheme ? vscDarkPlus : vs}
        customStyle={{
          margin: 0,
          borderRadius: "0.375rem",
          padding: "1rem",
        }}
        PreTag="div"
      >
        {value}
      </SyntaxHighlighter>
    </div>
  )
}


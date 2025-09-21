"use client"

import {
  ChatContainerContent,
  ChatContainerRoot,
} from "@/components/prompt-kit/chat-container"
import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
} from "@/components/prompt-kit/message"
import {
  PromptInput,
  PromptInputAction,
  PromptInputActions,
  PromptInputTextarea,
} from "@/components/prompt-kit/prompt-input"
import { ScrollButton } from "@/components/prompt-kit/scroll-button"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import { extractSourcesFromToolParts } from "@/lib/sources"
import { ChatUploadProgress } from "@/components/chat-upload-progress"
import {
  ArrowUp,
  Copy,
  Globe,
  Mic,
  MoreHorizontal,
  Pencil,
  Plus,
  PlusIcon,
  Search,
  ThumbsDown,
  ThumbsUp,
  Trash,
} from "lucide-react"
import { useRef, useState, useCallback, useEffect } from "react"
import { Tool, type ToolPart } from "@/components/ui/tool"
import { FileUpload, FileUploadTrigger, FileUploadContent } from "@/components/ui/file-upload"
import { v4 as uuidv4 } from "uuid"

interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  toolParts?: ToolPart[]
}

interface ActiveRun {
  runId: string
  documentId: string
  sessionId: string
}

interface UploadResult {
  success: boolean
  runId?: string
  documentId?: string
  sessionId?: string
  message?: string
  error?: string
}

// Custom useChat hook implementation
function useChat({ api }: { api: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleInputChange = useCallback((value: string) => {
    setInput(value)
  }, [])

  const handleSubmit = useCallback(async () => {
    if (!input.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim()
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch(api, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage]
        }),
      })

      if (!response.ok) {
        // Try to get error details from response
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          }
        } catch (e) {
          // If we can't parse the error response, use the default message
        }
        throw new Error(`API Error: ${errorMessage}`);
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("No response body")
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: ""
      }

      setMessages(prev => [...prev, assistantMessage])

      // Read the stream
      let content = ""
      let toolParts: ToolPart[] = []
      let currentToolPart: Partial<ToolPart> | null = null

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = new TextDecoder().decode(value)
        // Debug: raw SSE chunk
        try { console.debug("[SSE] raw chunk", chunk); } catch {}
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try { console.debug("[SSE] line", line); } catch {}
            try {
              const data = JSON.parse(line.slice(6))
              try { console.debug("[SSE] event", data.type, data); } catch {}

              // Handle AI SDK v5 streaming format
              if (data.type === 'text-delta' && data.delta) {
                content += data.delta
                setMessages(prev => prev.map((msg, idx) =>
                  idx === prev.length - 1
                    ? { ...msg, content }
                    : msg
                ))
              }
              // Handle tool events
              else if (data.type === 'tool-input-start') {
                currentToolPart = {
                  type: data.toolName || 'vectorSearch',
                  state: 'input-streaming',
                  toolCallId: data.toolCallId,
                  input: {}
                }
              }
              else if (data.type === 'tool-input-delta' && currentToolPart?.toolCallId === data.toolCallId) {
                if (data.inputTextDelta && data.inputTextDelta.trim() && currentToolPart) {
                  // Accumulate input data
                  try {
                    const inputData = JSON.parse(data.inputTextDelta.trim())
                    currentToolPart.input = { ...currentToolPart.input, ...inputData }
                  } catch (e) {
                    // If it's not JSON, just store as raw text
                    currentToolPart.input = { 
                      ...currentToolPart.input, 
                      raw: (currentToolPart.input?.raw || '') + data.inputTextDelta 
                    }
                  }
                  
                  // Update tool part state to input-available
                  currentToolPart.state = 'input-available'
                  
                  // Update or add current tool part
                  const updatedToolParts = [...toolParts]
                  const existingIndex = updatedToolParts.findIndex(tp => tp.toolCallId === currentToolPart?.toolCallId)
                  if (existingIndex >= 0) {
                    updatedToolParts[existingIndex] = currentToolPart as ToolPart
                  } else {
                    updatedToolParts.push(currentToolPart as ToolPart)
                  }
                  toolParts = updatedToolParts
                  
                  // Update UI
                  setMessages(prev => prev.map((msg, idx) =>
                    idx === prev.length - 1
                      ? { ...msg, content, toolParts: [...toolParts] }
                      : msg
                  ))
                }
              }
              else if (data.type === 'tool-output-available' && currentToolPart?.toolCallId === data.toolCallId) {
                if (currentToolPart) {
                  currentToolPart.state = 'output-available'
                  currentToolPart.output = data.output
                  
                  // Update tool parts
                  const updatedToolParts = [...toolParts]
                  const existingIndex = updatedToolParts.findIndex(tp => tp.toolCallId === currentToolPart?.toolCallId)
                  if (existingIndex >= 0) {
                    updatedToolParts[existingIndex] = currentToolPart as ToolPart
                  } else {
                    updatedToolParts.push(currentToolPart as ToolPart)
                  }
                  toolParts = updatedToolParts

                  // Update the UI with the tool results
                  setMessages(prev => prev.map((msg, idx) =>
                    idx === prev.length - 1
                      ? { ...msg, content, toolParts: [...toolParts] }
                      : msg
                  ))
                }
              }
              else if (data.type === 'tool-error' && currentToolPart?.toolCallId === data.toolCallId) {
                if (currentToolPart) {
                  currentToolPart.state = 'output-error'
                  currentToolPart.errorText = data.error || 'Tool execution failed'
                  
                  // Update tool parts
                  const updatedToolParts = [...toolParts]
                  const existingIndex = updatedToolParts.findIndex(tp => tp.toolCallId === currentToolPart?.toolCallId)
                  if (existingIndex >= 0) {
                    updatedToolParts[existingIndex] = currentToolPart as ToolPart
                  } else {
                    updatedToolParts.push(currentToolPart as ToolPart)
                  }
                  toolParts = updatedToolParts

                  // Update UI
                  setMessages(prev => prev.map((msg, idx) =>
                    idx === prev.length - 1
                      ? { ...msg, content, toolParts: [...toolParts] }
                      : msg
                  ))
                }
              }
              else if (data.type === 'finish-step') {
                currentToolPart = null
              }
            } catch (e) {
              // Ignore parsing errors
            }
          }
        }
      }
    } catch (error) {
      console.error("Chat error:", error)
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `❌ Error: ${errorMessage}. Please try again or contact support if the issue persists.`
      }])
    } finally {
      setIsLoading(false)
    }
  }, [input, messages, isLoading, api])

  return {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading
  }
}


function ChatSidebar({ 
  onUploadTrigger, 
  uploadStatus,
  uploadMessage,
  activeRuns,
  sessionId,
  accessToken 
}: {
  onUploadTrigger: () => void
  uploadStatus: string
  uploadMessage: string
  activeRuns: ActiveRun[]
  sessionId: string
  accessToken: string | null
}) {
  return (
    <Sidebar>
      <SidebarHeader className="flex flex-row items-center justify-between gap-2 px-2 py-4">
        <div className="flex flex-row items-center gap-2 px-2">
          <div className="bg-primary/10 size-8 rounded-md"></div>
          <div className="text-md font-base text-primary tracking-tight">
            Lupa Playground
          </div>
        </div>
        <Button variant="ghost" className="size-8">
          <Search className="size-4" />
        </Button>
      </SidebarHeader>
      <SidebarContent className="pt-4">
        <div className="px-4 space-y-4">
          <Button
            variant="outline"
            className="mb-4 flex w-full items-center gap-2"
          >
            <PlusIcon className="size-4" />
            <span>New Chat</span>
          </Button>
          
          {/* Upload Section */}
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground px-2">DOCUMENTS</div>
            <FileUploadTrigger asChild>
              <Button
                variant="ghost" 
                className="w-full flex items-center gap-2 justify-start text-left"
                onClick={onUploadTrigger}
              >
                <Plus className="size-4" />
                <span>Upload Document</span>
              </Button>
            </FileUploadTrigger>
            
            {/* Upload Status */}
            {uploadMessage && (
              <div className={cn(
                "text-xs p-2 rounded-md",
                uploadStatus === 'error' && "text-destructive bg-destructive/10",
                uploadStatus === 'success' && "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950",
                uploadStatus === 'uploading' && "text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950"
              )}>
                {uploadMessage}
              </div>
            )}
            
            {/* Progress Tracking */}
            {sessionId && activeRuns.length > 0 && (
              <div className="border-t pt-2">
                <ChatUploadProgress 
                  sessionId={sessionId}
                  accessToken={accessToken}
                />
              </div>
            )}
            
            {/* Active Runs Fallback */}
            {activeRuns.length > 0 && !accessToken && (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground px-2">Processing</div>
                {activeRuns.slice(0, 3).map((run) => (
                  <div key={run.runId} className="flex items-center justify-between text-xs px-2 py-1">
                    <span className="font-mono truncate">{run.documentId.split('-')[0]}</span>
                    <div className="flex items-center gap-1 text-blue-500">
                      <div className="size-1 bg-blue-500 rounded-full animate-pulse" />
                      <span>Processing</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  )
}

interface ChatContentProps {
  sessionId: string
  userId: string
  activeRuns: ActiveRun[]
  setActiveRuns: React.Dispatch<React.SetStateAction<ActiveRun[]>>
  isUploading: boolean
  setIsUploading: React.Dispatch<React.SetStateAction<boolean>>
  uploadStatus: 'idle' | 'uploading' | 'success' | 'error'
  setUploadStatus: React.Dispatch<React.SetStateAction<'idle' | 'uploading' | 'success' | 'error'>>
  uploadMessage: string
  setUploadMessage: React.Dispatch<React.SetStateAction<string>>
}

function ChatContent({
  sessionId,
  userId,
  activeRuns,
  setActiveRuns,
  isUploading,
  setIsUploading,
  uploadStatus,
  setUploadStatus,
  uploadMessage,
  setUploadMessage
}: ChatContentProps) {
  const chatContainerRef = useRef<HTMLDivElement>(null)
  
  const { 
    messages, 
    input, 
    handleInputChange, 
    handleSubmit, 
    isLoading 
  } = useChat({
    api: '/api/chat',
  })

  // Upload utility functions
  const supportedTypes = [
    'application/pdf',
    'text/plain',
    'text/markdown',
    'text/csv'
  ]

  const supportedExtensions = ['.pdf', '.txt', '.md', '.csv']

  const isFileSupported = (file: File): boolean => {
    return supportedTypes.includes(file.type) || 
           supportedExtensions.some(ext => file.name.toLowerCase().endsWith(ext))
  }

  const uploadToBlob = async (file: File): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    })

    if (!response.ok) {
      throw new Error('Failed to upload file to storage')
    }

    const result = await response.json()
    return result.url
  }

  const triggerIngestion = async (documentUrl: string, filename: string): Promise<UploadResult> => {
    const response = await fetch('/api/trigger/ingestion', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documentUrl,
        filename,
        userId,
        sessionId,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Failed to start document processing')
    }

    return await response.json()
  }

  const handleFilesAdded = async (files: File[]) => {
    const file = files[0] // Only handle first file for now
    if (!file) return

    if (!isFileSupported(file)) {
      setUploadStatus('error')
      setUploadMessage(`Unsupported file type. Please upload: ${supportedExtensions.join(', ')}`)
      setTimeout(() => {
        setUploadStatus('idle')
        setUploadMessage('')
      }, 5000)
      return
    }

    setIsUploading(true)
    setUploadStatus('uploading')
    setUploadMessage('Uploading document...')

    try {
      // Step 1: Upload to blob storage
      setUploadMessage('Uploading to storage...')
      const documentUrl = await uploadToBlob(file)

      // Step 2: Trigger ingestion pipeline
      setUploadMessage('Starting document processing...')
      const result = await triggerIngestion(documentUrl, file.name)

      if (result.success) {
        setUploadStatus('success')
        setUploadMessage(`Document processing started! Now you can chat about your document.`)
        setActiveRuns(prev => [{
          runId: result.runId!,
          documentId: result.documentId!,
          sessionId: result.sessionId!
        }, ...prev])
        
        // Reset status after delay
        setTimeout(() => {
          setUploadStatus('idle')
          setUploadMessage('')
        }, 3000)
      } else {
        throw new Error(result.error || 'Failed to start processing')
      }
    } catch (error) {
      setUploadStatus('error')
      setUploadMessage(error instanceof Error ? error.message : 'Upload failed')
      setTimeout(() => {
        setUploadStatus('idle')
        setUploadMessage('')
      }, 5000)
    } finally {
      setIsUploading(false)
    }
  }

  const onSubmit = () => {
    if (!input.trim() || isLoading) return
    handleSubmit()
  }

  const handleUploadTrigger = () => {
    // This will be handled by the FileUploadTrigger component
  }

  return (
    <FileUpload 
      onFilesAdded={handleFilesAdded}
      multiple={false}
      accept={supportedExtensions.join(',')}
      disabled={isUploading}
    >
      <FileUploadContent>
        <div className="bg-card border rounded-lg p-8 text-center max-w-md mx-4 shadow-lg">
          <div className="text-4xl mb-4">📄</div>
          <p className="text-lg font-semibold mb-2">Drop your document here</p>
          <p className="text-sm text-muted-foreground mb-4">
            Supports PDF, TXT, MD, and CSV files
          </p>
          <div className="text-xs text-muted-foreground">
            Release to start processing
          </div>
        </div>
      </FileUploadContent>
      
      <main className="flex h-screen flex-col overflow-hidden">
      <header className="bg-background z-10 flex h-16 w-full shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <div className="text-foreground">Document Assistant</div>
      </header>

      <div 
        ref={chatContainerRef} 
        className="relative flex-1 overflow-y-auto"
        data-chat-container="true"
      >
        <ChatContainerRoot className="h-full">
          <ChatContainerContent className="space-y-0 px-5 py-12">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="bg-primary/10 size-16 rounded-full flex items-center justify-center mb-4">
                  <Search className="size-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Welcome to Lupa Playground</h2>
              </div>
            )}
            
            {messages.map((message, index) => {
              const isAssistant = message.role === "assistant"
              const isLastMessage = index === messages.length - 1
              const sources = isAssistant ? extractSourcesFromToolParts(message.toolParts) : []

              return (
                <Message
                  key={message.id}
                  className={cn(
                    "mx-auto flex w-full max-w-3xl flex-col gap-2 px-6",
                    isAssistant ? "items-start" : "items-end"
                  )}
                >
                  {isAssistant ? (
                    <div className="group flex w-full flex-col gap-0">
                      <MessageContent
                        className="text-foreground prose flex-1 rounded-lg bg-transparent p-0"
                        markdown
                        sources={sources}
                      >
                        {message.content}
                      </MessageContent>
                      
                      {/* Render tool parts */}
                      {message.toolParts && message.toolParts.length > 0 && (
                        <div className="mt-2 space-y-2">
                          {message.toolParts.map((toolPart) => (
                            <Tool
                              key={toolPart.toolCallId}
                              toolPart={toolPart}
                              defaultOpen={toolPart.state === 'output-available' || toolPart.state === 'output-error'}
                            />
                          ))}
                        </div>
                      )}
                      
                      <MessageActions
                        className={cn(
                          "-ml-2.5 flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100",
                          isLastMessage && "opacity-100"
                        )}
                      >
                        <MessageAction tooltip="Copy" delayDuration={100}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full"
                            onClick={() => navigator.clipboard.writeText(message.content)}
                          >
                            <Copy className="size-4" />
                          </Button>
                        </MessageAction>
                        <MessageAction tooltip="Upvote" delayDuration={100}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full"
                          >
                            <ThumbsUp className="size-4" />
                          </Button>
                        </MessageAction>
                        <MessageAction tooltip="Downvote" delayDuration={100}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full"
                          >
                            <ThumbsDown className="size-4" />
                          </Button>
                        </MessageAction>
                      </MessageActions>
                    </div>
                  ) : (
                    <div className="group flex flex-col items-end gap-1">
                      <MessageContent className="bg-muted text-primary max-w-[85%] rounded-3xl px-5 py-2.5 sm:max-w-[75%]">
                        {message.content}
                      </MessageContent>
                      <MessageActions
                        className={cn(
                          "flex gap-0 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
                        )}
                      >
                        <MessageAction tooltip="Edit" delayDuration={100}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full"
                          >
                            <Pencil className="size-4" />
                          </Button>
                        </MessageAction>
                        <MessageAction tooltip="Delete" delayDuration={100}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full"
                          >
                            <Trash className="size-4" />
                          </Button>
                        </MessageAction>
                        <MessageAction tooltip="Copy" delayDuration={100}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="rounded-full"
                            onClick={() => navigator.clipboard.writeText(message.content)}
                          >
                            <Copy className="size-4" />
                          </Button>
                        </MessageAction>
                      </MessageActions>
                    </div>
                  )}
                </Message>
              )
            })}
            
            {isLoading && (
              <Message className="mx-auto flex w-full max-w-3xl flex-col gap-2 px-6 items-start">
                <div className="flex items-center gap-2">
                  <div className="size-2 bg-muted-foreground rounded-full animate-pulse"></div>
                  <div className="size-2 bg-muted-foreground rounded-full animate-pulse [animation-delay:0.2s]"></div>
                  <div className="size-2 bg-muted-foreground rounded-full animate-pulse [animation-delay:0.4s]"></div>
                </div>
              </Message>
            )}
          </ChatContainerContent>
          <div className="absolute bottom-4 left-1/2 flex w-full max-w-3xl -translate-x-1/2 justify-end px-5">
            <ScrollButton className="shadow-sm" />
          </div>
        </ChatContainerRoot>
      </div>

      <div className="bg-background z-10 shrink-0 px-3 pb-3 md:px-5 md:pb-5">
        <div className="mx-auto max-w-3xl">
          <PromptInput
            isLoading={isLoading}
            onSubmit={onSubmit}
            className="border-input bg-popover relative z-10 w-full rounded-3xl border p-0 pt-1 shadow-xs"
          >
            <div className="flex flex-col">
              <PromptInputTextarea
                placeholder="Ask about your documents..."
                className="min-h-[44px] pt-3 pl-4 text-base leading-[1.3] sm:text-base md:text-base"
                value={input}
                onValueChange={handleInputChange}
              />

              <PromptInputActions className="mt-5 flex w-full items-center justify-between gap-2 px-3 pb-3">
                <div className="flex items-center gap-2">
                  <PromptInputAction tooltip="Add a new action">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-9 rounded-full"
                    >
                      <Plus size={18} />
                    </Button>
                  </PromptInputAction>

                  <PromptInputAction tooltip="Search documents">
                    <Button variant="outline" className="rounded-full">
                      <Globe size={18} />
                      Search
                    </Button>
                  </PromptInputAction>

                  <PromptInputAction tooltip="More actions">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-9 rounded-full"
                    >
                      <MoreHorizontal size={18} />
                    </Button>
                  </PromptInputAction>
                </div>
                <div className="flex items-center gap-2">
                  <PromptInputAction tooltip="Voice input">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-9 rounded-full"
                    >
                      <Mic size={18} />
                    </Button>
                  </PromptInputAction>

                  <Button
                    size="icon"
                    disabled={!input.trim() || isLoading}
                    onClick={onSubmit}
                    className="size-9 rounded-full"
                  >
                    {!isLoading ? (
                      <ArrowUp size={18} />
                    ) : (
                      <span className="size-3 rounded-xs bg-white animate-pulse" />
                    )}
                  </Button>
                </div>
              </PromptInputActions>
            </div>
          </PromptInput>
        </div>
      </div>
    </main>
    </FileUpload>
  )
}

export function FullChatApp() {
  // Lift state up to share between sidebar and content
  const [sessionId, setSessionId] = useState<string>("")
  const [userId] = useState("test-user-123")
  const [activeRuns, setActiveRuns] = useState<ActiveRun[]>([])
  const [isClient, setIsClient] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle')
  const [uploadMessage, setUploadMessage] = useState<string>('')
  const [accessToken, setAccessToken] = useState<string | null>(null)

  // Generate sessionId after component mounts
  useEffect(() => {
    setSessionId(uuidv4())
    setIsClient(true)
  }, [])

  // Fetch access token for realtime monitoring
  useEffect(() => {
    if (!sessionId) return
    
    let cancelled = false
    
    async function fetchToken() {
      try {
        const res = await fetch(`/api/trigger/token?sessionId=${sessionId}`)
        if (!res.ok) return
        
        const data = await res.json()
        if (!cancelled) setAccessToken(data.token ?? null)
      } catch (error) {
        console.error("Failed to fetch access token:", error)
      }
    }
    
    fetchToken()
    return () => { cancelled = true }
  }, [sessionId])

  const handleUploadTrigger = () => {
    // This will be handled by the FileUploadTrigger component
  }

  return (
    <SidebarProvider>
      <ChatSidebar 
        onUploadTrigger={handleUploadTrigger}
        uploadStatus={uploadStatus}
        uploadMessage={uploadMessage}
        activeRuns={activeRuns}
        sessionId={sessionId}
        accessToken={accessToken}
      />
      <SidebarInset>
        <ChatContent 
          sessionId={sessionId}
          userId={userId}
          activeRuns={activeRuns}
          setActiveRuns={setActiveRuns}
          isUploading={isUploading}
          setIsUploading={setIsUploading}
          uploadStatus={uploadStatus}
          setUploadStatus={setUploadStatus}
          uploadMessage={uploadMessage}
          setUploadMessage={setUploadMessage}
        />
      </SidebarInset>
    </SidebarProvider>
  )
}

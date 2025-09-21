"use client"

import React from "react"
import { useRealtimeRunsWithTag } from "@trigger.dev/react-hooks"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Loader2, 
  FileText 
} from "lucide-react"

interface ChatUploadProgressProps {
  sessionId: string
  accessToken: string | null
}

export function ChatUploadProgress({ sessionId, accessToken }: ChatUploadProgressProps) {
  const { runs, error } = useRealtimeRunsWithTag(`session:${sessionId}`, {
    accessToken: accessToken!,
    enabled: !!accessToken && !!sessionId,
  })

  const latestRun = React.useMemo(() => {
    if (!runs?.length) return null
    
    return runs
      .filter(run => run.tags?.includes(`session:${sessionId}`))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
  }, [runs, sessionId])

  if (!accessToken || !latestRun) {
    return null
  }

  if (error) {
    return (
      <div className="px-2 py-1 text-xs text-red-500">
        <AlertCircle className="inline size-3 mr-1" />
        Connection error
      </div>
    )
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle2 className="size-3 text-green-500" />
      case "FAILED":
        return <AlertCircle className="size-3 text-red-500" />
      case "EXECUTING":
        return <Loader2 className="size-3 text-blue-500 animate-spin" />
      default:
        return <Clock className="size-3 text-yellow-500" />
    }
  }

  const getProgress = (status: string) => {
    switch (status) {
      case "COMPLETED": return 100
      case "FAILED": return 0
      case "EXECUTING": return 50
      case "QUEUED": return 10
      default: return 0
    }
  }

  const progress = getProgress(latestRun.status)

  return (
    <div className="px-2 py-2 space-y-2">
      <div className="flex items-center gap-2 text-xs">
        {getStatusIcon(latestRun.status)}
        <span className="truncate">Document Processing</span>
      </div>
      
      {latestRun.status === "EXECUTING" && (
        <Progress value={progress} className="h-1" />
      )}
      
      <div className="text-xs text-muted-foreground">
        {latestRun.status === "COMPLETED" && "✓ Ready to chat"}
        {latestRun.status === "EXECUTING" && "Processing..."}
        {latestRun.status === "FAILED" && "Processing failed"}
        {latestRun.status === "QUEUED" && "In queue"}
      </div>
    </div>
  )
}

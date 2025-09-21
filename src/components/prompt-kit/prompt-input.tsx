"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface PromptInputProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  isLoading?: boolean
  value?: string
  onValueChange?: (value: string) => void
  onSubmit?: () => void
}

export function PromptInput({ 
  className, 
  children, 
  isLoading = false,
  value = "",
  onValueChange,
  onSubmit,
  ...props 
}: PromptInputProps) {
  const handleKeyDown = React.useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isLoading) {
      e.preventDefault()
      onSubmit?.()
    }
  }, [isLoading, onSubmit])

  return (
    <div
      className={cn("relative", className)}
      onKeyDown={handleKeyDown}
      {...props}
    >
      {children}
    </div>
  )
}

interface PromptInputTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> {
  value?: string
  onValueChange?: (value: string) => void
}

export function PromptInputTextarea({ 
  className, 
  value,
  onValueChange,
  placeholder = "Type a message...",
  ...props 
}: PromptInputTextareaProps) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  React.useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onValueChange?.(e.target.value)
  }

  return (
    <textarea
      ref={textareaRef}
      className={cn(
        "w-full resize-none border-0 bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-0 disabled:opacity-50",
        className
      )}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      rows={1}
      disabled={props.disabled}
      {...props}
    />
  )
}

interface PromptInputActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function PromptInputActions({ className, children, ...props }: PromptInputActionsProps) {
  return (
    <div
      className={cn("flex items-center justify-between", className)}
      {...props}
    >
      {children}
    </div>
  )
}

interface PromptInputActionProps {
  children: React.ReactNode
  tooltip?: string
}

export function PromptInputAction({ 
  children, 
  tooltip 
}: PromptInputActionProps) {
  return (
    <div className="flex items-center">
      {children}
    </div>
  )
}

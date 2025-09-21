"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ChevronDown } from "lucide-react"

interface ScrollButtonProps extends React.HTMLAttributes<HTMLButtonElement> {
  onClick?: () => void
  visible?: boolean
}

export function ScrollButton({ 
  className, 
  onClick,
  visible = true,
  ...props 
}: ScrollButtonProps) {
  const handleScrollToBottom = () => {
    const chatContainer = document.querySelector('[data-chat-container="true"]')
    if (chatContainer) {
      chatContainer.scrollTo({
        top: chatContainer.scrollHeight,
        behavior: 'smooth'
      })
    }
    onClick?.()
  }

  if (!visible) return null

  return (
    <Button
      variant="outline"
      size="icon"
      className={cn(
        "rounded-full size-8 bg-background hover:bg-accent",
        className
      )}
      onClick={handleScrollToBottom}
      {...props}
    >
      <ChevronDown className="size-4" />
    </Button>
  )
}

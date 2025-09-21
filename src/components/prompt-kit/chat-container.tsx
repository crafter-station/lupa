"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface ChatContainerRootProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function ChatContainerRoot({ className, children, ...props }: ChatContainerRootProps) {
  return (
    <div
      className={cn("flex flex-col", className)}
      {...props}
    >
      {children}
    </div>
  )
}

interface ChatContainerContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function ChatContainerContent({ className, children, ...props }: ChatContainerContentProps) {
  return (
    <div
      className={cn("flex flex-col gap-4 p-4", className)}
      {...props}
    >
      {children}
    </div>
  )
}

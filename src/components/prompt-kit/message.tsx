"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import ReactMarkdown from "react-markdown"
import { Source, SourceTrigger, SourceContent } from "@/components/ui/source"
import type { SourceInfo } from "@/lib/sources"

interface MessageProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function Message({ className, children, ...props }: MessageProps) {
  return (
    <div
      className={cn("flex flex-col", className)}
      {...props}
    >
      {children}
    </div>
  )
}

interface MessageContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  markdown?: boolean
  sources?: SourceInfo[]
}

export function MessageContent({ 
  className, 
  children, 
  markdown = false,
  sources = [],
  ...props 
}: MessageContentProps) {
  const content = typeof children === 'string' ? children : ''
  
  if (markdown && typeof children === 'string') {
    // Process content to add sources at the end if needed
    let processedContent = content
    if (sources.length > 0 && !content.includes('**Sources:**')) {
      processedContent = `${content}\n\n---\n\n**Sources:** ${sources.map((_, i) => `[${i + 1}]`).join(' ')}`
    }

    return (
      <div
        className={cn("prose prose-sm max-w-none dark:prose-invert", className)}
        {...props}
      >
        <ReactMarkdown
          components={{
            code: ({ node, className: codeClassName, children, ...codeProps }: any) => {
              const inline = !codeProps['data-language']
              return inline ? (
                <code
                  className={cn("bg-muted px-1.5 py-0.5 rounded text-sm font-mono", codeClassName)}
                  {...codeProps}
                >
                  {children}
                </code>
              ) : (
                <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                  <code className={cn("font-mono text-sm", codeClassName)} {...codeProps}>
                    {children}
                  </code>
                </pre>
              )
            },
            // Custom renderer for source links like [1], [2], etc.
            a: ({ href, children, ...props }) => {
              const childText = React.Children.toArray(children).join('')
              const sourceMatch = childText.match(/^\[(\d+)\]$/)
              
              if (sourceMatch) {
                const sourceIndex = parseInt(sourceMatch[1]) - 1
                const source = sources[sourceIndex]
                
                if (source) {
                  return (
                    <Source href={source.href} key={source.id}>
                      <SourceTrigger label={sourceMatch[1]} />
                      <SourceContent
                        title={source.title}
                        description={source.description}
                      />
                    </Source>
                  )
                }
              }
              
              // Default link rendering
              return (
                <a href={href} {...props} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                  {children}
                </a>
              )
            },
            // Convert text nodes with [1], [2] patterns to source links
            text: ({ children }) => {
              if (typeof children !== 'string' || sources.length === 0) {
                return <>{children}</>
              }
              
              const parts = children.split(/(\[\d+\])/)
              return (
                <>
                  {parts.map((part, index) => {
                    const sourceMatch = part.match(/^\[(\d+)\]$/)
                    if (sourceMatch) {
                      const sourceIndex = parseInt(sourceMatch[1]) - 1
                      const source = sources[sourceIndex]
                      
                      if (source) {
                        return (
                          <Source href={source.href} key={`${source.id}-${index}`}>
                            <SourceTrigger label={sourceMatch[1]} />
                            <SourceContent
                              title={source.title}
                              description={source.description}
                            />
                          </Source>
                        )
                      }
                    }
                    return part
                  })}
                </>
              )
            },
          }}
        >
          {processedContent}
        </ReactMarkdown>
      </div>
    )
  }

  return (
    <div
      className={cn("text-sm", className)}
      {...props}
    >
      {children}
    </div>
  )
}

interface MessageActionsProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function MessageActions({ className, children, ...props }: MessageActionsProps) {
  return (
    <div
      className={cn("flex items-center gap-1 mt-2", className)}
      {...props}
    >
      {children}
    </div>
  )
}

interface MessageActionProps {
  children: React.ReactNode
  tooltip?: string
  delayDuration?: number
}

export function MessageAction({ 
  children, 
  tooltip,
  delayDuration = 700,
}: MessageActionProps) {
  return (
    <div className="flex items-center">
      {children}
    </div>
  )
}

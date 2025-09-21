import type { ToolPart } from "@/components/ui/tool"

export type SourceInfo = {
  id: string
  href: string
  title: string
  description: string
  score?: number
}

export function extractSourcesFromToolParts(toolParts?: ToolPart[]): SourceInfo[] {
  if (!toolParts || toolParts.length === 0) return []

  const sources: SourceInfo[] = []

  for (const toolPart of toolParts) {
    if (toolPart.type === 'vectorSearch' && toolPart.state === 'output-available' && toolPart.output) {
      try {
        const output = toolPart.output
        if (output?.results && Array.isArray(output.results)) {
          for (let i = 0; i < output.results.length; i++) {
            const result = output.results[i]
            if (result.content && result.metadata) {
              const filename = result.metadata.filename || `Document ${i + 1}`
              const documentId = result.metadata.documentId || result.id
              
              // Generate a more meaningful href for documents
              const baseHref = result.metadata.documentId 
                ? `/documents/${result.metadata.documentId}` 
                : `#search-result-${result.id}`

              sources.push({
                id: `${toolPart.toolCallId}-${i}`,
                href: baseHref,
                title: String(filename).replace(/\.(pdf|txt|docx|md)$/i, ''),
                description: String(result.content).slice(0, 200) + (result.content.length > 200 ? '...' : ''),
                score: result.score
              })
            }
          }
        }
      } catch (error) {
        console.warn('Failed to extract sources from tool part:', error)
      }
    }
  }

  // Remove duplicates based on href
  const uniqueSources = sources.filter((source, index, array) => 
    array.findIndex(s => s.href === source.href) === index
  )

  return uniqueSources
}

// Format sources for display at the end of a message
export function formatSourcesDisplay(sources: SourceInfo[]): string {
  if (sources.length === 0) return ''
  
  return `\n\n---\n\n**Sources:** ${sources.map((source, i) => `[${i + 1}]`).join(' ')}`
}

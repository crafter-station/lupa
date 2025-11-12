"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { useMarkdown } from "@/hooks/use-markdown";
import type { ContentProps } from "./props";

export function SnapshotDetailsContent({
  document,
  latestSnapshot,
}: ContentProps) {
  const {
    data: markdown,
    isLoading: loading,
    isError,
  } = useMarkdown(latestSnapshot?.markdown_url);

  if (!document) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
        <p className="text-sm">Select a document to view snapshot</p>
      </div>
    );
  }

  if (!latestSnapshot) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
        <p className="text-sm">No snapshot available for this document</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3 flex flex-col h-full">
      <div className="shrink-0">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Badge>{latestSnapshot.status}</Badge>
          <Badge variant="secondary">{latestSnapshot.type}</Badge>
          {latestSnapshot.type === "website" && latestSnapshot.url && (
            <>
              <span>•</span>
              <a
                href={latestSnapshot.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-600 hover:underline dark:text-blue-400"
              >
                {latestSnapshot.url}
              </a>
            </>
          )}
          <span>•</span>
          <span className="text-xs">
            {new Date(latestSnapshot.created_at).toLocaleString()}
          </span>
          {latestSnapshot.chunks_count && (
            <>
              <span>•</span>
              <span className="text-xs">
                {latestSnapshot.chunks_count} chunks
              </span>
            </>
          )}
          {latestSnapshot.tokens_count && (
            <>
              <span>•</span>
              <span className="text-xs">
                {latestSnapshot.tokens_count} tokens
              </span>
            </>
          )}
        </div>
      </div>

      <Tabs defaultValue="raw" className="flex-1 flex flex-col min-h-0">
        <TabsList className="shrink-0">
          <TabsTrigger value="raw">Raw Markdown</TabsTrigger>
          <TabsTrigger value="rendered">Rendered</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
        </TabsList>
        <TabsContent
          value="raw"
          className="flex-1 mt-3 min-h-0 overflow-auto h-full max-h-[500px] max-w-[900px]"
        >
          <div className="border rounded-lg bg-muted/50">
            <div className="p-4">
              {loading && (
                <p className="text-sm text-muted-foreground">
                  Loading content...
                </p>
              )}
              {!loading && markdown && (
                <pre className="text-sm whitespace-pre-wrap font-mono overflow-x-auto">
                  {markdown}
                </pre>
              )}
              {!loading && !markdown && !isError && (
                <p className="text-sm text-muted-foreground">
                  No content available
                </p>
              )}
              {isError && (
                <p className="text-sm text-red-600">Failed to load content</p>
              )}
            </div>
          </div>
        </TabsContent>
        <TabsContent
          value="rendered"
          className="flex-1 mt-3 min-h-0 overflow-auto h-full max-h-[500px] max-w-[900px]"
        >
          <div className="border rounded-lg bg-muted/50">
            <div className="p-4 prose prose-sm max-w-none dark:prose-invert">
              {loading && (
                <p className="text-sm text-muted-foreground">
                  Loading content...
                </p>
              )}
              {!loading && markdown && (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {markdown}
                </ReactMarkdown>
              )}
              {!loading && !markdown && !isError && (
                <p className="text-sm text-muted-foreground">
                  No content available
                </p>
              )}
              {isError && (
                <p className="text-sm text-red-600">Failed to load content</p>
              )}
            </div>
          </div>
        </TabsContent>
        <TabsContent
          value="metadata"
          className="flex-1 mt-3 min-h-0 overflow-auto h-full max-h-[500px] max-w-[900px]"
        >
          <div className="border rounded-lg bg-muted/50">
            <div className="p-4">
              <pre className="text-xs whitespace-pre font-mono overflow-x-auto">
                {JSON.stringify(latestSnapshot.metadata, null, 2)}
              </pre>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

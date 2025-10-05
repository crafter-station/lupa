"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SourceSnapshotSelect } from "@/db";

export function SnapshotViewer({
  snapshot,
}: {
  snapshot: SourceSnapshotSelect | null;
}) {
  const {
    data: markdown,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["snapshot-markdown", snapshot?.markdown_url],
    queryFn: async () => {
      if (!snapshot?.markdown_url) return null;
      const response = await fetch(snapshot.markdown_url);
      if (!response.ok) {
        throw new Error(`Failed to fetch markdown: ${response.statusText}`);
      }
      return response.text();
    },
    enabled: !!snapshot?.markdown_url,
  });

  if (!snapshot) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        Select a snapshot to view its content
      </div>
    );
  }

  if (snapshot.status !== "success" || !snapshot.markdown_url) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Snapshot Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div>
              <span className="font-medium">URL:</span>{" "}
              <span className="text-sm">{snapshot.url}</span>
            </div>
            <div>
              <span className="font-medium">Status:</span>{" "}
              <span className="text-sm capitalize">{snapshot.status}</span>
            </div>
            <div>
              <span className="font-medium">Type:</span>{" "}
              <span className="text-sm capitalize">{snapshot.type}</span>
            </div>
            <div>
              <span className="font-medium">Created:</span>{" "}
              <span className="text-sm">
                {new Date(snapshot.created_at).toLocaleString()}
              </span>
            </div>
            {snapshot.status !== "success" && (
              <div className="mt-4 p-3 bg-muted rounded-md text-sm">
                Markdown content is only available for successful snapshots.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <Card className="mb-4">
        <CardHeader>
          <CardTitle className="text-base">Snapshot Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium">URL:</span>{" "}
              <a
                href={snapshot.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                {snapshot.url}
              </a>
            </div>
            {snapshot.chunks_count && (
              <div>
                <span className="font-medium">Chunks:</span>{" "}
                {snapshot.chunks_count}
              </div>
            )}
            {snapshot.metadata &&
              snapshot.type === "website" &&
              (snapshot.metadata as { title?: string }).title && (
                <div>
                  <span className="font-medium">Title:</span>{" "}
                  {(snapshot.metadata as { title?: string }).title}
                </div>
              )}
          </div>
        </CardContent>
      </Card>

      <Card className="flex-1 overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base">Markdown Content</CardTitle>
        </CardHeader>
        <CardContent className="h-full overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="text-sm text-muted-foreground">
                Loading markdown...
              </div>
            </div>
          )}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
              {error instanceof Error
                ? error.message
                : "Failed to load markdown"}
            </div>
          )}
          {markdown && !isLoading && (
            <pre className="whitespace-pre-wrap text-sm font-mono">
              {markdown}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";

interface SearchResult {
  id: string;
  score: number;
  metadata: {
    snapshotId: string;
    documentId: string;
    chunkIndex: number;
    chunkSize: number;
    createdAt: string;
  };
  data: string;
}

interface SearchResponse {
  query: string;
  results: SearchResult[];
}

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

  React.useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

async function searchDeployment(
  query: string,
  projectId: string,
  deploymentId: string,
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const response = await fetch(
    `/api/search?projectId=${projectId}&deploymentId=${deploymentId}&query=${query}`,
    {
      signal,
    },
  );

  if (!response.ok) {
    throw new Error("Search failed");
  }

  return response.json();
}

export function SearchPlayground() {
  const { projectId, deploymentId } = useParams<{
    projectId: string;
    deploymentId: string;
  }>();
  const [query, setQuery] = React.useState("");
  const debouncedQuery = useDebouncedValue(query, 300);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["search", deploymentId, debouncedQuery],
    queryFn: ({ signal }) =>
      searchDeployment(debouncedQuery, projectId, deploymentId, signal),
    enabled: debouncedQuery.trim().length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  return (
    <Card className="flex flex-col h-[calc(100vh-16rem)]">
      <CardHeader>
        <CardTitle>Search Playground</CardTitle>
        <CardDescription>
          Test your deployment search functionality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 flex-1 flex flex-col min-h-0">
        <Input
          type="text"
          placeholder="Search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full"
        />

        {isLoading && (
          <div className="text-sm text-muted-foreground">Searching...</div>
        )}

        {isError && (
          <div className="text-sm text-red-600">
            Error: {error instanceof Error ? error.message : "Search failed"}
          </div>
        )}

        {data && (
          <div className="space-y-4 flex-1 flex flex-col min-h-0">
            <div className="text-sm text-muted-foreground">
              Found {data.results.length} results for "{data.query}"
            </div>

            {data.results.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                No results found
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto flex-1">
                {data.results.map((result) => (
                  <div
                    key={result.id}
                    className="rounded-lg border bg-card p-4 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-muted-foreground">
                        {result.id}
                      </span>
                      <span className="text-xs font-medium">
                        Score: {result.score.toFixed(4)}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                      <div>
                        <span className="font-medium">Snapshot:</span>{" "}
                        {result.metadata.snapshotId}
                      </div>
                      <div>
                        <span className="font-medium">Document:</span>{" "}
                        {result.metadata.documentId}
                      </div>
                      <div>
                        <span className="font-medium">Chunk:</span>{" "}
                        {result.metadata.chunkIndex}
                      </div>
                      <div>
                        <span className="font-medium">Size:</span>{" "}
                        {result.metadata.chunkSize}
                      </div>
                    </div>

                    <div className="text-sm border-t pt-2 max-h-32 overflow-y-auto">
                      <pre className="whitespace-pre-wrap break-words font-sans">
                        {result.data}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

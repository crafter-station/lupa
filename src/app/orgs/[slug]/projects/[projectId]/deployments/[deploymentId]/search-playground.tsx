"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Filter, X } from "lucide-react";
import { useParams } from "next/navigation";
import React, { useState } from "react";
import { FilePicker } from "@/components/elements/file-picker";
import { MetadataFilterInput } from "@/components/elements/metadata-filter-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { MetadataFilter, SearchResponse } from "@/lib/types/search";

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
  _documentIds?: string[],
  _metadataFilters?: MetadataFilter[],
  signal?: AbortSignal,
): Promise<SearchResponse> {
  const response = await fetch(`/api/search/`, {
    method: "POST",
    body: JSON.stringify({ query, projectId, deploymentId }),
    signal,
  });

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
  const [selectedDocumentIds, setSelectedDocumentIds] = useState<string[]>([]);
  const [metadataFilters, setMetadataFilters] = useState<MetadataFilter[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debouncedQuery = useDebouncedValue(query, 300);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [
      "search",
      deploymentId,
      debouncedQuery,
      selectedDocumentIds,
      metadataFilters,
    ],
    queryFn: ({ signal }) =>
      searchDeployment(
        debouncedQuery,
        projectId,
        deploymentId,
        selectedDocumentIds,
        metadataFilters,
        signal,
      ),
    enabled: debouncedQuery.trim().length > 0,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });

  const totalFilters = selectedDocumentIds.length + metadataFilters.length;

  const handleClearFilters = () => {
    setSelectedDocumentIds([]);
    setMetadataFilters([]);
  };

  return (
    <Card className="flex flex-col h-[calc(100vh-16rem)]">
      <CardContent className="space-y-3 flex-1 flex flex-col min-h-0 p-4">
        <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
          <div className="flex items-center justify-between mb-2">
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 h-8">
                <Filter className="h-3.5 w-3.5" />
                Filters
                {totalFilters > 0 && (
                  <Badge variant="secondary" className="h-5 px-1.5">
                    {totalFilters}
                  </Badge>
                )}
                {filtersOpen ? (
                  <ChevronUp className="h-3.5 w-3.5" />
                ) : (
                  <ChevronDown className="h-3.5 w-3.5" />
                )}
              </Button>
            </CollapsibleTrigger>
            {totalFilters > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="gap-1 h-8"
              >
                <X className="h-3.5 w-3.5" />
                Clear All
              </Button>
            )}
          </div>

          <CollapsibleContent className="space-y-3">
            <div className="rounded-lg border bg-muted/30 p-3 space-y-3 max-h-[400px] overflow-y-auto">
              <FilePicker
                projectId={projectId}
                deploymentId={deploymentId}
                selectedDocumentIds={selectedDocumentIds}
                onSelectionChange={setSelectedDocumentIds}
              />

              <Separator />

              <MetadataFilterInput
                filters={metadataFilters}
                onFiltersChange={setMetadataFilters}
              />
            </div>
          </CollapsibleContent>
        </Collapsible>

        {totalFilters > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedDocumentIds.map((docId) => (
              <Badge
                key={docId}
                variant="secondary"
                className="gap-1.5 text-xs h-6"
              >
                File: {docId.slice(0, 8)}...
                <button
                  type="button"
                  onClick={() =>
                    setSelectedDocumentIds((ids) =>
                      ids.filter((id) => id !== docId),
                    )
                  }
                  className="ml-0.5 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            {metadataFilters.map((filter, idx) => (
              <Badge
                key={`${filter.key}-${filter.operator}-${idx}`}
                variant="secondary"
                className="gap-1.5 text-xs h-6"
              >
                {filter.key} {filter.operator} {String(filter.value)}
                <button
                  type="button"
                  onClick={() =>
                    setMetadataFilters((filters) =>
                      filters.filter((_, i) => i !== idx),
                    )
                  }
                  className="ml-0.5 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}

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
          <div className="text-sm text-destructive">
            Error: {error instanceof Error ? error.message : "Search failed"}
          </div>
        )}

        {data && (
          <div className="space-y-3 flex-1 flex flex-col min-h-0">
            <div className="text-sm text-muted-foreground">
              Found {data.results.length} results for "{data.query}"
            </div>

            {data.results.length === 0 ? (
              <div className="text-sm text-muted-foreground text-center py-8">
                No results found
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="space-y-2.5 pr-4">
                  {data.results.map((result) => (
                    <div
                      key={result.id}
                      className="rounded-lg border bg-card p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-muted-foreground truncate">
                          {result.id}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {result.score.toFixed(4)}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                        {(result.metadata.fileName ||
                          result.metadata.documentName) && (
                          <div className="col-span-2 truncate">
                            <span className="font-medium">File:</span>{" "}
                            {result.metadata.fileName ||
                              result.metadata.documentName}
                          </div>
                        )}
                        {result.metadata.documentPath && (
                          <div className="col-span-2 truncate">
                            <span className="font-medium">Path:</span>{" "}
                            {result.metadata.documentPath}
                          </div>
                        )}
                        <div className="truncate">
                          <span className="font-medium">Chunk:</span>{" "}
                          {result.metadata.chunkIndex}
                        </div>
                        {result.metadata.chunkSize && (
                          <div>
                            <span className="font-medium">Size:</span>{" "}
                            {result.metadata.chunkSize}
                          </div>
                        )}
                      </div>

                      <Separator />

                      <ScrollArea className="max-h-32">
                        <pre className="text-sm whitespace-pre-wrap wrap-break-word font-sans">
                          {result.data}
                        </pre>
                      </ScrollArea>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

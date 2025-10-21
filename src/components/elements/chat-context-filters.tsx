"use client";

import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Filter, X } from "lucide-react";
import { useMemo, useState } from "react";
import { FilePicker } from "@/components/elements/file-picker";
import { MetadataFilterInput } from "@/components/elements/metadata-filter-input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { FileListItem, MetadataFilter } from "@/lib/types/search";

interface ChatContextFiltersProps {
  projectId: string;
  deploymentId: string;
  selectedDocumentIds: string[];
  onDocumentIdsChange: (documentIds: string[]) => void;
  metadataFilters: MetadataFilter[];
  onMetadataFiltersChange: (filters: MetadataFilter[]) => void;
}

async function fetchFiles(
  projectId: string,
  deploymentId: string,
): Promise<FileListItem[]> {
  const response = await fetch(`/api/files/${projectId}/${deploymentId}`);

  if (!response.ok) {
    throw new Error("Failed to fetch files");
  }

  const data = await response.json();
  return data.files;
}

function getFileName(file: FileListItem): string {
  if (file.snapshotType === "upload" && file.metadata) {
    const uploadMetadata = file.metadata as { file_name?: string };
    return uploadMetadata.file_name || file.documentName;
  }
  return file.documentName;
}

export function ChatContextFilters({
  projectId,
  deploymentId,
  selectedDocumentIds,
  onDocumentIdsChange,
  metadataFilters,
  onMetadataFiltersChange,
}: ChatContextFiltersProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: files } = useQuery({
    queryKey: ["files", projectId, deploymentId],
    queryFn: () => fetchFiles(projectId, deploymentId),
    staleTime: 5 * 60 * 1000,
  });

  const availableMetadataKeys = useMemo(() => {
    if (!files || selectedDocumentIds.length === 0) return [];

    const selectedFiles = files.filter((file) =>
      selectedDocumentIds.includes(file.documentId),
    );

    const keysSet = new Set<string>();

    for (const file of selectedFiles) {
      if (file.metadata) {
        Object.keys(file.metadata).forEach((key) => {
          if (
            key !== "file_name" &&
            key !== "file_size" &&
            key !== "documentName"
          ) {
            keysSet.add(key);
          }
        });
      }

      if (file.extractedMetadata) {
        Object.keys(file.extractedMetadata).forEach((key) => {
          if (key !== "documentName") {
            keysSet.add(key);
          }
        });
      }
    }

    return Array.from(keysSet).sort();
  }, [files, selectedDocumentIds]);

  const totalFilters = selectedDocumentIds.length + metadataFilters.length;

  const handleClearFilters = () => {
    onDocumentIdsChange([]);
    onMetadataFiltersChange([]);
  };

  return (
    <div className="px-4 pt-2 pb-3 border-b space-y-2 bg-muted/20">
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 h-8">
              <Filter className="h-3.5 w-3.5" />
              Context Filters
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

        <CollapsibleContent className="space-y-3 pt-3">
          <ScrollArea className="max-h-[400px]">
            <div className="rounded-lg border bg-background p-3 space-y-3 mr-2">
              <FilePicker
                projectId={projectId}
                deploymentId={deploymentId}
                selectedDocumentIds={selectedDocumentIds}
                onSelectionChange={onDocumentIdsChange}
              />

              <Separator />

              <MetadataFilterInput
                filters={metadataFilters}
                onFiltersChange={onMetadataFiltersChange}
                availableKeys={availableMetadataKeys}
              />

              {availableMetadataKeys.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  Available metadata: {availableMetadataKeys.join(", ")}
                </div>
              )}
            </div>
          </ScrollArea>
        </CollapsibleContent>
      </Collapsible>

      {totalFilters > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {selectedDocumentIds.map((docId) => {
            const file = files?.find((f) => f.documentId === docId);
            const fileName = file ? getFileName(file) : docId.slice(0, 8);

            return (
              <Badge
                key={docId}
                variant="secondary"
                className="gap-1.5 text-xs h-6"
              >
                {fileName}
                <button
                  type="button"
                  onClick={() =>
                    onDocumentIdsChange(
                      selectedDocumentIds.filter((id) => id !== docId),
                    )
                  }
                  className="ml-0.5 hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            );
          })}
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
                  onMetadataFiltersChange(
                    metadataFilters.filter((_, i) => i !== idx),
                  )
                }
                className="ml-0.5 hover:text-destructive transition-colors"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

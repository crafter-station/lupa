"use client";

import { useQuery } from "@tanstack/react-query";
import { Check, File, Folder, Search, X } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { FileListItem } from "@/lib/types/search";
import { cn } from "@/lib/utils";

interface FilePickerProps {
  projectId: string;
  deploymentId: string;
  selectedDocumentIds: string[];
  onSelectionChange: (documentIds: string[]) => void;
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

export function FilePicker({
  projectId,
  deploymentId,
  selectedDocumentIds,
  onSelectionChange,
}: FilePickerProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: files,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["files", projectId, deploymentId],
    queryFn: () => fetchFiles(projectId, deploymentId),
    staleTime: 5 * 60 * 1000,
  });

  const filteredFiles = files?.filter((file) => {
    const fileName = getFileName(file);
    return (
      fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      file.documentPath.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const handleToggleFile = (documentId: string) => {
    if (selectedDocumentIds.includes(documentId)) {
      onSelectionChange(selectedDocumentIds.filter((id) => id !== documentId));
    } else {
      onSelectionChange([...selectedDocumentIds, documentId]);
    }
  };

  const handleSelectAll = () => {
    if (filteredFiles) {
      onSelectionChange(filteredFiles.map((file) => file.documentId));
    }
  };

  const handleClearAll = () => {
    onSelectionChange([]);
  };

  if (isLoading) {
    return (
      <div className="text-sm text-muted-foreground p-4 text-center">
        Loading files...
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-sm text-destructive p-4 text-center">
        Failed to load files
      </div>
    );
  }

  if (!files || files.length === 0) {
    return (
      <div className="text-sm text-muted-foreground p-4 text-center">
        No files available in this deployment
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        {selectedDocumentIds.length > 0 && (
          <Badge variant="secondary" className="px-2 py-1">
            {selectedDocumentIds.length}
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">
          {filteredFiles?.length || 0} file(s)
        </span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSelectAll}
            disabled={!filteredFiles || filteredFiles.length === 0}
            className="h-7 text-xs"
          >
            Select All
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearAll}
            disabled={selectedDocumentIds.length === 0}
            className="h-7 text-xs"
          >
            <X className="h-3 w-3 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      <Separator />

      <ScrollArea className="h-[240px] rounded-md border">
        <div className="p-2 space-y-1">
          {filteredFiles?.map((file) => {
            const isSelected = selectedDocumentIds.includes(file.documentId);
            const fileName = getFileName(file);

            return (
              // biome-ignore lint/a11y/noLabelWithoutControl: checkbox is inside label
              <label
                key={file.documentId}
                className={cn(
                  "flex items-start gap-2.5 rounded-md p-2.5 cursor-pointer hover:bg-accent transition-colors w-full",
                  isSelected && "bg-accent",
                )}
              >
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => handleToggleFile(file.documentId)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-1.5">
                    {file.snapshotType === "upload" ? (
                      <File className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <Folder className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    )}
                    <div
                      className="font-medium text-sm truncate"
                      title={fileName}
                    >
                      {fileName}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate" title={file.documentPath}>
                      {file.documentPath}
                    </span>
                    {file.chunksCount > 0 && (
                      <>
                        <span>•</span>
                        <span>{file.chunksCount} chunks</span>
                      </>
                    )}
                  </div>
                  {file.extractedMetadata &&
                    Object.keys(file.extractedMetadata).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(file.extractedMetadata)
                          .slice(0, 3)
                          .map(([key, value]) => (
                            <Badge
                              key={key}
                              variant="outline"
                              className="text-xs py-0 px-1.5 h-5"
                            >
                              {key}: {String(value).slice(0, 20)}
                              {String(value).length > 20 ? "..." : ""}
                            </Badge>
                          ))}
                      </div>
                    )}
                </div>
                {isSelected && (
                  <Check className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                )}
              </label>
            );
          })}
          {filteredFiles?.length === 0 && (
            <div className="text-sm text-muted-foreground text-center py-8">
              No files found
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

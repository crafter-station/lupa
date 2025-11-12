"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef } from "react";
import { useDeploymentId } from "@/hooks/use-deployment-id";
import {
  type FileTreeResponse,
  flattenTree,
  type TreeFile,
} from "@/lib/file-tree-utils";
import { cn } from "@/lib/utils";

interface FileMentionPickerProps {
  projectId: string;
  searchQuery: string;
  onSelect: (filePath: string) => void;
  selectedIndex: number;
  onSelectedIndexChange: (index: number) => void;
  pickerRef?: React.RefObject<HTMLDivElement | null>;
}

async function fetchFileTree(
  projectId: string,
  deploymentId?: string | null,
): Promise<TreeFile[]> {
  const search = new URLSearchParams({
    projectId,
    path: "/",
    depth: "0",
  });

  if (deploymentId) {
    search.append("deploymentId", deploymentId);
  }

  const response = await fetch(`/api/tree?${search}`);

  if (!response.ok) {
    throw new Error("Failed to fetch file tree");
  }

  const data: FileTreeResponse = await response.json();
  return flattenTree(data.tree);
}

export function FileMentionPicker({
  projectId,
  searchQuery,
  onSelect,
  selectedIndex,
  onSelectedIndexChange,
  pickerRef,
}: FileMentionPickerProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const selectedItemRef = useRef<HTMLButtonElement>(null);

  const [deploymentId] = useDeploymentId();

  const { data: files, isLoading } = useQuery({
    queryKey: ["file-tree", projectId, deploymentId],
    queryFn: () => fetchFileTree(projectId, deploymentId),
    staleTime: Number.POSITIVE_INFINITY,
  });

  const filteredFiles = useMemo(() => {
    if (!files) return [];

    const query = searchQuery.toLowerCase();
    const filtered = files.filter((file) => {
      const path = file.path.toLowerCase();
      return path.includes(query);
    });

    return filtered.sort((a, b) => a.path.localeCompare(b.path));
  }, [files, searchQuery]);

  const safeSelectedIndex = Math.min(selectedIndex, filteredFiles.length - 1);

  console.log("🎨 FileMentionPicker render:", {
    isLoading,
    filesCount: files?.length,
    filteredCount: filteredFiles.length,
    searchQuery,
  });

  useEffect(() => {
    if (selectedItemRef.current && scrollContainerRef.current) {
      const container = scrollContainerRef.current;
      const item = selectedItemRef.current;

      const containerRect = container.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();

      if (itemRect.bottom > containerRect.bottom) {
        item.scrollIntoView({ block: "nearest", behavior: "smooth" });
      } else if (itemRect.top < containerRect.top) {
        item.scrollIntoView({ block: "nearest", behavior: "smooth" });
      }
    }
  }, []);

  if (isLoading) {
    return (
      <div
        ref={pickerRef}
        className="w-full rounded-md border bg-popover p-3 text-popover-foreground shadow-md"
      >
        <div className="text-xs text-muted-foreground">Loading files...</div>
      </div>
    );
  }

  if (!files || files.length === 0) {
    return (
      <div
        ref={pickerRef}
        className="w-full rounded-md border bg-popover p-3 text-popover-foreground shadow-md"
      >
        <div className="text-xs text-muted-foreground">No files found</div>
      </div>
    );
  }

  if (filteredFiles.length === 0) {
    return (
      <div
        ref={pickerRef}
        className="w-full rounded-md border bg-popover p-3 text-popover-foreground shadow-md"
      >
        <div className="text-xs text-muted-foreground">
          No files match "{searchQuery}"
        </div>
      </div>
    );
  }

  return (
    <div
      ref={pickerRef}
      className="w-full rounded-md border bg-popover text-popover-foreground shadow-md"
    >
      <div className="p-2 text-xs text-muted-foreground border-b">
        {filteredFiles.length} file{filteredFiles.length !== 1 ? "s" : ""} found
      </div>
      <div ref={scrollContainerRef} className="max-h-64 overflow-y-auto">
        {filteredFiles.map((file, index) => (
          <button
            type="button"
            key={file.path}
            ref={index === safeSelectedIndex ? selectedItemRef : null}
            className={cn(
              "flex items-center justify-between px-3 py-2 text-xs cursor-pointer hover:bg-accent w-full text-left",
              index === safeSelectedIndex && "bg-accent",
            )}
            onClick={() => onSelect(file.path)}
            onMouseEnter={() => onSelectedIndexChange(index)}
          >
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-muted-foreground">📄</span>
              <span className="truncate font-mono">{file.path}</span>
            </div>
            <div className="text-muted-foreground text-[10px] ml-2 shrink-0">
              {file.metadata.tokens_count.toLocaleString()} tokens
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

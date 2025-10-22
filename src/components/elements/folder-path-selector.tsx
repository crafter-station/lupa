"use client";

import { Check, Folder, Plus, Sparkles, X } from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import type { DocumentSelect } from "@/db";
import {
  buildPathFromSegments,
  normalizeFolderPath,
  parseFolderSegments,
  sanitizeSegment,
} from "@/lib/folder-utils";
import { cn } from "@/lib/utils";

interface FolderPathSelectorProps {
  documents: DocumentSelect[];
  initialFolder?: string;
  onChange: (folder: string) => void;
}

function extractFoldersAtLevel(
  documents: DocumentSelect[],
  parentPath: string,
) {
  const normalizedParent = normalizeFolderPath(parentPath);
  const folders = new Set<string>();

  for (const doc of documents) {
    const folderPath = normalizeFolderPath(doc.folder ?? "/");
    if (!folderPath.startsWith(normalizedParent)) {
      continue;
    }

    const relativePath = folderPath.slice(normalizedParent.length);
    if (!relativePath) continue;

    const nextSegment = relativePath.split("/").filter(Boolean)[0];
    if (nextSegment) {
      folders.add(nextSegment);
    }
  }

  return Array.from(folders).sort((a, b) => a.localeCompare(b));
}

export function FolderPathSelector({
  documents,
  initialFolder = "/",
  onChange,
}: FolderPathSelectorProps) {
  const [segments, setSegments] = React.useState<string[]>(() =>
    parseFolderSegments(initialFolder),
  );
  const [openSegmentIndex, setOpenSegmentIndex] = React.useState<number | null>(
    null,
  );
  const [inputValue, setInputValue] = React.useState("");

  React.useEffect(() => {
    setSegments((prev) => {
      const normalizedInitial = normalizeFolderPath(initialFolder);
      const currentFromPrev = buildPathFromSegments(
        prev.filter((segment) => segment !== ""),
      );
      if (currentFromPrev === normalizedInitial) {
        return prev;
      }
      return parseFolderSegments(initialFolder);
    });
  }, [initialFolder]);

  const currentPath = React.useMemo(
    () => buildPathFromSegments(segments.filter((segment) => segment !== "")),
    [segments],
  );

  React.useEffect(() => {
    onChange(currentPath);
  }, [currentPath, onChange]);

  const handleSelectSegment = (index: number, rawValue: string) => {
    const sanitized = sanitizeSegment(rawValue);
    if (!sanitized) {
      setSegments((prev) => prev.filter((_, i) => i !== index));
      setOpenSegmentIndex(null);
      setInputValue("");
      return;
    }

    setSegments((prev) => {
      const next = [...prev];
      next[index] = sanitized;
      return next;
    });
    setOpenSegmentIndex(null);
    setInputValue("");
  };

  const handleRemoveSegment = (index: number) => {
    setSegments((prev) => prev.filter((_, i) => i !== index));
    setOpenSegmentIndex(null);
    setInputValue("");
  };

  const handleAddSegment = () => {
    setSegments((prev) => {
      if (prev.some((segment) => segment === "")) {
        return prev;
      }
      const next = [...prev, ""];
      setOpenSegmentIndex(next.length - 1);
      return next;
    });
    setInputValue("");
  };

  const hasPendingSegment = React.useMemo(
    () => segments.some((segment) => segment === ""),
    [segments],
  );

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Save to folder</Label>
      <div className="flex flex-wrap items-center gap-1 rounded-md border bg-muted/30 p-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 gap-1.5 px-2 text-sm font-normal hover:bg-accent"
            disabled
          >
            <Folder className="size-3.5" />
            Root
          </Button>
        </div>

        {segments.map((segment, index) => {
          const parentSegments = segments.slice(0, index);
          const parentPath = buildPathFromSegments(parentSegments);
          const segmentKey = `${parentPath}-${segment || "pending"}`;
          const availableFolders = extractFoldersAtLevel(documents, parentPath);
          const trimmedInput = inputValue.trim();
          const sanitizedInput = sanitizeSegment(trimmedInput);
          const filteredFolders = availableFolders.filter((folder) =>
            folder.toLowerCase().includes(trimmedInput.toLowerCase()),
          );
          const showCreateOption =
            sanitizedInput.length > 0 &&
            !availableFolders.some(
              (folder) => folder.toLowerCase() === sanitizedInput.toLowerCase(),
            );

          return (
            <React.Fragment key={segmentKey}>
              <span className="text-muted-foreground">/</span>
              <div className="flex items-center gap-1">
                <Popover
                  open={openSegmentIndex === index}
                  onOpenChange={(open) => {
                    setOpenSegmentIndex(open ? index : null);
                    if (!open) setInputValue("");
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-7 gap-1.5 px-2 text-sm font-normal hover:bg-accent",
                        segment === "" && "text-muted-foreground",
                      )}
                    >
                      <Folder className="size-3.5" />
                      {segment || "..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[220px] p-0" align="start">
                    <Command>
                      <CommandInput
                        placeholder="Search or create..."
                        value={openSegmentIndex === index ? inputValue : ""}
                        onValueChange={setInputValue}
                      />
                      <CommandList>
                        <CommandEmpty>No folders found.</CommandEmpty>
                        {filteredFolders.map((folder) => (
                          <CommandItem
                            key={folder}
                            value={folder}
                            onSelect={() => handleSelectSegment(index, folder)}
                          >
                            <Check
                              className={cn(
                                "mr-2 size-4",
                                segment === folder
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />
                            {folder}
                          </CommandItem>
                        ))}
                        {showCreateOption && (
                          <CommandItem
                            key={`create-option-${segmentKey}-${sanitizedInput}`}
                            value={sanitizedInput}
                            onSelect={() =>
                              handleSelectSegment(index, sanitizedInput)
                            }
                          >
                            <Sparkles className="mr-2 size-4 text-muted-foreground" />
                            Create: <strong>{sanitizedInput}</strong>
                          </CommandItem>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                <Button
                  variant="ghost"
                  size="sm"
                  className="size-5 p-0 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => handleRemoveSegment(index)}
                  aria-label="Remove segment"
                >
                  <X className="size-3" />
                </Button>
              </div>
            </React.Fragment>
          );
        })}

        <Button
          variant="ghost"
          size="sm"
          className="size-7 p-0 hover:bg-accent"
          onClick={handleAddSegment}
          disabled={hasPendingSegment}
          aria-label="Add segment"
        >
          <Plus className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}

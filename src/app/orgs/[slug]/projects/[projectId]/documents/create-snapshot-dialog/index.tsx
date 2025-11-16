"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Globe, Loader2, Plus, Upload } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { parseAsBoolean, useQueryState } from "nuqs";
import React from "react";
import { toast } from "sonner";
import { MetadataSchemaEditor } from "@/components/elements/metadata-schema-editor";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { DocumentSelect, RefreshFrequency, SnapshotType } from "@/db";
import { getMimeTypeLabel, isSupportedFileType } from "@/lib/parsers";

export function CreateSnapshotDialog({
  selectedDocument,
}: {
  selectedDocument: DocumentSelect;
}) {
  const { projectId } = useParams<{
    projectId: string;
  }>();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [_newSnapshot, setNewSnapshot] = useQueryState(
    "newSnapshot",
    parseAsBoolean.withDefault(false),
  );
  const [snapshotType, setSnapshotType] =
    React.useState<SnapshotType>("website");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [metadataSchema, setMetadataSchema] = React.useState<Record<
    string,
    unknown
  > | null>(null);
  const [refreshFrequency, setRefreshFrequency] = React.useState<
    RefreshFrequency | "none"
  >("none");
  const [enhance, setEnhance] = React.useState(false);

  const queryClient = useQueryClient();

  const { mutate: createSnapshot, isPending } = useMutation({
    mutationFn: async (data: {
      type: "website" | "upload";
      url?: string;
      file?: File;
      parsing_instructions?: string | null;
      enhance?: boolean;
    }) => {
      let response: Response;

      if (data.type === "website") {
        response = await fetch("/api/snapshots", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...data,
            project_id: projectId,
            document_id: selectedDocument.id,
          }),
        });
      } else {
        const formData = new FormData();

        if (!data.file) {
          throw new Error("File is required");
        }
        if (!selectedDocument) {
          throw new Error("Document ID is required");
        }
        formData.append("file", data.file);
        formData.append("project_id", projectId);
        formData.append("document_id", selectedDocument.id);

        formData.append("type", "upload");

        if (data.enhance) {
          formData.append("enhance", "true");
        }

        if (data.parsing_instructions) {
          formData.append("parsing_instructions", data.parsing_instructions);
        }

        response = await fetch("/api/snapshots", {
          method: "POST",
          body: formData,
        });
      }

      if (!response.ok) {
        throw new Error(`Failed to create snapshot: ${response.statusText}`);
      }

      const json = (await response.json()) as {
        snapshot_id: string;
      };

      return json;
    },
    onSuccess: async (_data) => {
      queryClient.invalidateQueries({ queryKey: ["snapshots"] });

      if (metadataSchema && selectedDocument) {
        try {
          const response = await fetch(
            `/api/documents/${selectedDocument.id}`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                project_id: projectId,
                metadata_schema: metadataSchema,
              }),
            },
          );

          if (!response.ok) {
            throw new Error("Failed to update metadata schema");
          }
        } catch (error) {
          console.error("Failed to update metadata schema:", error);
        }
      }

      setNewSnapshot(true);
      setOpen(false);
      router.refresh();
    },
    onError: (error) => {
      console.error("Snapshot creation error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create snapshot",
      );
    },
  });

  React.useEffect(() => {
    if (open && selectedDocument) {
      setMetadataSchema(null);
      setSnapshotType("website");
      setSelectedFile(null);
      setEnhance(false);
    }
  }, [open, selectedDocument]);

  const handleWebsiteSubmit = React.useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!selectedDocument) return;

      const formData = new FormData(e.target as HTMLFormElement);
      const url = formData.get("url") as string;

      createSnapshot({
        enhance,
        type: "website",
        url,
      });
    },
    [selectedDocument, enhance, createSnapshot],
  );

  const handleFileSubmit = React.useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!selectedDocument || !selectedFile) {
        toast.error("Please select a file");
        return;
      }

      const mimeType = selectedFile.type;
      if (!isSupportedFileType(mimeType)) {
        toast.error(
          `File type not supported: ${mimeType || "unknown"}. Supported types: PDF, DOCX, XLSX, CSV, TXT, and more.`,
        );
        return;
      }

      const formData = new FormData(e.target as HTMLFormElement);
      const parsingInstruction = formData.get("parsing_instruction") as
        | string
        | null;

      createSnapshot({
        type: "upload",
        file: selectedFile,
        parsing_instructions: parsingInstruction || null,
        enhance,
      });
    },
    [selectedDocument, selectedFile, enhance, createSnapshot],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <Plus className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Snapshot</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 border-b pb-3">
          <Button
            type="button"
            variant={snapshotType === "website" ? "default" : "ghost"}
            onClick={() => setSnapshotType("website")}
            className="flex-1"
            disabled={isPending}
          >
            <Globe className="mr-2 h-4 w-4" />
            Website
          </Button>
          <Button
            type="button"
            variant={snapshotType === "upload" ? "default" : "ghost"}
            onClick={() => setSnapshotType("upload")}
            className="flex-1"
            disabled={isPending}
          >
            <FileText className="mr-2 h-4 w-4" />
            File Upload
          </Button>
        </div>

        {snapshotType === "website" ? (
          <form
            onSubmit={handleWebsiteSubmit}
            className="grid grid-cols-1 gap-3"
          >
            <div className="space-y-2">
              <Label htmlFor="url">URL</Label>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com"
                name="url"
                required
                disabled={isPending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="refresh-frequency">
                Automatically refetch this website?
              </Label>
              <Select
                value={refreshFrequency}
                onValueChange={(value) =>
                  setRefreshFrequency(value as RefreshFrequency | "none")
                }
                disabled={isPending}
              >
                <SelectTrigger id="refresh-frequency">
                  <SelectValue placeholder="Select refresh frequency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No automatic refresh</SelectItem>
                  <SelectItem value="daily">Daily (midnight UTC)</SelectItem>
                  <SelectItem value="weekly">
                    Weekly (Sundays at midnight UTC)
                  </SelectItem>
                  <SelectItem value="monthly">
                    Monthly (1st day at midnight UTC)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2 rounded-lg border p-3">
              <Checkbox
                id="enhance"
                checked={enhance}
                onCheckedChange={(checked) => setEnhance(checked === true)}
                disabled={isPending}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="enhance"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Enable AI Enhancement Mode
                </label>
                <p className="text-sm text-muted-foreground">
                  Use AI to enhance document processing and extraction
                </p>
              </div>
            </div>
            <MetadataSchemaEditor
              value={metadataSchema}
              onChange={setMetadataSchema}
              disabled={isPending}
            />
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Snapshot"
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleFileSubmit} className="grid grid-cols-1 gap-3">
            <div className="space-y-2">
              <Label htmlFor="file">File</Label>
              <div className="flex gap-2">
                <Input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.docx,.xlsx,.csv,.txt,.html,.md,.json,.pptx,.doc,.xls"
                  required
                  disabled={isPending}
                />
              </div>
              {selectedFile && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Upload className="h-3 w-3" />
                  <span>
                    {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)}{" "}
                    KB)
                  </span>
                  {selectedFile.type &&
                    isSupportedFileType(selectedFile.type) && (
                      <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                        {getMimeTypeLabel(selectedFile.type)}
                      </span>
                    )}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="parsing_instruction">
                Parsing Instructions (Optional)
              </Label>
              <Textarea
                id="parsing_instruction"
                name="parsing_instruction"
                placeholder="e.g., 'Focus on extracting tables and numerical data'"
                disabled={isPending}
              />
            </div>
            <div className="flex items-center space-x-2 rounded-lg border p-3">
              <Checkbox
                id="enhance"
                checked={enhance}
                onCheckedChange={(checked) => setEnhance(checked === true)}
                disabled={isPending}
              />
              <div className="grid gap-1.5 leading-none">
                <label
                  htmlFor="enhance"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Enable AI Enhancement Mode
                </label>
                <p className="text-sm text-muted-foreground">
                  Use AI to enhance document processing and extraction
                </p>
              </div>
            </div>
            <MetadataSchemaEditor
              value={metadataSchema}
              onChange={setMetadataSchema}
              disabled={isPending}
            />
            <Button type="submit" disabled={isPending || !selectedFile}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading & Parsing...
                </>
              ) : (
                "Upload Snapshot"
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

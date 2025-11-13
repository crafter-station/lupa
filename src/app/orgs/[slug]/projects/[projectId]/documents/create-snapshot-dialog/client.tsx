"use client";

import { useOrganization } from "@clerk/nextjs";
import type { ElectricCollectionUtils } from "@tanstack/electric-db-collection";
import { createOptimisticAction, eq, useLiveQuery } from "@tanstack/react-db";
import { FileText, Globe, Loader2, Plus, Upload } from "lucide-react";
import { useParams } from "next/navigation";
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
import type { RefreshFrequency, SnapshotType } from "@/db";
import { DocumentCollection, SnapshotCollection } from "@/db/collections";
import { getFolderAndDocument } from "@/lib/folder-utils";
import { generateId } from "@/lib/generate-id";
import { getMimeTypeLabel, isSupportedFileType } from "@/lib/parsers";

export function CreateSnapshotDialog() {
  const { projectId, path } = useParams<{
    projectId: string;
    path: string[];
  }>();
  const [open, setOpen] = React.useState(false);
  const [_newSnapshot, setNewSnapshot] = useQueryState(
    "newSnapshot",
    parseAsBoolean.withDefault(false),
  );
  const [snapshotType, setSnapshotType] =
    React.useState<SnapshotType>("website");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [metadataSchema, setMetadataSchema] = React.useState<Record<
    string,
    unknown
  > | null>(null);
  const [refreshFrequency, setRefreshFrequency] = React.useState<
    RefreshFrequency | "none"
  >("none");
  const [enhance, setEnhance] = React.useState(false);

  const { document: documentName } = React.useMemo(
    () => getFolderAndDocument(path),
    [path],
  );

  const { organization } = useOrganization();

  const { data: documents } = useLiveQuery(
    (q) =>
      q
        .from({ document: DocumentCollection })
        .select(({ document }) => ({ ...document }))
        .where(({ document }) => eq(document.name, documentName)),
    [documentName],
  );

  const currentDocument = documents?.[0];

  const { data: snapshots } = useLiveQuery((q) =>
    q
      .from({ snapshot: SnapshotCollection })
      .select(({ snapshot }) => ({ ...snapshot }))
      .where(({ snapshot }) => eq(snapshot.document_id, currentDocument?.id)),
  );

  React.useEffect(() => {
    if (open && currentDocument) {
      setMetadataSchema(currentDocument?.metadata_schema);
      setSnapshotType("website");
      setSelectedFile(null);
      setIsUploading(false);
      setEnhance(false);
    }
  }, [open, currentDocument]);

  const createSnapshot = createOptimisticAction<
    {
      snapshot_id: string;
      description?: string | null;

      enhance?: boolean;
    } & (
      | { type: "website"; url: string }
      | {
          type: "upload";
          file: File;
          parsing_instructions?: string | null;
        }
    )
  >({
    onMutate: (data) => {
      SnapshotCollection.insert({
        id: data.snapshot_id,
        document_id: currentDocument?.id ?? "",
        org_id: organization?.id ?? "",

        status: "queued",
        metadata: null,
        markdown_url: null,

        type: data.type,
        url: data.type === "website" ? data.url : "",

        enhance: data.enhance ?? false,

        chunks_count: null,
        tokens_count: null,
        changes_detected: null,

        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    },
    mutationFn: async (data) => {
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
            document_id: currentDocument?.id,
          }),
        });
      } else {
        const formData = new FormData();

        if (!data.file) {
          throw new Error("File is required");
        }
        if (!currentDocument?.id) {
          throw new Error("Document ID is required");
        }
        formData.append("file", data.file);
        formData.append("project_id", projectId);
        formData.append("snapshot_id", data.snapshot_id);
        formData.append("document_id", currentDocument?.id);

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
        txid?: number;
      };

      if (json.txid) {
        await (SnapshotCollection.utils as ElectricCollectionUtils).awaitTxId(
          json.txid,
        );
      }
    },
  });

  const handleWebsiteSubmit = React.useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!currentDocument?.id) return;

      setIsUploading(true);

      try {
        const formData = new FormData(e.target as HTMLFormElement);
        const snapshotId = generateId();
        const url = formData.get("url") as string;

        createSnapshot({
          snapshot_id: snapshotId,

          enhance,

          type: "website",
          url,
        });

        if (currentDocument) {
          const enabled = refreshFrequency !== "none";
          const frequency = enabled
            ? (refreshFrequency as RefreshFrequency)
            : null;

          DocumentCollection.update(currentDocument.id, (doc) => {
            doc.refresh_frequency = frequency;
            doc.metadata_schema = metadataSchema;
            doc.updated_at = new Date().toISOString();
          });
        }

        setNewSnapshot(true);
        setOpen(false);
      } catch (error) {
        console.error("Snapshot creation error:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to create snapshot",
        );
      } finally {
        setIsUploading(false);
      }
    },
    [
      currentDocument,
      refreshFrequency,
      metadataSchema,
      createSnapshot,
      setNewSnapshot,
      enhance,
    ],
  );

  const handleFileSubmit = React.useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!currentDocument.id || !selectedFile) {
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

      setIsUploading(true);

      try {
        const formData = new FormData(e.target as HTMLFormElement);
        const parsingInstruction = formData.get("parsing_instruction") as
          | string
          | null;

        const snapshotId = generateId();

        const snapshotMetadata: Record<string, unknown> = {
          file_name: selectedFile.name,
          file_size: selectedFile.size,
        };

        if (parsingInstruction?.trim()) {
          snapshotMetadata.parsing_instruction = parsingInstruction.trim();
        }

        createSnapshot({
          snapshot_id: snapshotId,
          type: "upload",
          file: selectedFile,
          parsing_instructions: parsingInstruction || null,
          enhance,
        });

        if (currentDocument) {
          if (currentDocument.refresh_schedule_id) {
            DocumentCollection.update(currentDocument.id, (doc) => {
              doc.refresh_frequency = null;
              doc.refresh_schedule_id = null;
              doc.metadata_schema = metadataSchema;
              doc.updated_at = new Date().toISOString();
            });
          } else if (metadataSchema) {
            DocumentCollection.update(currentDocument.id, (doc) => {
              doc.metadata_schema = metadataSchema;
              doc.updated_at = new Date().toISOString();
            });
          }
        }

        setNewSnapshot(true);
        setOpen(false);
      } catch (error) {
        console.error("Upload error:", error);
        toast.error(
          error instanceof Error ? error.message : "Failed to upload file",
        );
      } finally {
        setIsUploading(false);
      }
    },
    [
      currentDocument,
      selectedFile,
      metadataSchema,
      createSnapshot,
      setNewSnapshot,
      enhance,
    ],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const latestSnapshot = React.useMemo(() => {
    if (!snapshots || snapshots.length === 0) return null;
    return snapshots.toSorted(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    )[0];
  }, [snapshots]);

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
          >
            <Globe className="mr-2 h-4 w-4" />
            Website
          </Button>
          <Button
            type="button"
            variant={snapshotType === "upload" ? "default" : "ghost"}
            onClick={() => setSnapshotType("upload")}
            className="flex-1"
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
                defaultValue={latestSnapshot?.url}
                disabled={isUploading}
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
                disabled={isUploading}
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
                disabled={isUploading}
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
              disabled={isUploading}
            />
            <Button type="submit" disabled={isUploading}>
              {isUploading ? (
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
                  disabled={isUploading}
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
                disabled={isUploading}
              />
            </div>
            <div className="flex items-center space-x-2 rounded-lg border p-3">
              <Checkbox
                id="enhance"
                checked={enhance}
                onCheckedChange={(checked) => setEnhance(checked === true)}
                disabled={isUploading}
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
              disabled={isUploading}
            />
            <Button type="submit" disabled={isUploading || !selectedFile}>
              {isUploading ? (
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

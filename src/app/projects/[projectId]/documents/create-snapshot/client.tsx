"use client";

import { eq, useLiveQuery } from "@tanstack/react-db";
import { FileText, Globe, Loader2, Plus, Upload } from "lucide-react";
import { parseAsBoolean, useQueryState } from "nuqs";
import React from "react";
import { toast } from "sonner";
import { MetadataSchemaEditor } from "@/components/elements/metadata-schema-editor";
import { Button } from "@/components/ui/button";
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
import type {
  MetadataSchemaConfig,
  RefreshFrequency,
  SnapshotType,
} from "@/db";
import { useCollections } from "@/hooks/use-collections";
import { useFolderDocumentVersion } from "@/hooks/use-folder-document-version";
import { generateId } from "@/lib/generate-id";
import { getMimeTypeLabel, isSupportedFileType } from "@/lib/parsers";

export function CreateSnapshot() {
  const [open, setOpen] = React.useState(false);
  const [_newSnapshot, setNewSnapshot] = useQueryState(
    "newSnapshot",
    parseAsBoolean.withDefault(false),
  );
  const [snapshotType, setSnapshotType] =
    React.useState<SnapshotType>("website");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [metadataSchema, setMetadataSchema] =
    React.useState<MetadataSchemaConfig | null>(null);
  const [refreshFrequency, setRefreshFrequency] = React.useState<
    RefreshFrequency | "none"
  >("none");

  const { SnapshotCollection, DocumentCollection } = useCollections();

  const { documentId } = useFolderDocumentVersion();

  const { data: snapshots } = useLiveQuery((q) =>
    q
      .from({ snapshot: SnapshotCollection })
      .select(({ snapshot }) => ({ ...snapshot }))
      .where(({ snapshot }) => eq(snapshot.document_id, documentId)),
  );

  const { data: documents } = useLiveQuery((q) =>
    q
      .from({ document: DocumentCollection })
      .select(({ document }) => ({ ...document }))
      .where(({ document }) => eq(document.id, documentId)),
  );

  const currentDocument = documents?.[0];

  React.useEffect(() => {
    if (open && currentDocument) {
      setRefreshFrequency(
        currentDocument.refresh_enabled && currentDocument.refresh_frequency
          ? currentDocument.refresh_frequency
          : "none",
      );
      setMetadataSchema(currentDocument.metadata_schema);
      setSnapshotType("website");
      setSelectedFile(null);
      setIsUploading(false);
    }
  }, [open, currentDocument]);

  const handleWebsiteSubmit = React.useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!documentId) return;

      const formData = new FormData(e.target as HTMLFormElement);

      SnapshotCollection.insert({
        id: generateId(),
        document_id: documentId,
        markdown_url: null,
        chunks_count: null,
        type: "website",
        status: "queued",
        url: formData.get("url") as string,
        metadata: null,
        extracted_metadata: null,
        changes_detected: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });

      if (currentDocument) {
        const enabled = refreshFrequency !== "none";
        const frequency = enabled
          ? (refreshFrequency as RefreshFrequency)
          : null;

        DocumentCollection.update(currentDocument.id, (doc) => {
          doc.refresh_enabled = enabled;
          doc.refresh_frequency = frequency;
          doc.metadata_schema = metadataSchema;
          doc.updated_at = new Date().toISOString();
        });
      }

      setNewSnapshot(true);
      setOpen(false);
    },
    [
      documentId,
      currentDocument,
      refreshFrequency,
      metadataSchema,
      SnapshotCollection,
      DocumentCollection,
      setNewSnapshot,
    ],
  );

  const handleFileSubmit = React.useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!documentId || !selectedFile) {
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
        const parsingInstruction = formData.get("parsingInstruction") as
          | string
          | null;

        const uploadFormData = new FormData();
        uploadFormData.append("file", selectedFile);

        const uploadResponse = await fetch(
          `${process.env.NEXT_PUBLIC_URL}/api/documents/upload-blob`,
          {
            method: "POST",
            body: uploadFormData,
          },
        );

        if (!uploadResponse.ok) {
          const error = await uploadResponse.json();
          throw new Error(error.error || "Upload failed");
        }

        const { blobUrl } = await uploadResponse.json();

        const snapshotMetadata: Record<string, unknown> = {
          file_name: selectedFile.name,
          file_size: selectedFile.size,
        };

        if (parsingInstruction?.trim()) {
          snapshotMetadata.parsing_instruction = parsingInstruction.trim();
        }

        SnapshotCollection.insert({
          id: generateId(),
          document_id: documentId,
          markdown_url: null,
          chunks_count: null,
          type: "upload",
          status: "queued",
          url: blobUrl,
          metadata: snapshotMetadata,
          extracted_metadata: null,
          changes_detected: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

        if (currentDocument) {
          if (currentDocument.refresh_schedule_id) {
            DocumentCollection.update(currentDocument.id, (doc) => {
              doc.refresh_enabled = false;
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
      documentId,
      currentDocument,
      selectedFile,
      metadataSchema,
      SnapshotCollection,
      DocumentCollection,
      setNewSnapshot,
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
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          New Snapshot
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
            <MetadataSchemaEditor
              value={metadataSchema}
              onChange={setMetadataSchema}
            />
            <Button type="submit">Create Snapshot</Button>
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
              <Label htmlFor="parsingInstruction">
                Parsing Instructions (Optional)
              </Label>
              <Textarea
                id="parsingInstruction"
                name="parsingInstruction"
                placeholder="e.g., 'Focus on extracting tables and numerical data'"
                disabled={isUploading}
              />
            </div>
            <MetadataSchemaEditor
              value={metadataSchema}
              onChange={setMetadataSchema}
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

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
import type {
  MetadataSchemaConfig,
  RefreshFrequency,
  SnapshotSelect,
  SnapshotType,
} from "@/db";
import { useCollections } from "@/hooks/use-collections";
import { useFolderDocumentVersion } from "@/hooks/use-folder-document-version";
import { generateId } from "@/lib/generate-id";
import { getMimeTypeLabel, isSupportedFileType } from "@/lib/parsers";
import { getAPIBaseURL } from "@/lib/utils";

export function CreateSnapshot() {
  const { projectId } = useParams<{ projectId: string }>();
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
  const [enhance, setEnhance] = React.useState(false);

  const { SnapshotCollection, DocumentCollection } = useCollections();

  const { documentId } = useFolderDocumentVersion();
  const { organization } = useOrganization();
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
      setEnhance(false);
    }
  }, [open, currentDocument]);

  const createSnapshot = createOptimisticAction<
    SnapshotSelect & {
      file?: File;
      parsingInstruction?: string;
      enhance?: boolean;
    }
  >({
    onMutate: (snapshot) => {
      SnapshotCollection.insert({
        id: snapshot.id,
        document_id: snapshot.document_id,
        type: snapshot.type,
        status: snapshot.status,
        url: snapshot.url,
        metadata: snapshot.metadata,
        extracted_metadata: snapshot.extracted_metadata,
        markdown_url: snapshot.markdown_url,
        chunks_count: snapshot.chunks_count,
        changes_detected: snapshot.changes_detected,
        created_at: snapshot.created_at,
        updated_at: snapshot.updated_at,
        org_id: organization?.id ?? "",
        enhance: snapshot.enhance ?? false,
      });
    },
    mutationFn: async (snapshot) => {
      const formData = new FormData();

      formData.append("id", snapshot.id);
      formData.append("document_id", snapshot.document_id);
      formData.append("type", snapshot.type);
      formData.append("status", snapshot.status);

      if (snapshot.type === "website" && snapshot.url) {
        formData.append("url", snapshot.url);
      }

      if (snapshot.type === "upload" && snapshot.file) {
        formData.append("file", snapshot.file);
      }

      if (snapshot.metadata) {
        formData.append("metadata", JSON.stringify(snapshot.metadata));
      }

      if (snapshot.parsingInstruction) {
        formData.append("parsing_instruction", snapshot.parsingInstruction);
      }

      if (snapshot.enhance) {
        formData.append("enhance", snapshot.enhance.toString());
      }

      const response = await fetch(`${getAPIBaseURL(projectId)}/snapshots`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Failed to create snapshot: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        success: boolean;
        txid: number;
      };

      await (SnapshotCollection.utils as ElectricCollectionUtils).awaitTxId(
        data.txid,
      );

      return {
        txid: data.txid,
      };
    },
  });

  const handleWebsiteSubmit = React.useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!documentId) return;

      setIsUploading(true);

      try {
        const formData = new FormData(e.target as HTMLFormElement);
        const snapshotId = generateId();
        const url = formData.get("url") as string;

        createSnapshot({
          id: snapshotId,
          document_id: documentId,
          markdown_url: null,
          chunks_count: null,
          type: "website",
          status: "queued",
          url,
          metadata: null,
          extracted_metadata: null,
          changes_detected: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          org_id: organization?.id ?? "",
          enhance,
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
      documentId,
      currentDocument,
      refreshFrequency,
      metadataSchema,
      createSnapshot,
      DocumentCollection,
      setNewSnapshot,
      organization,
      enhance,
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
          id: snapshotId,
          document_id: documentId,
          markdown_url: null,
          chunks_count: null,
          type: "upload",
          status: "queued",
          url: "",
          metadata: snapshotMetadata,
          extracted_metadata: null,
          changes_detected: false,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          file: selectedFile,
          parsingInstruction: parsingInstruction || undefined,
          org_id: organization?.id ?? "",
          enhance,
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
      createSnapshot,
      DocumentCollection,
      setNewSnapshot,
      organization,
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

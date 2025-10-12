"use client";

import type { ElectricCollectionUtils } from "@tanstack/electric-db-collection";
import { createOptimisticAction, eq, useLiveQuery } from "@tanstack/react-db";
import { FileText, Globe, Loader2, Upload } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import React from "react";
import { toast } from "sonner";
import { FolderPathSelector } from "@/components/elements/folder-path-selector";
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
  DocumentSelect,
  MetadataSchemaConfig,
  RefreshFrequency,
  SnapshotSelect,
  SnapshotType,
} from "@/db";
import { useCollections } from "@/hooks/use-collections";
import { useFolderDocumentVersion } from "@/hooks/use-folder-document-version";
import { generateId } from "@/lib/generate-id";
import { getMimeTypeLabel, isSupportedFileType } from "@/lib/parsers";

export function CreateDocument() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [snapshotType, setSnapshotType] =
    React.useState<SnapshotType>("website");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  const { folder: contextFolder } = useFolderDocumentVersion();
  const [selectedFolder, setSelectedFolder] = React.useState<string>(
    contextFolder ?? "/",
  );
  const [metadataSchema, setMetadataSchema] =
    React.useState<MetadataSchemaConfig | null>(null);
  const [refreshFrequency, setRefreshFrequency] = React.useState<
    RefreshFrequency | "none"
  >("none");

  const { DocumentCollection, SnapshotCollection } = useCollections();

  const { data: allDocuments = [] } = useLiveQuery(
    (q) =>
      q
        .from({ document: DocumentCollection })
        .select(({ document }) => ({ ...document }))
        .where(({ document }) => eq(document.project_id, projectId)),
    [],
  );

  React.useEffect(() => {
    if (open) {
      setSelectedFolder(contextFolder ?? "/");
      setMetadataSchema(null);
      setSelectedFile(null);
      setSnapshotType("website");
      setIsUploading(false);
      setRefreshFrequency("none");
    }
  }, [open, contextFolder]);

  const createDocument = createOptimisticAction<
    DocumentSelect & {
      snapshot: SnapshotSelect;
    }
  >({
    onMutate: (document) => {
      DocumentCollection.insert({
        id: document.id,
        project_id: document.project_id,
        folder: document.folder,
        name: document.name,
        description: document.description,
        metadata_schema: document.metadata_schema,
        refresh_enabled: document.refresh_enabled,
        refresh_frequency: document.refresh_frequency,
        refresh_schedule_id: document.refresh_schedule_id,
        created_at: document.created_at,
        updated_at: document.updated_at,
      });
      SnapshotCollection.insert({
        ...document.snapshot,
      });
    },
    mutationFn: async (document) => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/collections/documents`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(document),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to insert document: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        success: boolean;
        txid: number;
      };

      await (DocumentCollection.utils as ElectricCollectionUtils).awaitTxId(
        data.txid,
      );
      await (SnapshotCollection.utils as ElectricCollectionUtils).awaitTxId(
        data.txid,
      );

      return {
        txid: data.txid,
      };
    },
  });

  const handleUrlSubmit = React.useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      const formData = new FormData(e.target as HTMLFormElement);

      const documentId = generateId();
      const snapshotId = generateId();
      const folder = selectedFolder || "/";

      createDocument({
        id: documentId,
        project_id: projectId,
        folder,
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        metadata_schema: metadataSchema,
        refresh_enabled: refreshFrequency !== "none",
        refresh_frequency:
          refreshFrequency !== "none" ? refreshFrequency : null,
        refresh_schedule_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        snapshot: {
          id: snapshotId,
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
        },
      });

      router.push(
        `/projects/${projectId}/documents/${folder}doc:${documentId}?newSnapshot=true`,
      );
      setOpen(false);
    },
    [
      projectId,
      createDocument,
      selectedFolder,
      metadataSchema,
      refreshFrequency,
      router,
    ],
  );

  const createFileDocument = createOptimisticAction<
    DocumentSelect & {
      snapshot: SnapshotSelect;
    }
  >({
    onMutate: (document) => {
      DocumentCollection.insert({
        id: document.id,
        project_id: document.project_id,
        folder: document.folder,
        name: document.name,
        description: document.description,
        metadata_schema: document.metadata_schema,
        refresh_enabled: document.refresh_enabled,
        refresh_frequency: document.refresh_frequency,
        refresh_schedule_id: document.refresh_schedule_id,
        created_at: document.created_at,
        updated_at: document.updated_at,
      });
      SnapshotCollection.insert({
        ...document.snapshot,
      });
    },
    mutationFn: async (document) => {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_URL}/api/documents/upload`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            documentId: document.id,
            snapshotId: document.snapshot.id,
            blobUrl: document.snapshot.url,
            filename:
              (document.snapshot.metadata as { file_name?: string })
                ?.file_name || document.name,
            name: document.name,
            projectId: document.project_id,
            folder: document.folder,
            description: document.description,
            metadataSchema: document.metadata_schema,
          }),
        },
      );

      if (!response.ok) {
        throw new Error(`Failed to create document: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        success: boolean;
        txid: number;
      };

      await (DocumentCollection.utils as ElectricCollectionUtils).awaitTxId(
        data.txid,
      );
      await (SnapshotCollection.utils as ElectricCollectionUtils).awaitTxId(
        data.txid,
      );

      return {
        txid: data.txid,
      };
    },
  });

  const handleFileSubmit = React.useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (!selectedFile) {
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
        const name = (formData.get("name") as string) || selectedFile.name;
        const description = (formData.get("description") as string) || null;
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

        const documentId = generateId();
        const snapshotId = generateId();

        const snapshotMetadata: Record<string, unknown> = {
          file_name: selectedFile.name,
          file_size: selectedFile.size,
        };

        if (parsingInstruction?.trim()) {
          snapshotMetadata.parsing_instruction = parsingInstruction.trim();
        }

        createFileDocument({
          id: documentId,
          project_id: projectId,
          folder: selectedFolder || "/",
          name,
          description,
          metadata_schema: metadataSchema,
          refresh_enabled: false,
          refresh_frequency: null,
          refresh_schedule_id: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          snapshot: {
            id: snapshotId,
            document_id: documentId,
            markdown_url: null,
            chunks_count: null,
            type: "upload",
            status: "queued",
            url: blobUrl,
            metadata: snapshotMetadata,
            changes_detected: false,
            extracted_metadata: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        });

        router.push(
          `/projects/${projectId}/documents/${selectedFolder || "/"}doc:${documentId}?newSnapshot=true`,
        );
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
      selectedFile,
      projectId,
      selectedFolder,
      metadataSchema,
      createFileDocument,
      router,
    ],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = React.useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      if (snapshotType === "website") {
        handleUrlSubmit(e);
      } else {
        await handleFileSubmit(e);
      }
    },
    [snapshotType, handleUrlSubmit, handleFileSubmit],
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Create Document</Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Document</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3">
          <FolderPathSelector
            documents={allDocuments}
            initialFolder={selectedFolder}
            onChange={setSelectedFolder}
          />

          <Input
            id="name"
            type="text"
            placeholder={
              snapshotType === "upload"
                ? "Name (optional, defaults to filename)"
                : "Name"
            }
            name="name"
            required={snapshotType === "website"}
            disabled={isUploading}
          />

          <div className="space-y-2">
            <Label htmlFor="snapshot-type">Snapshot Type</Label>
            <div className="flex gap-2 border-b pb-3">
              <Button
                type="button"
                variant={snapshotType === "website" ? "default" : "ghost"}
                onClick={() => setSnapshotType("website")}
                className="flex-1"
                disabled={isUploading}
              >
                <Globe className="mr-2 h-4 w-4" />
                Website
              </Button>
              <Button
                type="button"
                variant={snapshotType === "upload" ? "default" : "ghost"}
                onClick={() => setSnapshotType("upload")}
                className="flex-1"
                disabled={isUploading}
              >
                <FileText className="mr-2 h-4 w-4" />
                File Upload
              </Button>
            </div>
          </div>

          {snapshotType === "website" ? (
            <>
              <Input
                id="url"
                type="url"
                placeholder="https://example.com"
                name="url"
                required
                disabled={isUploading}
              />
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
            </>
          ) : (
            <>
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
                      {selectedFile.name} (
                      {(selectedFile.size / 1024).toFixed(2)} KB)
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
            </>
          )}

          <Textarea
            id="description"
            placeholder="Document Description (Optional)"
            name="description"
            disabled={isUploading}
          />

          <MetadataSchemaEditor
            value={metadataSchema}
            onChange={setMetadataSchema}
            disabled={isUploading}
          />

          <Button
            type="submit"
            disabled={
              isUploading || (snapshotType === "upload" && !selectedFile)
            }
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {snapshotType === "upload"
                  ? "Uploading & Parsing..."
                  : "Creating..."}
              </>
            ) : (
              "Create Document"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

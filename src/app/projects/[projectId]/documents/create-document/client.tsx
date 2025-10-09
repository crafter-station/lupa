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
import { Textarea } from "@/components/ui/textarea";
import type {
  DocumentSelect,
  MetadataSchemaConfig,
  SnapshotSelect,
} from "@/db";
import { useCollections } from "@/hooks/use-collections";
import { useFolderDocumentVersion } from "@/hooks/use-folder-document-version";
import { generateId } from "@/lib/generate-id";
import { getMimeTypeLabel, isSupportedFileType } from "@/lib/parsers";

type DocumentType = "url" | "file";

export function CreateDocument() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [documentType, setDocumentType] = React.useState<DocumentType>("url");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);

  const { folder: contextFolder } = useFolderDocumentVersion();
  const [selectedFolder, setSelectedFolder] = React.useState<string>(
    contextFolder ?? "/",
  );
  const [metadataSchema, setMetadataSchema] =
    React.useState<MetadataSchemaConfig | null>(null);

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
      setDocumentType("url");
      setIsUploading(false);
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
    [projectId, createDocument, selectedFolder, metadataSchema, router],
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

        // First, upload the file to get the blob URL
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

        // Generate IDs
        const documentId = generateId();
        const snapshotId = generateId();

        // Create document with optimistic update
        await createFileDocument({
          id: documentId,
          project_id: projectId,
          folder: selectedFolder || "/",
          name,
          description,
          metadata_schema: metadataSchema,
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
            metadata: {
              file_name: selectedFile.name,
              file_size: selectedFile.size,
            },
            extracted_metadata: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        });

        toast.success("File uploaded and parsing started");
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
    ],
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
        <Button variant="outline">Create Document</Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Document</DialogTitle>
        </DialogHeader>

        <div className="flex gap-2 border-b pb-3">
          <Button
            type="button"
            variant={documentType === "url" ? "default" : "ghost"}
            onClick={() => setDocumentType("url")}
            className="flex-1"
          >
            <Globe className="mr-2 h-4 w-4" />
            URL
          </Button>
          <Button
            type="button"
            variant={documentType === "file" ? "default" : "ghost"}
            onClick={() => setDocumentType("file")}
            className="flex-1"
          >
            <FileText className="mr-2 h-4 w-4" />
            File Upload
          </Button>
        </div>

        {documentType === "url" ? (
          <form onSubmit={handleUrlSubmit} className="grid grid-cols-1 gap-3">
            <FolderPathSelector
              documents={allDocuments}
              initialFolder={selectedFolder}
              onChange={setSelectedFolder}
            />
            <Input
              id="name"
              type="text"
              placeholder="Name"
              name="name"
              required
            />
            <Input
              id="url"
              type="url"
              placeholder="https://example.com"
              name="url"
              required
            />
            <Textarea
              id="description"
              placeholder="Document Description"
              name="description"
            />
            <MetadataSchemaEditor
              value={metadataSchema}
              onChange={setMetadataSchema}
            />
            <Button type="submit">Create Document</Button>
          </form>
        ) : (
          <form onSubmit={handleFileSubmit} className="grid grid-cols-1 gap-3">
            <FolderPathSelector
              documents={allDocuments}
              initialFolder={selectedFolder}
              onChange={setSelectedFolder}
            />
            <Input
              id="name"
              type="text"
              placeholder="Name (optional, defaults to filename)"
              name="name"
            />
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
            <Textarea
              id="description"
              placeholder="Document Description"
              name="description"
              disabled={isUploading}
            />
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                Advanced Options
              </summary>
              <div className="mt-2 space-y-3">
                <div>
                  <Label htmlFor="parsingInstruction">
                    Parsing Instruction
                  </Label>
                  <Textarea
                    id="parsingInstruction"
                    name="parsingInstruction"
                    placeholder="Optional: Custom instructions for parsing (e.g., 'Focus on extracting tables and numerical data')"
                    className="mt-1"
                    disabled={isUploading}
                  />
                </div>
                <MetadataSchemaEditor
                  value={metadataSchema}
                  onChange={setMetadataSchema}
                />
              </div>
            </details>
            <Button type="submit" disabled={isUploading || !selectedFile}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading & Parsing...
                </>
              ) : (
                "Upload Document"
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

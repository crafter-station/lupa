"use client";

import { useOrganization } from "@clerk/nextjs";
import { createOptimisticAction, eq, useLiveQuery } from "@tanstack/react-db";
import { FileText, Globe, Loader2, Upload } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import React from "react";
import { toast } from "sonner";
import { FolderPathSelector } from "@/components/elements/folder-path-selector";
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

export function CreateDocument() {
  const { projectId, path, slug } = useParams<{
    projectId: string;
    path: string[];
    slug: string;
  }>();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [snapshotType, setSnapshotType] =
    React.useState<SnapshotType>("website");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [enhance, setEnhance] = React.useState(false);
  const [nameValue, setNameValue] = React.useState("");

  const { organization } = useOrganization();

  const { folder: currentFolder } = React.useMemo(
    () => getFolderAndDocument(path),
    [path],
  );

  const [selectedFolder, setSelectedFolder] = React.useState<string>(
    currentFolder ?? "/",
  );
  const [metadataSchema, setMetadataSchema] = React.useState<Record<
    string,
    unknown
  > | null>(null);
  const [refreshFrequency, setRefreshFrequency] = React.useState<
    RefreshFrequency | "none"
  >("none");

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
      setSelectedFolder(currentFolder ?? "/");
      setMetadataSchema(null);
      setSelectedFile(null);
      setSnapshotType("website");
      setIsUploading(false);
      setRefreshFrequency("none");
      setEnhance(false);
      setNameValue("");
    }
  }, [open, currentFolder]);

  const isDuplicate = React.useMemo(() => {
    const trimmedName = nameValue.trim();
    if (!trimmedName) return false;
    return allDocuments.some(
      (doc) => doc.folder === selectedFolder && doc.name === trimmedName,
    );
  }, [allDocuments, selectedFolder, nameValue]);

  const createDocument = createOptimisticAction<
    {
      document_id: string;
      snapshot_id: string;
      folder: string;
      name: string;
      description?: string | null;

      enhance?: boolean;
      metadata_schema?: Record<string, unknown> | null;
    } & (
      | {
          type: "website";
          url: string;
          refresh_frequency?: "daily" | "weekly" | "monthly" | null;
        }
      | {
          type: "upload";
          file: File;
          parsing_instructions?: string | null;
        }
    )
  >({
    onMutate: (data) => {
      DocumentCollection.insert({
        id: data.document_id,
        project_id: projectId,
        org_id: organization?.id ?? "",

        folder: data.folder,
        name: data.name,
        description: data.description ?? null,
        metadata_schema: data.metadata_schema ?? null,
        refresh_frequency:
          data.type === "website" ? (data.refresh_frequency ?? null) : null,
        refresh_schedule_id: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
      SnapshotCollection.insert({
        id: data.snapshot_id,
        document_id: data.document_id,
        org_id: organization?.id ?? "",

        type: data.type,
        url: data.type === "website" ? data.url : "",
        status: "queued",
        markdown_url: "",
        enhance: !!data.enhance,

        changes_detected: null,
        chunks_count: null,
        tokens_count: null,

        metadata: null,

        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    },
    mutationFn: async (data) => {
      let response: Response;

      if (data.type === "website") {
        response = await fetch("/api/documents", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ...data, project_id: projectId }),
        });
      } else {
        const formData = new FormData();

        if (!data.file) {
          throw new Error("No file provided");
        }
        formData.append("file", data.file);

        formData.append("project_id", projectId);

        formData.append("type", "upload");

        formData.append("document_id", data.document_id);
        formData.append("snapshot_id", data.snapshot_id);

        formData.append("folder", data.folder);
        formData.append("name", data.name);
        if (data.description) {
          formData.append("description", data.description);
        }

        if (data.metadata_schema) {
          formData.append(
            "metadata_schema",
            JSON.stringify(data.metadata_schema),
          );
        }
        if (data.enhance) {
          formData.append("enhance", data.enhance.toString());
        }

        if (data.parsing_instructions) {
          formData.append("parsing_instructions", data.parsing_instructions);
        }

        response = await fetch("/api/documents", {
          method: "POST",
          body: formData,
        });
      }

      if (!response.ok) {
        throw new Error(`Failed to insert document: ${response.statusText}`);
      }

      const json = (await response.json()) as {
        document_txid?: number;
        snapshot_txid?: number;
        document_id: string;
        snapshot_id: string;
      };

      if (json.document_txid) {
        await DocumentCollection.utils.awaitTxId(json.document_txid);
      }
      if (json.snapshot_txid) {
        await SnapshotCollection.utils.awaitTxId(json.snapshot_txid);
      }

      return {
        documentId: json.document_id,
        snapshotId: json.snapshot_id,
      };
    },
  });

  const handleUrlSubmit = React.useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      const formData = new FormData(e.target as HTMLFormElement);

      const folder = selectedFolder || "/";

      const document_id = generateId();

      createDocument({
        document_id,
        snapshot_id: generateId(),

        folder,
        name: formData.get("name") as string,
        description: formData.get("description") as string,

        metadata_schema: metadataSchema,
        enhance,

        type: "website",
        url: formData.get("url") as string,
        refresh_frequency:
          refreshFrequency !== "none" ? refreshFrequency : null,
      });

      router.push(
        `/orgs/${slug}/projects/${projectId}/documents/${folder}doc:${document_id}?newSnapshot=true`,
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
      slug,
      enhance,
    ],
  );

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
        const parsingInstruction = formData.get("parsing_instruction") as
          | string
          | null;

        const document_id = generateId();

        createDocument({
          document_id,
          snapshot_id: generateId(),

          folder: selectedFolder || "/",
          name,
          description,

          metadata_schema: metadataSchema,
          enhance,

          type: "upload",
          file: selectedFile,
          parsing_instructions: parsingInstruction,
        });

        router.push(
          `/orgs/${slug}/projects/${projectId}/documents/${selectedFolder || "/"}doc:${document_id}?newSnapshot=true`,
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
      createDocument,
      router,
      slug,
      enhance,
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

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              placeholder={
                snapshotType === "upload"
                  ? "Name (optional, defaults to filename)"
                  : "Name"
              }
              name="name"
              value={nameValue}
              required={snapshotType === "website"}
              disabled={isUploading}
              onChange={(e) => {
                const sanitized = e.target.value
                  .trim()
                  .replace(/\s+/g, "-")
                  .replace(/[^a-zA-Z0-9_-]/g, "");
                setNameValue(sanitized);
              }}
              className={isDuplicate ? "border-destructive" : ""}
            />
            {isDuplicate ? (
              <p className="text-xs text-destructive">
                A document named "{nameValue}" already exists in folder "
                {selectedFolder}"
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Only letters (a-z, A-Z), numbers, hyphens, and underscores
                allowed
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Document Description (Optional)"
              name="description"
              disabled={isUploading}
            />
          </div>

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
              <div className="space-y-2">
                <Label htmlFor="url">URL</Label>
                <Input
                  id="url"
                  type="url"
                  placeholder="https://example.com"
                  name="url"
                  required
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
            </>
          )}

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

          <Button
            type="submit"
            disabled={
              isUploading ||
              (snapshotType === "upload" && !selectedFile) ||
              (snapshotType === "website" && isDuplicate) ||
              (snapshotType === "website" && !nameValue.trim())
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

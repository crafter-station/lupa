"use client";

import { useMutation } from "@tanstack/react-query";
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
import type { DocumentSelect, RefreshFrequency, SnapshotType } from "@/db";
import { getMimeTypeLabel, isSupportedFileType } from "@/lib/parsers";

export function CreateDocumentDialog({
  documents,
  selectedDocument,
}: {
  documents: DocumentSelect[];
  selectedDocument: DocumentSelect | null;
}) {
  const { projectId, slug } = useParams<{
    projectId: string;
    path: string[];
    slug: string;
  }>();
  const router = useRouter();

  const [open, setOpen] = React.useState(false);

  const [snapshotType, setSnapshotType] =
    React.useState<SnapshotType>("website");
  const [selectedFile, setSelectedFile] = React.useState<File | null>(null);
  const [enhance, setEnhance] = React.useState(false);
  const [nameValue, setNameValue] = React.useState("");
  const [selectedFolderState, setSelectedFolderState] = React.useState<string>(
    selectedDocument?.folder ?? "/",
  );
  const [metadataSchema, setMetadataSchema] = React.useState<Record<
    string,
    unknown
  > | null>(null);
  const [refreshFrequency, setRefreshFrequency] = React.useState<
    RefreshFrequency | "none"
  >("none");

  const selectedFolder = selectedFolderState;

  const handleFolderChange = React.useCallback((folder: string) => {
    setSelectedFolderState(folder);
  }, []);

  React.useEffect(() => {
    if (open) {
      setSelectedFolderState(selectedDocument?.folder ?? "/");
      setMetadataSchema(null);
      setSelectedFile(null);
      setSnapshotType("website");
      setRefreshFrequency("none");
      setEnhance(false);
      setNameValue("");
    }
  }, [open, selectedDocument]);

  const isDuplicate = React.useMemo(() => {
    const trimmedName = nameValue.trim();
    if (!trimmedName) return false;
    return documents.some(
      (doc) => doc.folder === selectedFolder && doc.name === trimmedName,
    );
  }, [documents, selectedFolder, nameValue]);

  const { mutate: createDocument, isPending } = useMutation({
    mutationFn: async (
      data: {
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
      ),
    ) => {
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
        document_id: string;
        snapshot_id: string;
      };

      return {
        documentId: json.document_id,
        snapshotId: json.snapshot_id,
        folder: data.folder,
        name: data.name,
      };
    },
    onSuccess: (result) => {
      setOpen(false);
      const newUrl = `/orgs/${slug}/projects/${projectId}/documents/${result.folder}${result.name}.md`;
      router.push(newUrl);
      router.refresh();
    },
    onError: (error) => {
      console.error("Document creation error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to create document",
      );
    },
  });

  const handleUrlSubmit = React.useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();

      const formData = new FormData(e.target as HTMLFormElement);

      const folder = selectedFolder || "/";
      const name = formData.get("name") as string;

      createDocument({
        folder,
        name,
        description: formData.get("description") as string,

        metadata_schema: metadataSchema,
        enhance,

        type: "website",
        url: formData.get("url") as string,
        refresh_frequency:
          refreshFrequency !== "none" ? refreshFrequency : null,
      });
    },
    [createDocument, selectedFolder, metadataSchema, refreshFrequency, enhance],
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

      const formData = new FormData(e.target as HTMLFormElement);
      const name = (formData.get("name") as string) || selectedFile.name;
      const description = (formData.get("description") as string) || null;
      const parsingInstruction = formData.get("parsing_instruction") as
        | string
        | null;

      createDocument({
        folder: selectedFolder || "/",
        name,
        description,

        metadata_schema: metadataSchema,
        enhance,

        type: "upload",
        file: selectedFile,
        parsing_instructions: parsingInstruction,
      });
    },
    [selectedFile, selectedFolder, metadataSchema, createDocument, enhance],
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
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <FileText className="h-4 w-4" />
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Document</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3">
          <FolderPathSelector
            documents={documents}
            initialFolder={selectedFolder}
            onChange={handleFolderChange}
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
              disabled={isPending}
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
              disabled={isPending}
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
                    disabled={isPending}
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
                  disabled={isPending}
                />
              </div>
            </>
          )}

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

          <Button
            type="submit"
            disabled={
              isPending ||
              (snapshotType === "upload" && !selectedFile) ||
              (snapshotType === "website" && isDuplicate) ||
              (snapshotType === "website" && !nameValue.trim())
            }
          >
            {isPending ? (
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

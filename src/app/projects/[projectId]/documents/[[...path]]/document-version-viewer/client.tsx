"use client";

import { eq, useLiveQuery } from "@tanstack/react-db";
import { ChevronLeft, ChevronRight, Maximize2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { parseAsBoolean, useQueryState } from "nuqs";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { InlineEditableField } from "@/components/elements/inline-editable-field";
import { InlineEditableFolder } from "@/components/elements/inline-editable-folder";
import { InlineEditableRefreshSettings } from "@/components/elements/inline-editable-refresh-settings";
import { InlineEditableTextarea } from "@/components/elements/inline-editable-textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DocumentSelect, RefreshFrequency, SnapshotSelect } from "@/db";
import { useCollections } from "@/hooks/use-collections";
import { useFolderDocumentVersion } from "@/hooks/use-folder-document-version";
import { useMarkdown } from "@/hooks/use-markdown";
import { generateId } from "@/lib/generate-id";
import { CreateSnapshot } from "../../create-snapshot";
import type { DocumentVersionViewerLoadingContextProps } from "./index";

export function DocumentVersionViewerLiveQuery({
  documentId,
  preloadedDocument,
  preloadedSnapshots,
}: DocumentVersionViewerLoadingContextProps) {
  const router = useRouter();
  const { projectId } = useParams<{
    projectId: string;
  }>();
  const { DocumentCollection, SnapshotCollection, DeploymentCollection } =
    useCollections();
  const [deploymentId, setDeploymentId] = useQueryState("foo");
  const [toastId, setToastId] = React.useState<string | number | null>(null);
  const [newSnapshot, _setNewSnapshot] = useQueryState(
    "newSnapshot",
    parseAsBoolean.withDefault(false),
  );

  const { data: freshDocumentData, status: documentStatus } = useLiveQuery(
    (q) =>
      q
        .from({ document: DocumentCollection })
        .select(({ document }) => ({ ...document }))
        .where(({ document }) => eq(document.id, documentId)),
  );

  const document = React.useMemo(() => {
    if (documentStatus === "ready" && freshDocumentData.length > 0) {
      return freshDocumentData[0];
    }
    return preloadedDocument;
  }, [documentStatus, freshDocumentData, preloadedDocument]);

  const { data: freshSnapshotsData, status: snapshotsStatus } = useLiveQuery(
    (q) =>
      q
        .from({ snapshot: SnapshotCollection })
        .select(({ snapshot }) => ({ ...snapshot }))
        .where(({ snapshot }) => eq(snapshot.document_id, documentId)),
  );

  const snapshots = React.useMemo(() => {
    const data =
      snapshotsStatus === "ready" ? freshSnapshotsData : preloadedSnapshots;
    return [...data];
  }, [snapshotsStatus, freshSnapshotsData, preloadedSnapshots]);

  const { data: allDocumentsData } = useLiveQuery((q) =>
    q
      .from({ document: DocumentCollection })
      .select(({ document }) => ({ ...document }))
      .where(({ document }) => eq(document.project_id, projectId)),
  );

  const allDocuments = React.useMemo(() => {
    return allDocumentsData || [];
  }, [allDocumentsData]);

  const prevSnapshotsRef = React.useRef(preloadedSnapshots);

  const deploymentsResult = useLiveQuery(
    (q) =>
      q
        .from({ deployment: DeploymentCollection })
        .select(({ deployment }) => ({ ...deployment }))
        .where(({ deployment }) => eq(deployment.id, deploymentId)),
    [deploymentId],
  );

  React.useEffect(() => {
    const { data } = deploymentsResult;
    if (data && data.length > 0 && newSnapshot) {
      const deployment = data[0];

      if (deployment.status === "queued" && !toastId) {
        const id = toast.loading("Preparing deployment...", {
          description: "Setting up your deployment",
          duration: Number.POSITIVE_INFINITY,
        });
        setToastId(id);
      } else if (deployment.status === "building" && toastId) {
        toast.dismiss(toastId);
        toast("Deployment is running", {
          description: "Please wait for it to finish",
          duration: 20000,
          action: {
            label: "Go to Deployment",
            onClick: () =>
              router.push(`/projects/${projectId}/deployments/${deploymentId}`),
          },
        });
        setToastId(null);
      }
    }
  }, [
    newSnapshot,
    deploymentsResult,
    router,
    projectId,
    deploymentId,
    toastId,
  ]);

  React.useEffect(() => {
    if (snapshotsStatus !== "ready") return;

    const prevSnapshots = prevSnapshotsRef.current;
    const currentSnapshots = freshSnapshotsData;

    for (const currentSnapshot of currentSnapshots) {
      const prevSnapshot = prevSnapshots.find(
        (s) => s.id === currentSnapshot.id,
      );

      if (
        prevSnapshot &&
        prevSnapshot.status === "running" &&
        currentSnapshot.status === "success"
      ) {
        const isFirstSnapshot = currentSnapshots.length === 1;
        const shouldDeploy =
          currentSnapshot.changes_detected === true || isFirstSnapshot;

        if (shouldDeploy && document) {
          toast(
            isFirstSnapshot ? "Document is ready" : "Document has changed",
            {
              description: "Do you want to deploy now?",
              duration: 20000,
              action: {
                label: isFirstSnapshot ? "Deploy" : "Redeploy",
                onClick: () => {
                  const deploymentId = generateId();
                  DeploymentCollection.insert({
                    id: deploymentId,
                    project_id: document.project_id,
                    vector_index_id: null,
                    status: "queued",
                    logs: [],
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  });
                  setDeploymentId(deploymentId);
                },
              },
            },
          );
        }
      }
    }

    prevSnapshotsRef.current = currentSnapshots;
  }, [
    snapshotsStatus,
    freshSnapshotsData,
    document,
    DeploymentCollection,
    setDeploymentId,
  ]);

  if (!document) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>Loading document...</p>
      </div>
    );
  }

  return (
    <DocumentVersionViewerContent
      document={document}
      snapshots={snapshots}
      allDocuments={allDocuments}
    />
  );
}

export function DocumentVersionViewerContent({
  document: preloadedDocument,
  snapshots: snapshotsData,
  allDocuments,
}: {
  document: DocumentSelect;
  snapshots: SnapshotSelect[];
  allDocuments: DocumentSelect[];
}) {
  const router = useRouter();
  const { projectId } = useParams<{
    projectId: string;
  }>();
  const { DocumentCollection } = useCollections();

  const { folder, version } = useFolderDocumentVersion();
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const handleUpdateDocument = React.useCallback(
    async (changes: Partial<DocumentSelect>) => {
      try {
        DocumentCollection.update(preloadedDocument.id, (doc) => {
          Object.assign(doc, changes);
          doc.updated_at = new Date().toISOString();
        });
        toast.success("Document updated");
      } catch (error) {
        console.error("Failed to update document:", error);
        toast.error("Failed to update document");
        throw error;
      }
    },
    [DocumentCollection, preloadedDocument.id],
  );

  const handleUpdateName = React.useCallback(
    async (name: string) => {
      await handleUpdateDocument({ name });
    },
    [handleUpdateDocument],
  );

  const handleUpdateDescription = React.useCallback(
    async (description: string | null) => {
      await handleUpdateDocument({ description });
    },
    [handleUpdateDocument],
  );

  const handleUpdateFolder = React.useCallback(
    async (newFolder: string) => {
      await handleUpdateDocument({ folder: newFolder });
      const newUrl = `/projects/${projectId}/documents${newFolder}doc:${preloadedDocument.id}`;
      router.push(newUrl);
    },
    [handleUpdateDocument, router, projectId, preloadedDocument.id],
  );

  const handleUpdateRefreshSettings = React.useCallback(
    async (enabled: boolean, frequency: RefreshFrequency | null) => {
      await handleUpdateDocument({
        refresh_enabled: enabled,
        refresh_frequency: frequency,
      });
    },
    [handleUpdateDocument],
  );

  const snapshots = React.useMemo(() => {
    return [...snapshotsData].sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }, [snapshotsData]);

  const latestVersionIndex = snapshots.length - 1;
  const currentVersionIndex = version
    ? parseInt(version.replace("v", ""), 10)
    : latestVersionIndex;
  const currentSnapshot = snapshots[currentVersionIndex] || null;

  const {
    data: markdown,
    isLoading: loading,
    isError,
  } = useMarkdown(currentSnapshot?.markdown_url);

  const baseUrl = `/projects/${projectId}/documents/${folder}doc:${preloadedDocument.id}`;

  if (!currentSnapshot) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>No versions available for this document</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2 pb-4">
        <div className="space-y-2 sticky top-0 bg-background pb-2 border-b mb-2 z-10">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Name</Label>
              <div className="flex items-center gap-2">
                <InlineEditableField
                  value={preloadedDocument.name}
                  onSave={handleUpdateName}
                  className="text-xl font-semibold"
                  required
                />
              </div>
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">
                Description
              </Label>
              <InlineEditableTextarea
                value={preloadedDocument.description}
                onSave={handleUpdateDescription}
                className="text-sm"
              />
            </div>

            <div>
              <Label className="text-xs text-muted-foreground">Folder</Label>
              <InlineEditableFolder
                value={preloadedDocument.folder}
                onSave={handleUpdateFolder}
                documents={allDocuments}
                className="text-sm"
              />
            </div>

            {currentSnapshot?.type === "website" && (
              <div>
                <Label className="text-xs text-muted-foreground">
                  Refresh Schedule
                </Label>
                <InlineEditableRefreshSettings
                  refreshEnabled={preloadedDocument.refresh_enabled}
                  refreshFrequency={preloadedDocument.refresh_frequency}
                  onSave={handleUpdateRefreshSettings}
                  className="text-sm"
                />
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              Updated: {new Date(preloadedDocument.updated_at).toLocaleString()}
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <CreateSnapshot />
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled={currentVersionIndex <= 0}
                asChild={currentVersionIndex > 0}
              >
                {currentVersionIndex > 0 ? (
                  <Link href={`${baseUrl}/v${currentVersionIndex - 1}`}>
                    <ChevronLeft className="h-4 w-4" />
                  </Link>
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
              </Button>
              <span className="text-sm font-medium px-3">
                v{currentVersionIndex}
              </span>

              {currentVersionIndex === latestVersionIndex ? (
                <Badge variant="outline">L</Badge>
              ) : null}
              <Button
                variant="outline"
                size="icon"
                disabled={currentVersionIndex >= latestVersionIndex}
                asChild={currentVersionIndex < latestVersionIndex}
              >
                {currentVersionIndex < latestVersionIndex ? (
                  <Link
                    href={
                      currentVersionIndex === latestVersionIndex - 1
                        ? baseUrl
                        : `${baseUrl}/v${currentVersionIndex + 1}`
                    }
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1 text-sm text-muted-foreground mb-2">
          <div className="flex items-center gap-2">
            <Badge>{currentSnapshot.status}</Badge>
            <Badge variant="secondary">{currentSnapshot.type}</Badge>
            {currentSnapshot.type === "website" && currentSnapshot.url && (
              <>
                <span>•</span>
                <a
                  href={currentSnapshot.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline dark:text-blue-400"
                >
                  {currentSnapshot.url}
                </a>
              </>
            )}
            <span>•</span>
            <span>{new Date(currentSnapshot.created_at).toLocaleString()}</span>
            {currentSnapshot.chunks_count && (
              <>
                <span>•</span>
                <span>{currentSnapshot.chunks_count} chunks</span>
              </>
            )}
          </div>
        </div>

        <Tabs defaultValue="raw" className="w-full">
          <div className="flex justify-between items-center mb-2">
            <TabsList>
              <TabsTrigger value="raw">Raw Markdown</TabsTrigger>
              <TabsTrigger value="rendered">Rendered</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
            </TabsList>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsFullscreen(true)}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
          <TabsContent value="raw" className="mt-0">
            <div className="border rounded-lg bg-muted/50 max-h-[calc(100vh-28.5rem)] overflow-auto">
              <div className="p-4">
                {loading && (
                  <p className="text-sm text-muted-foreground">
                    Loading content...
                  </p>
                )}
                {!loading && markdown && (
                  <pre className="text-sm whitespace-pre-wrap font-mono overflow-x-auto">
                    {markdown}
                  </pre>
                )}
                {!loading && !markdown && !isError && (
                  <p className="text-sm text-muted-foreground">
                    No content available
                  </p>
                )}
                {isError && (
                  <p className="text-sm text-red-600">Failed to load content</p>
                )}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="rendered" className="mt-0">
            <div className="border rounded-lg bg-muted/50 max-h-[calc(100vh-28.5rem)] overflow-auto">
              <div className="p-4 prose prose-sm max-w-none dark:prose-invert">
                {loading && (
                  <p className="text-sm text-muted-foreground">
                    Loading content...
                  </p>
                )}
                {!loading && markdown && (
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {markdown}
                  </ReactMarkdown>
                )}
                {!loading && !markdown && !isError && (
                  <p className="text-sm text-muted-foreground">
                    No content available
                  </p>
                )}
                {isError && (
                  <p className="text-sm text-red-600">Failed to load content</p>
                )}
              </div>
            </div>
          </TabsContent>
          <TabsContent value="metadata" className="mt-0">
            <div className="border rounded-lg bg-muted/50 max-h-[calc(100vh-28.5rem)] overflow-auto">
              <div className="p-4 space-y-3">
                <div>
                  <h3 className="text-sm font-semibold mb-2">
                    Snapshot Metadata
                  </h3>
                  <pre className="text-xs whitespace-pre font-mono overflow-x-auto">
                    {JSON.stringify(currentSnapshot.metadata, null, 2)}
                  </pre>
                </div>
                {currentSnapshot.extracted_metadata && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2">
                      Extracted Metadata
                    </h3>
                    <pre className="text-xs whitespace-pre font-mono overflow-x-auto">
                      {JSON.stringify(
                        currentSnapshot.extracted_metadata,
                        null,
                        2,
                      )}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={isFullscreen} onOpenChange={setIsFullscreen}>
        <DialogContent className="w-[95vw] !max-w-[95vw] h-[95vh] p-6">
          <DialogTitle>Document Viewer</DialogTitle>
          <Tabs
            defaultValue="raw"
            className="w-full h-full flex flex-col overflow-hidden"
          >
            <TabsList>
              <TabsTrigger value="raw">Raw Markdown</TabsTrigger>
              <TabsTrigger value="rendered">Rendered</TabsTrigger>
              <TabsTrigger value="metadata">Metadata</TabsTrigger>
            </TabsList>
            <TabsContent value="raw" className="mt-4 flex-1 overflow-hidden">
              <div className="border rounded-lg bg-muted/50 h-full overflow-auto">
                <div className="p-4">
                  {loading && (
                    <p className="text-sm text-muted-foreground">
                      Loading content...
                    </p>
                  )}
                  {!loading && markdown && (
                    <pre className="text-sm whitespace-pre-wrap font-mono overflow-x-auto">
                      {markdown}
                    </pre>
                  )}
                  {!loading && !markdown && !isError && (
                    <p className="text-sm text-muted-foreground">
                      No content available
                    </p>
                  )}
                  {isError && (
                    <p className="text-sm text-red-600">
                      Failed to load content
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>
            <TabsContent
              value="rendered"
              className="mt-4 flex-1 overflow-hidden"
            >
              <div className="border rounded-lg bg-muted/50 h-full overflow-auto">
                <div className="p-4 prose prose-sm max-w-none dark:prose-invert">
                  {loading && (
                    <p className="text-sm text-muted-foreground">
                      Loading content...
                    </p>
                  )}
                  {!loading && markdown && (
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {markdown}
                    </ReactMarkdown>
                  )}
                  {!loading && !markdown && !isError && (
                    <p className="text-sm text-muted-foreground">
                      No content available
                    </p>
                  )}
                  {isError && (
                    <p className="text-sm text-red-600">
                      Failed to load content
                    </p>
                  )}
                </div>
              </div>
            </TabsContent>
            <TabsContent
              value="metadata"
              className="mt-4 flex-1 overflow-hidden w-full mx-w-[50%]"
            >
              <div className="border rounded-lg bg-muted/50 h-full overflow-auto">
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="text-sm font-semibold mb-2">
                      Snapshot Metadata
                    </h3>
                    <pre className="text-xs whitespace-break-spaces font-mono overflow-x-auto">
                      {JSON.stringify(currentSnapshot.metadata, null, 2)}
                    </pre>
                  </div>
                  {currentSnapshot.extracted_metadata && (
                    <div>
                      <h3 className="text-sm font-semibold mb-2">
                        Extracted Metadata
                      </h3>
                      <pre className="text-xs whitespace-break-spaces font-mono overflow-x-auto">
                        {JSON.stringify(
                          currentSnapshot.extracted_metadata,
                          null,
                          2,
                        )}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  );
}

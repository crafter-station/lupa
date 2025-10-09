"use client";

import { eq, useLiveQuery } from "@tanstack/react-db";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { parseAsBoolean, useQueryState } from "nuqs";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DocumentSelect, SnapshotSelect } from "@/db";
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
    <DocumentVersionViewerContent document={document} snapshots={snapshots} />
  );
}

export function DocumentVersionViewerContent({
  document: preloadedDocument,
  snapshots: snapshotsData,
}: {
  document: DocumentSelect;
  snapshots: SnapshotSelect[];
}) {
  const { projectId } = useParams<{
    projectId: string;
  }>();

  const { folder, version } = useFolderDocumentVersion();

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
    <div className="space-y-4 pb-8">
      <div className="flex items-center justify-between sticky top-0 bg-background pb-4 border-b mb-4">
        <h2 className="text-xl font-semibold">{preloadedDocument.name}</h2>
        <div className="flex items-center gap-2">
          <CreateSnapshot />
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

      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Badge>{currentSnapshot.status}</Badge>
        <Badge variant="secondary">{currentSnapshot.type}</Badge>
        <span>•</span>
        <span>{new Date(currentSnapshot.created_at).toLocaleString()}</span>
        {currentSnapshot.chunks_count && (
          <>
            <span>•</span>
            <span>{currentSnapshot.chunks_count} chunks</span>
          </>
        )}
      </div>

      <div className="border rounded-lg p-6 prose prose-sm max-w-none dark:prose-invert">
        {loading && (
          <p className="text-sm text-muted-foreground">Loading content...</p>
        )}
        {!loading && markdown && (
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
        )}
        {!loading && !markdown && !isError && (
          <p className="text-sm text-muted-foreground">No content available</p>
        )}
        {isError && (
          <p className="text-sm text-red-600">Failed to load content</p>
        )}
      </div>
    </div>
  );
}

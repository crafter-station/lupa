"use client";

import { eq, useLiveQuery } from "@tanstack/react-db";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DocumentSelect, SnapshotSelect } from "@/db";
import { useCollections } from "@/hooks/use-collections";
import { CreateSnapshot } from "../create-snapshot";

export function DocumentVersionViewer({
  preloadedDocument,
  preloadedSnapshots,
  versionIndex,
}: {
  preloadedDocument: DocumentSelect;
  preloadedSnapshots: SnapshotSelect[];
  versionIndex: number | null;
}) {
  const { projectId, path: rawPath = [] } = useParams<{
    projectId: string;
    path?: string[];
  }>();

  const path = rawPath.map(decodeURIComponent);

  const { SnapshotCollection } = useCollections();

  const { data: freshSnapshotsData, status: snapshotsStatus } = useLiveQuery(
    (q) =>
      q
        .from({ snapshot: SnapshotCollection })
        .select(({ snapshot }) => ({ ...snapshot }))
        .where(({ snapshot }) =>
          eq(snapshot.document_id, preloadedDocument.id),
        ),
  );

  const snapshots = React.useMemo(() => {
    const data =
      snapshotsStatus === "ready" ? freshSnapshotsData : preloadedSnapshots;
    return data.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }, [snapshotsStatus, freshSnapshotsData, preloadedSnapshots]);

  const latestVersionIndex = snapshots.length - 1;
  const currentVersionIndex = versionIndex ?? latestVersionIndex;
  const currentSnapshot = snapshots[currentVersionIndex] || null;

  const [markdown, setMarkdown] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!currentSnapshot?.markdown_url) {
      setMarkdown(null);
      return;
    }

    setLoading(true);
    fetch(currentSnapshot.markdown_url)
      .then((res) => res.text())
      .then((text) => {
        setMarkdown(text);
        setLoading(false);
      })
      .catch(() => {
        setMarkdown(null);
        setLoading(false);
      });
  }, [currentSnapshot?.markdown_url]);

  const folderPath = Array.isArray(path)
    ? path.filter((p) => !p.startsWith("doc:") && !p.startsWith("v")).join("/")
    : "";
  const basePath = folderPath ? `${folderPath}/` : "";
  const baseUrl = `/projects/${projectId}/documents/${basePath}doc:${preloadedDocument.id}`;

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
          <CreateSnapshot documentId={preloadedDocument.id} />
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
        {!loading && !markdown && (
          <p className="text-sm text-muted-foreground">No content available</p>
        )}
      </div>
    </div>
  );
}

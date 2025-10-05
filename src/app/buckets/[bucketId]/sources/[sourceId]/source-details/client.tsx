"use client";

import { eq, useLiveQuery } from "@tanstack/react-db";
import { useParams } from "next/navigation";
import React from "react";
import type { SourceSelect, SourceSnapshotSelect } from "@/db";
import { useCollections } from "@/hooks/use-collections";
import { SnapshotList } from "../snapshot-list";
import { SnapshotViewer } from "../snapshot-viewer";

export function SourceDetails({
  preloadedSource,
  preloadedSnapshots,
}: {
  preloadedSource: SourceSelect;
  preloadedSnapshots: SourceSnapshotSelect[];
}) {
  const { sourceId } = useParams<{
    sourceId: string;
    bucketId: string;
  }>();
  const [selectedSnapshotId, setSelectedSnapshotId] = React.useState<
    string | null
  >(null);

  const { SourceSnapshotCollection, SourceCollection } = useCollections();

  const { data: freshSourceData, status: sourceStatus } = useLiveQuery((q) =>
    q
      .from({ source: SourceCollection })
      .select(({ source }) => ({ ...source }))
      .where(({ source }) => eq(source.id, sourceId)),
  );

  const source = React.useMemo(() => {
    if (
      sourceStatus === "ready" &&
      freshSourceData &&
      freshSourceData.length > 0
    ) {
      return freshSourceData[0];
    }
    return preloadedSource;
  }, [sourceStatus, freshSourceData, preloadedSource]);

  const { data: freshSnapshotsData, status: snapshotsStatus } = useLiveQuery(
    (q) =>
      q
        .from({ snapshot: SourceSnapshotCollection })
        .select(({ snapshot }) => ({ ...snapshot }))
        .where(({ snapshot }) => eq(snapshot.source_id, sourceId)),
  );

  const snapshots = React.useMemo(() => {
    if (snapshotsStatus === "ready") {
      return freshSnapshotsData;
    }
    return preloadedSnapshots;
  }, [snapshotsStatus, freshSnapshotsData, preloadedSnapshots]);

  const selectedSnapshot = React.useMemo(() => {
    if (!selectedSnapshotId) return null;
    return snapshots.find((s) => s.id === selectedSnapshotId) || null;
  }, [selectedSnapshotId, snapshots]);

  return (
    <div className="flex flex-col h-screen">
      <div className="p-6 border-b">
        <h1 className="text-2xl font-bold">{source.name}</h1>
        <p className="text-sm text-muted-foreground">{source.description}</p>
      </div>
      <div className="flex-1 grid grid-cols-[400px_1fr] gap-6 p-6 overflow-hidden">
        <div className="overflow-y-auto">
          <SnapshotList
            preloadedSnapshots={snapshots}
            selectedSnapshotId={selectedSnapshotId}
            onSelectSnapshot={setSelectedSnapshotId}
          />
        </div>
        <div className="overflow-y-auto">
          <SnapshotViewer
            snapshot={selectedSnapshot}
            key={selectedSnapshot?.status}
          />
        </div>
      </div>
    </div>
  );
}

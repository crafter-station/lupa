"use client";

import { eq, useLiveQuery } from "@tanstack/react-db";
import { useParams } from "next/navigation";
import React from "react";
import type { SourceSnapshotSelect } from "@/db";
import { useCollections } from "@/hooks/use-collections";
import { SnapshotList } from "../snapshot-list";
import { SnapshotViewer } from "../snapshot-viewer";

export function SourceDetails({
  preloadedSnapshots,
}: {
  preloadedSnapshots: SourceSnapshotSelect[];
}) {
  const { sourceId } = useParams<{
    sourceId: string;
    bucketId: string;
  }>();
  const [selectedSnapshotId, setSelectedSnapshotId] = React.useState<
    string | null
  >(null);

  const { SourceSnapshotCollection } = useCollections();

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
      <div className="flex-1 grid grid-cols-[400px_1fr] gap-6 overflow-hidden">
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

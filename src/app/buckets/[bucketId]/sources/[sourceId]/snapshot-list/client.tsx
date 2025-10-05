"use client";

import { eq, useLiveQuery } from "@tanstack/react-db";
import { Plus } from "lucide-react";
import { useParams } from "next/navigation";
import React from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { SourceSnapshotSelect } from "@/db";
import { useCollections } from "@/hooks/use-collections";
import { cn } from "@/lib/utils";
import { CreateSnapshotModal } from "../create-snapshot-modal";

export function SnapshotList({
  preloadedSnapshots,
  selectedSnapshotId,
  onSelectSnapshot,
}: {
  preloadedSnapshots: SourceSnapshotSelect[];
  selectedSnapshotId: string | null;
  onSelectSnapshot: (snapshotId: string) => void;
}) {
  const { sourceId } = useParams<{ sourceId: string }>();
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const { SourceSnapshotCollection } = useCollections();

  const { data: freshData, status } = useLiveQuery((q) =>
    q
      .from({ snapshot: SourceSnapshotCollection })
      .select(({ snapshot }) => ({ ...snapshot }))
      .where(({ snapshot }) => eq(snapshot.source_id, sourceId)),
  );

  const snapshots = React.useMemo(() => {
    if (status === "ready") {
      return freshData;
    }
    return preloadedSnapshots;
  }, [status, freshData, preloadedSnapshots]);

  const latestSnapshotUrl = React.useMemo(() => {
    if (snapshots.length === 0) return undefined;
    return snapshots[0].url;
  }, [snapshots]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "bg-green-500";
      case "error":
        return "bg-red-500";
      case "running":
        return "bg-blue-500";
      case "queued":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <>
      <div className="flex flex-col gap-3 h-full overflow-y-auto">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-semibold">Snapshots</h2>
          <Button
            size="sm"
            onClick={() => setIsModalOpen(true)}
            className="gap-1"
          >
            <Plus className="h-4 w-4" />
            New Snapshot
          </Button>
        </div>
        {snapshots.length === 0 ? (
          <p className="text-sm text-muted-foreground px-1">No snapshots yet</p>
        ) : (
          snapshots.map((snapshot) => (
            <Card
              key={snapshot.id}
              className={cn(
                "cursor-pointer hover:bg-accent transition-colors p-4",
                selectedSnapshotId === snapshot.id && "ring-2 ring-primary",
              )}
              onClick={() => onSelectSnapshot(snapshot.id)}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full",
                        getStatusColor(snapshot.status),
                      )}
                    />
                    <span className="text-xs font-medium capitalize">
                      {snapshot.status}
                    </span>
                  </div>
                  <p className="text-sm truncate" title={snapshot.url}>
                    {snapshot.url}
                  </p>
                  {snapshot.status === "success" && snapshot.chunks_count && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {snapshot.chunks_count} chunks
                    </p>
                  )}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {new Date(snapshot.created_at).toLocaleString()}
              </p>
            </Card>
          ))
        )}
      </div>
      <CreateSnapshotModal
        sourceId={sourceId}
        defaultUrl={latestSnapshotUrl}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </>
  );
}

"use client";

import { eq, useLiveQuery } from "@tanstack/react-db";
import React from "react";
import type { SourceSelect } from "@/db";
import { SourceCollection } from "@/db/collections";

export function SourceList({
  preloadedSources,
  bucketId,
}: {
  preloadedSources: SourceSelect[];
  bucketId: string;
}) {
  const { data: freshData, status } = useLiveQuery((q) =>
    q
      .from({ source: SourceCollection })
      .select(({ source }) => ({ ...source }))
      .where(({ source }) => eq(source.bucket_id, bucketId)),
  );

  const sources = React.useMemo(() => {
    if (status === "ready") {
      return freshData;
    }
    return preloadedSources;
  }, [status, freshData, preloadedSources]);

  return (
    <div className="flex flex-col gap-4">
      {sources.map((source) => (
        <div key={source.id}>
          {source.name} - {source.description}
        </div>
      ))}
      <div>{status}</div>
    </div>
  );
}

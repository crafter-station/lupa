"use client";

import { eq, useLiveQuery } from "@tanstack/react-db";
import Link from "next/link";
import { useParams } from "next/navigation";
import React from "react";
import type { SourceSelect } from "@/db";
import { SourceCollection } from "@/db/collections";

export function SourceList({
  preloadedSources,
}: {
  preloadedSources: SourceSelect[];
}) {
  const { bucketId } = useParams<{ bucketId: string }>();
  const { data: freshData, status } = useLiveQuery((q) =>
    q
      .from({ source: SourceCollection({ bucket_id: bucketId }) })
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
        <Link
          href={`/buckets/${bucketId}/sources/${source.id}`}
          key={source.id}
        >
          {source.name} - {source.description}
        </Link>
      ))}
      <div>{status}</div>
    </div>
  );
}

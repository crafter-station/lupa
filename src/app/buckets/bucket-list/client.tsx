"use client";

import { useLiveQuery } from "@tanstack/react-db";
import Link from "next/link";
import React from "react";
import type { BucketSelect } from "@/db";
import { useCollections } from "@/hooks/use-collections";

export function BucketList({
  preloadedBuckets,
}: {
  preloadedBuckets: BucketSelect[];
}) {
  const { BucketCollection } = useCollections();

  const { data: freshData, status } = useLiveQuery((q) =>
    q
      .from({ bucket: BucketCollection })
      .select(({ bucket }) => ({ ...bucket })),
  );

  const buckets = React.useMemo(() => {
    if (status === "ready") {
      return freshData;
    }
    return preloadedBuckets;
  }, [status, freshData, preloadedBuckets]);

  return (
    <div className="flex flex-col gap-4">
      {buckets.map((bucket) => (
        <div
          key={bucket.id}
          className="p-4 border rounded-md shadow-md relative"
        >
          <Link
            href={`/buckets/${bucket.id}`}
            className="absolute inset-0 peer"
          ></Link>
          <h2 className="text-xl font-bold peer-hover:underline">
            {bucket.name}
          </h2>
          <p className="text-sm text-muted-foreground">{bucket.description}</p>
        </div>
      ))}

      <div>{status}</div>
    </div>
  );
}

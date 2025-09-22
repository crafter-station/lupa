"use client";

import type { api } from "@convex/_generated/api";
import { type Preloaded, usePreloadedQuery } from "convex/react";
import Link from "next/link";

export function BucketList({
  preloadedBuckets,
}: {
  preloadedBuckets: Preloaded<typeof api.bucket.list>;
}) {
  const buckets = usePreloadedQuery(preloadedBuckets);

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
    </div>
  );
}

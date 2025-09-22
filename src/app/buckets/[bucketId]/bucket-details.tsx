"use client";

import type { api } from "@convex/_generated/api";
import { type Preloaded, usePreloadedQuery } from "convex/react";

export function BucketDetails({
  preloadedBucket,
}: {
  preloadedBucket: Preloaded<typeof api.bucket.get>;
}) {
  const bucket = usePreloadedQuery(preloadedBucket);

  return (
    <div>
      <h1 className="text-2xl font-bold">{bucket.name}</h1>
      <p className="text-sm text-muted-foreground">{bucket.description}</p>
    </div>
  );
}

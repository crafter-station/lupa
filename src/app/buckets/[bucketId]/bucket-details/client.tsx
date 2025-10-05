"use client";

import { eq, useLiveQuery } from "@tanstack/react-db";
import React from "react";
import type { BucketSelect } from "@/db";
import { useCollections } from "@/hooks/use-collections";

export function BucketDetails({
  preloadedBucket,
}: {
  preloadedBucket: BucketSelect;
}) {
  const { BucketCollection } = useCollections();
  const { data: freshData, status } = useLiveQuery((q) =>
    q
      .from({ bucket: BucketCollection })
      .select(({ bucket }) => ({ ...bucket }))
      .where(({ bucket }) => eq(bucket.id, preloadedBucket.id)),
  );

  const bucket = React.useMemo(() => {
    if (status === "ready" && freshData && freshData.length > 0) {
      return freshData[0];
    }
    return preloadedBucket;
  }, [status, freshData, preloadedBucket]);

  return (
    <div>
      <h1 className="text-2xl">
        Name: <span className="font-bold">{bucket.name}</span>
      </h1>
      <p className="text-sm text-muted-foreground">
        Description: {bucket.description}
      </p>
    </div>
  );
}

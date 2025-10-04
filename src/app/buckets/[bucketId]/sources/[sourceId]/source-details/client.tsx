"use client";

import { eq, useLiveQuery } from "@tanstack/react-db";
import React from "react";
import type { SourceSelect } from "@/db";
import { SourceCollection } from "@/db/collections";

export function SourceDetails({
  preloadedSource,
}: {
  preloadedSource: SourceSelect;
}) {
  const { data: freshData, status } = useLiveQuery((q) =>
    q
      .from({ source: SourceCollection })
      .select(({ source }) => ({ ...source }))
      .where(({ source }) => eq(source.id, preloadedSource.id)),
  );

  const source = React.useMemo(() => {
    if (status === "ready" && freshData && freshData.length > 0) {
      return freshData[0];
    }
    return preloadedSource;
  }, [status, freshData, preloadedSource]);

  return (
    <div>
      <h1 className="text-2xl font-bold">{source.name}</h1>
      <p className="text-sm text-muted-foreground">{source.description}</p>
    </div>
  );
}

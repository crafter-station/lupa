"use client";

import type { api } from "@convex/_generated/api";
import { type Preloaded, usePreloadedQuery } from "convex/react";

export function SourceList({
  preloadedSources,
}: {
  preloadedSources: Preloaded<typeof api.source.list>;
}) {
  const sources = usePreloadedQuery(preloadedSources);

  return (
    <div className="flex flex-col gap-4">
      {sources.map((source) => (
        <div key={source.id}>
          {source.name} - {source.snapshot?.url}
        </div>
      ))}
    </div>
  );
}

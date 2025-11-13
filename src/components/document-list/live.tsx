"use client";

import { and, eq, like, useLiveQuery } from "@tanstack/react-db";
import React from "react";
import { DocumentCollection } from "@/db/collections";
import { DocumentListContent } from "./content";
import { getItems } from "./get-items";
import type { LiveProps } from "./props";

export function DocumentListLive({
  projectId,
  folder,
  preloadedItems,
  orgSlug,
}: LiveProps) {
  const { data: liveDocuments } = useLiveQuery(
    (q) =>
      q
        .from({ document: DocumentCollection })
        .where(({ document }) =>
          and(
            eq(document.project_id, projectId),
            like(document.folder, folder),
          ),
        )
        .select(({ document }) => ({ ...document })),
    [projectId, folder],
  );

  const liveItems = getItems({
    folder,
    documents: liveDocuments,
    projectId,
    orgSlug,
  });

  const items = React.useMemo(() => {
    if (liveItems.length) {
      const lastLiveItem = liveItems.toSorted(
        (a, b) =>
          new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
      )[liveItems.length - 1];

      const lastPreloadedItem = preloadedItems.toSorted(
        (a, b) =>
          new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
      )[preloadedItems.length - 1];

      if (lastLiveItem?.updated_at > lastPreloadedItem?.updated_at) {
        return liveItems;
      } else {
        return preloadedItems;
      }
    }

    return preloadedItems;
  }, [liveItems, preloadedItems]);

  return <DocumentListContent items={items} folder={folder} />;
}

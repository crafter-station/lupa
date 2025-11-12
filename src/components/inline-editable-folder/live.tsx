"use client";

import { eq, useLiveQuery } from "@tanstack/react-db";
import { DocumentCollection } from "@/db/collections";
import { InlineEditableFolderContent } from "./content";
import type { LiveProps } from "./props";

export function InlineEditableFolderLive({
  value,
  projectId,
  onSave,
  className,
}: LiveProps) {
  const { data: documents = [] } = useLiveQuery(
    (q) =>
      q
        .from({ document: DocumentCollection })
        .select(({ document }) => ({ ...document }))
        .where(({ document }) => eq(document.project_id, projectId)),
    [projectId],
  );

  return (
    <InlineEditableFolderContent
      value={value}
      documents={documents}
      onSave={onSave}
      className={className}
    />
  );
}

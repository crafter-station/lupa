"use client";

import { and, eq, useLiveQuery } from "@tanstack/react-db";
import React from "react";
import { DocumentCollection } from "@/db/collections";
import { DocumentDetailsContent } from "./content";
import type { LiveProps } from "./props";

export function DocumentDetailsLive({
  projectId,
  folder,
  documentName,
  preloadedDocument,
}: LiveProps) {
  const { data: freshDocumentData, status: documentStatus } = useLiveQuery(
    (q) =>
      documentName
        ? q
            .from({ document: DocumentCollection })
            .select(({ document }) => ({ ...document }))
            .where(({ document }) =>
              and(
                eq(document.project_id, projectId),
                eq(document.folder, folder),
                eq(document.name, documentName),
              ),
            )
        : null,
    [projectId, folder, documentName],
  );

  const document = React.useMemo(() => {
    if (!documentName) return null;

    if (documentStatus !== "ready") {
      return preloadedDocument;
    }

    if (!freshDocumentData || freshDocumentData.length === 0) {
      return null;
    }

    if (
      preloadedDocument &&
      new Date(freshDocumentData[0].updated_at) >
        new Date(preloadedDocument.updated_at)
    ) {
      return freshDocumentData[0];
    }
    return preloadedDocument || freshDocumentData[0];
  }, [documentName, documentStatus, freshDocumentData, preloadedDocument]);

  return <DocumentDetailsContent projectId={projectId} document={document} />;
}

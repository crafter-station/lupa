"use client";

import { and, eq, useLiveQuery } from "@tanstack/react-db";
import React from "react";
import { DocumentCollection, SnapshotCollection } from "@/db/collections";
import { SnapshotDetailsContent } from "./content";
import type { LiveProps } from "./props";

export function SnapshotDetailsLive({
  projectId,
  folder,
  documentName,
  preloadedDocument,
  preloadedLatestSnapshot,
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

  const documentId = document?.id;

  const { data: freshSnapshotsData, status: snapshotsStatus } = useLiveQuery(
    (q) =>
      documentId
        ? q
            .from({ snapshot: SnapshotCollection })
            .select(({ snapshot }) => ({ ...snapshot }))
            .where(({ snapshot }) => eq(snapshot.document_id, documentId))
        : null,
    [documentId],
  );

  const latestSnapshot = React.useMemo(() => {
    if (!documentId) return null;

    if (snapshotsStatus !== "ready") {
      return preloadedLatestSnapshot;
    }
    if (!freshSnapshotsData || freshSnapshotsData.length === 0) {
      return null;
    }

    let latest = freshSnapshotsData[0];
    for (const snapshot of freshSnapshotsData) {
      if (
        new Date(snapshot.created_at).getTime() >
        new Date(latest.created_at).getTime()
      ) {
        latest = snapshot;
      }
    }
    return latest;
  }, [
    documentId,
    snapshotsStatus,
    freshSnapshotsData,
    preloadedLatestSnapshot,
  ]);

  return (
    <SnapshotDetailsContent
      document={document}
      latestSnapshot={latestSnapshot}
    />
  );
}

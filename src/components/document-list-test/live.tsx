"use client";

import { eq, useLiveQuery } from "@tanstack/react-db";

import { useParams } from "next/navigation";
import React from "react";

import { DocumentCollection, SnapshotCollection } from "@/db/collections";
import type { DocumentListLoadingContextProps } from "./client";
import { DocumentListContent } from "./content";

export function DocumentListLive({
  preloadedDocuments,
  preloadedSnapshots,
}: DocumentListLoadingContextProps) {
  const { projectId } = useParams<{
    projectId: string;
    path?: string[];
  }>();

  const { data: freshDocuments, status: documentsStatus } = useLiveQuery((q) =>
    q
      .from({ document: DocumentCollection })
      .select(({ document }) => ({ ...document }))
      .where(({ document }) => eq(document.project_id, projectId)),
  );

  const allDocuments = React.useMemo(() => {
    if (documentsStatus !== "ready") {
      return [...preloadedDocuments];
    }

    if (freshDocuments.length === 0) return [];
    if (preloadedDocuments.length === 0) return [...freshDocuments];

    const lastFresh = freshDocuments.toSorted(
      (a, b) =>
        new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
    )[freshDocuments.length - 1];

    const lastPreloaded = preloadedDocuments.toSorted(
      (a, b) =>
        new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
    )[preloadedDocuments.length - 1];

    if (
      new Date(lastFresh.updated_at).getTime() >
      new Date(lastPreloaded.updated_at).getTime()
    ) {
      return [...freshDocuments];
    }
    return [...preloadedDocuments];
  }, [documentsStatus, freshDocuments, preloadedDocuments]);

  // Load all snapshots for documents in this project (more efficient than filtering)
  const documentIds = React.useMemo(
    () => allDocuments.map((d) => d.id),
    [allDocuments],
  );

  const { data: freshSnapshots, status: snapshotsStatus } = useLiveQuery(
    (q) =>
      q
        .from({ snapshot: SnapshotCollection })
        .select(({ snapshot }) => ({ ...snapshot })),
    [],
  );

  // Filter snapshots client-side for better performance 👀
  const projectSnapshots = React.useMemo(() => {
    if (!freshSnapshots) return [];
    const documentIdSet = new Set(documentIds);
    return freshSnapshots.filter((s) => documentIdSet.has(s.document_id));
  }, [freshSnapshots, documentIds]);

  const allSnapshots = React.useMemo(() => {
    const filteredPreloaded = preloadedSnapshots.filter((s) =>
      documentIds.includes(s.document_id),
    );

    if (snapshotsStatus !== "ready") {
      return [...filteredPreloaded];
    }

    if (projectSnapshots.length === 0) return [];
    if (filteredPreloaded.length === 0) return [...projectSnapshots];

    const lastFresh = projectSnapshots.toSorted(
      (a, b) =>
        new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
    )[projectSnapshots.length - 1];

    const lastPreloaded = filteredPreloaded.toSorted(
      (a, b) =>
        new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime(),
    )[filteredPreloaded.length - 1];

    if (
      new Date(lastFresh.updated_at).getTime() >
      new Date(lastPreloaded.updated_at).getTime()
    ) {
      return [...projectSnapshots];
    }
    return [...filteredPreloaded];
  }, [snapshotsStatus, projectSnapshots, preloadedSnapshots, documentIds]);

  return (
    <DocumentListContent documents={allDocuments} snapshots={allSnapshots} />
  );
}

"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import * as React from "react";
import {
  BucketCollection,
  SourceCollection,
  SourceSnapshotCollection,
} from "@/db/collections";
import { CollectionsContext } from "./collections";

const queryClient = new QueryClient();

export function ClientProviders({ children }: { children: ReactNode }) {
  const { bucketId, sourceId, snapshotId } = useParams<{
    bucketId?: string;
    sourceId?: string;
    snapshotId?: string;
  }>();

  const _BucketCollection = React.useMemo(
    () => BucketCollection({ bucket_id: bucketId }),
    [bucketId],
  );

  const _SourceCollection = React.useMemo(
    () =>
      SourceCollection({
        bucket_id: bucketId,
        source_id: sourceId,
      }),
    [bucketId, sourceId],
  );

  const _SourceSnapshotCollection = React.useMemo(
    () =>
      SourceSnapshotCollection({
        bucket_id: bucketId,
        source_id: sourceId,
        snapshot_id: snapshotId,
      }),
    [bucketId, sourceId, snapshotId],
  );

  return (
    <CollectionsContext
      value={{
        BucketCollection: _BucketCollection,
        SourceCollection: _SourceCollection,
        SourceSnapshotCollection: _SourceSnapshotCollection,
      }}
    >
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </QueryClientProvider>
    </CollectionsContext>
  );
}

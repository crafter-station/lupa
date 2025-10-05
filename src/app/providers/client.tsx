"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import * as React from "react";
import {
  BucketCollection,
  DeploymentCollection,
  SourceCollection,
  SourceSnapshotCollection,
} from "@/db/collections";
import { CollectionsContext } from "./collections";

const queryClient = new QueryClient();

export function ClientProviders({ children }: { children: ReactNode }) {
  const { bucketId, sourceId, snapshotId, deploymentId } = useParams<{
    bucketId?: string;
    sourceId?: string;
    snapshotId?: string;
    deploymentId?: string;
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

  const _DeploymentCollection = React.useMemo(
    () =>
      DeploymentCollection({
        bucket_id: bucketId,
        deployment_id: deploymentId,
      }),
    [bucketId, deploymentId],
  );

  const _SourceSnapshotCollection = React.useMemo(
    () =>
      SourceSnapshotCollection({
        source_id: sourceId,
        snapshot_id: snapshotId,
      }),
    [sourceId, snapshotId],
  );

  return (
    <CollectionsContext
      value={{
        BucketCollection: _BucketCollection,
        SourceCollection: _SourceCollection,
        SourceSnapshotCollection: _SourceSnapshotCollection,
        DeploymentCollection: _DeploymentCollection,
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

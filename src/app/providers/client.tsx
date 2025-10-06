"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import * as React from "react";
import {
  DeploymentCollection,
  DocumentCollection,
  ProjectCollection,
  SnapshotCollection,
} from "@/db/collections";
import { CollectionsContext } from "./collections";

const queryClient = new QueryClient();

export function ClientProviders({ children }: { children: ReactNode }) {
  const { projectId, documentId, snapshotId, deploymentId } = useParams<{
    projectId?: string;
    documentId?: string;
    snapshotId?: string;
    deploymentId?: string;
  }>();

  const _ProjectCollection = React.useMemo(
    () => ProjectCollection({ project_id: projectId }),
    [projectId],
  );

  const _DocumentCollection = React.useMemo(
    () =>
      DocumentCollection({
        project_id: projectId,
        document_id: documentId,
      }),
    [projectId, documentId],
  );

  const _DeploymentCollection = React.useMemo(
    () =>
      DeploymentCollection({
        project_id: projectId,
        deployment_id: deploymentId,
      }),
    [projectId, deploymentId],
  );

  const _SnapshotCollection = React.useMemo(
    () =>
      SnapshotCollection({
        document_id: documentId,
        snapshot_id: snapshotId,
      }),
    [documentId, snapshotId],
  );

  return (
    <CollectionsContext
      value={{
        ProjectCollection: _ProjectCollection,
        DocumentCollection: _DocumentCollection,
        SnapshotCollection: _SnapshotCollection,
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

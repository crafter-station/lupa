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
import { FolderDocumentVersionContext } from "./folder-document-version";

const queryClient = new QueryClient();

export function ClientProviders({ children }: { children: ReactNode }) {
  const {
    projectId,
    deploymentId,
    path: rawPath = [],
  } = useParams<{
    projectId?: string;
    deploymentId?: string;
    path?: string[];
  }>();

  const path = React.useMemo(() => rawPath.map(decodeURIComponent), [rawPath]);

  const [currentFolder, documentId, version] = React.useMemo(() => {
    if (!path.length) {
      return ["/", null, null];
    }

    if (path.some((item) => item.startsWith("doc:"))) {
      const folder = `/${path.join("/").split("doc:")[0]}`;
      // biome-ignore lint/style/noNonNullAssertion: exists
      const documentId = path
        .find((item) => item.startsWith("doc:"))!
        .split(":")[1];

      const versionSplit = path.join("/").split(`doc:${documentId}`)[1];
      const version = versionSplit ? versionSplit.replace(/\//g, "") : null;

      return [folder, documentId, version];
    }

    const folder = `/${path.join("/")}/`;
    return [folder, null, null];
  }, [path]);

  const _ProjectCollection = React.useMemo(
    () => ProjectCollection({ project_id: projectId }),
    [projectId],
  );

  const _DocumentCollection = React.useMemo(
    () =>
      DocumentCollection({
        project_id: projectId,
      }),
    [projectId],
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
        document_id: documentId ?? undefined,
      }),
    [documentId],
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
      <FolderDocumentVersionContext
        value={{
          folder: currentFolder,
          documentId: documentId,
          version: version,
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
      </FolderDocumentVersionContext>
    </CollectionsContext>
  );
}

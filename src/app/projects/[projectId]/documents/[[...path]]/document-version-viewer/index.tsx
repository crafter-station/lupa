"use client";

import dynamic from "next/dynamic";
import * as React from "react";

import type { DocumentSelect, SnapshotSelect } from "@/db/schema";

import { DocumentVersionViewerContent } from "./client";

export type DocumentVersionViewerLoadingContextProps = {
  documentId: string;
  preloadedDocument: DocumentSelect | null;
  preloadedSnapshots: SnapshotSelect[];
};

const DocumentVersionViewerLoadingContext =
  React.createContext<DocumentVersionViewerLoadingContextProps>({
    documentId: "",
    preloadedDocument: null,
    preloadedSnapshots: [],
  });

export const DocumentVersionViewerDynamic = dynamic(
  () =>
    import("./client").then((module) => module.DocumentVersionViewerLiveQuery),
  {
    ssr: false,

    loading: () => {
      const { preloadedDocument, preloadedSnapshots } = React.useContext(
        DocumentVersionViewerLoadingContext,
      );

      if (!preloadedDocument) {
        return (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            <p>Loading document...</p>
          </div>
        );
      }

      return (
        <DocumentVersionViewerContent
          document={preloadedDocument}
          snapshots={preloadedSnapshots}
        />
      );
    },
  },
);

export const DocumentVersionViewer = ({
  documentId,
  preloadedDocument,
  preloadedSnapshots,
}: DocumentVersionViewerLoadingContextProps) => {
  return (
    <DocumentVersionViewerLoadingContext.Provider
      value={{ documentId, preloadedDocument, preloadedSnapshots }}
    >
      <DocumentVersionViewerDynamic
        documentId={documentId}
        preloadedDocument={preloadedDocument}
        preloadedSnapshots={preloadedSnapshots}
      />
    </DocumentVersionViewerLoadingContext.Provider>
  );
};

"use client";

import dynamic from "next/dynamic";
import * as React from "react";

import type { DocumentSelect, SnapshotSelect } from "@/db/schema";

import { DocumentVersionViewerContent } from "./client";

export type DocumentVersionViewerLoadingContextProps = {
  preloadedDocument: DocumentSelect;
  preloadedSnapshots: SnapshotSelect[];
};

const DocumentVersionViewerLoadingContext =
  React.createContext<DocumentVersionViewerLoadingContextProps>({
    preloadedDocument: {} as DocumentSelect,
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
  preloadedDocument,
  preloadedSnapshots,
}: DocumentVersionViewerLoadingContextProps) => {
  return (
    <DocumentVersionViewerLoadingContext.Provider
      value={{ preloadedDocument, preloadedSnapshots }}
    >
      <DocumentVersionViewerDynamic
        preloadedDocument={preloadedDocument}
        preloadedSnapshots={preloadedSnapshots}
      />
    </DocumentVersionViewerLoadingContext.Provider>
  );
};

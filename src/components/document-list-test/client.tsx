"use client";

import dynamic from "next/dynamic";
import * as React from "react";

import type { DocumentSelect, SnapshotSelect } from "@/db/schema";
import { DocumentListContent } from "./content";

export type DocumentListLoadingContextProps = {
  preloadedDocuments: DocumentSelect[];
  preloadedSnapshots: SnapshotSelect[];
};

const DocumentListLoadingContext =
  React.createContext<DocumentListLoadingContextProps>({
    preloadedDocuments: [],
    preloadedSnapshots: [],
  });

export const DocumentListDynamic = dynamic(
  () => import("./live").then((module) => module.DocumentListLive),
  {
    ssr: false,

    loading: () => {
      const { preloadedDocuments, preloadedSnapshots } = React.useContext(
        DocumentListLoadingContext,
      );
      return (
        <DocumentListContent
          documents={preloadedDocuments}
          snapshots={preloadedSnapshots}
        />
      );
    },
  },
);

export const DocumentList = ({
  preloadedDocuments,
  preloadedSnapshots,
}: DocumentListLoadingContextProps) => {
  return (
    <DocumentListLoadingContext.Provider
      value={{ preloadedDocuments, preloadedSnapshots }}
    >
      <DocumentListDynamic
        preloadedDocuments={preloadedDocuments}
        preloadedSnapshots={preloadedSnapshots}
      />
    </DocumentListLoadingContext.Provider>
  );
};

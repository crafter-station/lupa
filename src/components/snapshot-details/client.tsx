"use client";

import dynamic from "next/dynamic";
import * as React from "react";

import { SnapshotDetailsContent } from "./content";
import type { LiveProps } from "./props";

const SnapshotDetailsLoadingContext = React.createContext<LiveProps>({
  projectId: "",
  folder: "/",
  documentName: null,
  preloadedDocument: null,
  preloadedLatestSnapshot: null,
});

export const SnapshotDetailsDynamic = dynamic(
  () => import("./live").then((module) => module.SnapshotDetailsLive),
  {
    ssr: false,

    loading: () => {
      const { preloadedDocument, preloadedLatestSnapshot } = React.useContext(
        SnapshotDetailsLoadingContext,
      );
      return (
        <SnapshotDetailsContent
          document={preloadedDocument}
          latestSnapshot={preloadedLatestSnapshot}
        />
      );
    },
  },
);

export const SnapshotDetailsClient = ({
  projectId,
  folder,
  documentName,
  preloadedDocument,
  preloadedLatestSnapshot,
}: LiveProps) => {
  return (
    <SnapshotDetailsLoadingContext.Provider
      value={{
        projectId,
        folder,
        documentName,
        preloadedDocument,
        preloadedLatestSnapshot,
      }}
    >
      <SnapshotDetailsDynamic
        projectId={projectId}
        folder={folder}
        documentName={documentName}
        preloadedDocument={preloadedDocument}
        preloadedLatestSnapshot={preloadedLatestSnapshot}
      />
    </SnapshotDetailsLoadingContext.Provider>
  );
};

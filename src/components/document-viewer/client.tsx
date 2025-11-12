"use client";

import dynamic from "next/dynamic";
import * as React from "react";

import { DocumentViewerContent } from "./content";
import type { LiveProps } from "./props";

const DocumentViewerLoadingContext = React.createContext<LiveProps>({
  projectId: "",
  folder: "/",
  documentName: null,
  preloadedDocument: null,
  preloadedLatestSnapshot: null,
});

export const DocumentViewerDynamic = dynamic(
  () => import("./live").then((module) => module.DocumentViewerLive),
  {
    ssr: false,

    loading: () => {
      const { projectId, folder, preloadedDocument, preloadedLatestSnapshot } =
        React.useContext(DocumentViewerLoadingContext);
      return (
        <DocumentViewerContent
          projectId={projectId}
          folder={folder}
          document={preloadedDocument}
          latestSnapshot={preloadedLatestSnapshot}
        />
      );
    },
  },
);

export const DocumentViewerClient = ({
  projectId,
  folder,
  documentName,
  preloadedDocument,
  preloadedLatestSnapshot,
}: LiveProps) => {
  return (
    <DocumentViewerLoadingContext.Provider
      value={{
        projectId,
        folder,
        documentName,
        preloadedDocument,
        preloadedLatestSnapshot,
      }}
    >
      <DocumentViewerDynamic
        projectId={projectId}
        folder={folder}
        documentName={documentName}
        preloadedDocument={preloadedDocument}
        preloadedLatestSnapshot={preloadedLatestSnapshot}
      />
    </DocumentViewerLoadingContext.Provider>
  );
};

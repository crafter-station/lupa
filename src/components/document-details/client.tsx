"use client";

import dynamic from "next/dynamic";
import * as React from "react";

import { DocumentDetailsContent } from "./content";
import type { LiveProps } from "./props";

const DocumentDetailsLoadingContext = React.createContext<LiveProps>({
  projectId: "",
  folder: "/",
  documentName: null,
  preloadedDocument: null,
});

export const DocumentDetailsDynamic = dynamic(
  () => import("./live").then((module) => module.DocumentDetailsLive),
  {
    ssr: false,

    loading: () => {
      const { projectId, preloadedDocument } = React.useContext(
        DocumentDetailsLoadingContext,
      );
      return (
        <DocumentDetailsContent
          projectId={projectId}
          document={preloadedDocument}
        />
      );
    },
  },
);

export const DocumentDetailsClient = ({
  projectId,
  folder,
  documentName,
  preloadedDocument,
}: LiveProps) => {
  return (
    <DocumentDetailsLoadingContext.Provider
      value={{
        projectId,
        folder,
        documentName,
        preloadedDocument,
      }}
    >
      <DocumentDetailsDynamic
        projectId={projectId}
        folder={folder}
        documentName={documentName}
        preloadedDocument={preloadedDocument}
      />
    </DocumentDetailsLoadingContext.Provider>
  );
};

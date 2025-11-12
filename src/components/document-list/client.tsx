"use client";

import dynamic from "next/dynamic";
import * as React from "react";

import { DocumentListContent } from "./content";
import type { LiveProps } from "./props";

const DocumentListLoadingContext = React.createContext<LiveProps>({
  preloadedItems: [],
  folder: "/",
  projectId: "",
});

export const DocumentListDynamic = dynamic(
  () => import("./live").then((module) => module.DocumentListLive),
  {
    ssr: false,

    loading: () => {
      const { preloadedItems, folder } = React.useContext(
        DocumentListLoadingContext,
      );
      return <DocumentListContent items={preloadedItems} folder={folder} />;
    },
  },
);

export const DocumentListClient = ({
  preloadedItems,
  projectId,
  folder,
}: LiveProps) => {
  return (
    <DocumentListLoadingContext.Provider
      value={{ projectId, folder, preloadedItems }}
    >
      <DocumentListDynamic
        projectId={projectId}
        preloadedItems={preloadedItems}
        folder={folder}
      />
    </DocumentListLoadingContext.Provider>
  );
};

"use client";

import dynamic from "next/dynamic";
import * as React from "react";

import type { DocumentSelect } from "@/db/schema";

import { TopDocumentsListContent } from "./client";

export type TopDocumentsListProps = {
  topDocumentsData: Array<{
    document_id: string;
    total_appearances: number;
    unique_searches: number;
    avg_score: number;
    avg_position: number;
    times_ranked_first: number;
  }>;
  preloadedDocuments: DocumentSelect[];
  projectId: string;
};

const TopDocumentsListLoadingContext =
  React.createContext<TopDocumentsListProps>({
    topDocumentsData: [],
    preloadedDocuments: [],
    projectId: "",
  });

export const TopDocumentsListDynamic = dynamic(
  () => import("./client").then((module) => module.TopDocumentsListLiveQuery),
  {
    ssr: false,

    loading: () => {
      const { topDocumentsData, preloadedDocuments } = React.useContext(
        TopDocumentsListLoadingContext,
      );
      return (
        <TopDocumentsListContent
          topDocumentsData={topDocumentsData}
          documents={preloadedDocuments}
        />
      );
    },
  },
);

export const TopDocumentsList = ({
  topDocumentsData,
  preloadedDocuments,
  projectId,
}: TopDocumentsListProps) => {
  return (
    <TopDocumentsListLoadingContext.Provider
      value={{ topDocumentsData, preloadedDocuments, projectId }}
    >
      <TopDocumentsListDynamic
        topDocumentsData={topDocumentsData}
        preloadedDocuments={preloadedDocuments}
        projectId={projectId}
      />
    </TopDocumentsListLoadingContext.Provider>
  );
};

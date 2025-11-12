"use client";

import dynamic from "next/dynamic";
import * as React from "react";

import { InlineEditableFolderContent } from "./content";
import type { LiveProps } from "./props";

const InlineEditableFolderLoadingContext = React.createContext<LiveProps>({
  value: "/",
  projectId: "",
  onSave: () => {},
});

export const InlineEditableFolderDynamic = dynamic(
  () => import("./live").then((module) => module.InlineEditableFolderLive),
  {
    ssr: false,

    loading: () => {
      const { value, onSave } = React.useContext(
        InlineEditableFolderLoadingContext,
      );
      return (
        <InlineEditableFolderContent
          value={value}
          documents={[]}
          onSave={onSave}
        />
      );
    },
  },
);

export const InlineEditableFolder = ({
  value,
  projectId,
  onSave,
  className,
}: LiveProps) => {
  return (
    <InlineEditableFolderLoadingContext.Provider
      value={{
        value,
        projectId,
        onSave,
      }}
    >
      <InlineEditableFolderDynamic
        value={value}
        projectId={projectId}
        onSave={onSave}
        className={className}
      />
    </InlineEditableFolderLoadingContext.Provider>
  );
};

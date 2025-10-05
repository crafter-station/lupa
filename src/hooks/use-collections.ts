import * as React from "react";
import { CollectionsContext } from "@/app/providers/collections";

export const useCollections = () => {
  const ctx = React.useContext(CollectionsContext);

  if (!ctx) {
    throw new Error("useCollections must be used within a CollectionsProvider");
  }

  return {
    ...ctx,
  };
};

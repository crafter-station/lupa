import * as React from "react";
import { FolderDocumentVersionContext } from "@/app/providers/folder-document-version";

export const useFolderDocumentVersion = () => {
  const ctx = React.useContext(FolderDocumentVersionContext);

  if (!ctx) {
    throw new Error(
      "useFolderDocumentVersion must be used within a FolderDocumentVersionContext provider",
    );
  }

  return {
    ...ctx,
  };
};

import * as React from "react";

export const FolderDocumentVersionContext = React.createContext<{
  folder: string;
  documentId: string | null;
  version: string | null;
} | null>(null);

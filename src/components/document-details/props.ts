import type { DocumentSelect } from "@/db";

export type ServerProps = {
  projectId: string;
  folder: string;
  documentName: string | null;
};

export type ContentProps = {
  projectId: string;
  document: DocumentSelect | null;
};

export type LiveProps = {
  projectId: string;
  folder: string;
  documentName: string | null;
  preloadedDocument: DocumentSelect | null;
};

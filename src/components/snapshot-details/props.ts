import type { DocumentSelect, SnapshotSelect } from "@/db";

export type ServerProps = {
  projectId: string;
  folder: string;
  documentName: string | null;
};

export type ContentProps = {
  document: DocumentSelect | null;
  latestSnapshot: SnapshotSelect | null;
};

export type LiveProps = {
  projectId: string;
  folder: string;
  documentName: string | null;
  preloadedDocument: DocumentSelect | null;
  preloadedLatestSnapshot: SnapshotSelect | null;
};

import type { DocumentSelect, SnapshotSelect } from "@/db";

export type ServerProps = {
  selectedDocument: DocumentSelect | null;
};

export type ContentProps = {
  selectedDocument: DocumentSelect | null;
  latestSnapshot: SnapshotSelect | null;
  markdownContent: string | null;
};

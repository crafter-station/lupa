import type { DocumentSelect } from "@/db";

export type ServerProps = {
  value: string;
  projectId: string;
  onSave: (value: string) => void | Promise<void>;
};

export type ContentProps = {
  value: string;
  documents: DocumentSelect[];
  onSave: (value: string) => void | Promise<void>;
  className?: string;
};

export type LiveProps = {
  value: string;
  projectId: string;
  onSave: (value: string) => void | Promise<void>;
  className?: string;
};

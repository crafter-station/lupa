import type { DocumentSelect } from "@/db";

export type ContentProps = {
  value: string;
  documents: DocumentSelect[];
  onSave: (value: string) => void | Promise<void>;
  className?: string;
};

export type InlineEditableFolderProps = {
  value: string;
  documents: DocumentSelect[];
  onSave: (value: string) => void | Promise<void>;
  className?: string;
};

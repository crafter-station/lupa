"use client";

import { InlineEditableFolderContent } from "./content";
import type { InlineEditableFolderProps } from "./props";

export const InlineEditableFolder = ({
  value,
  documents,
  onSave,
  className,
}: InlineEditableFolderProps) => {
  return (
    <InlineEditableFolderContent
      value={value}
      documents={documents}
      onSave={onSave}
      className={className}
    />
  );
};

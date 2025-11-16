"use client";

import { Label } from "@/components/ui/label";

type DocumentUpdatedAtProps = {
  updatedAt: string;
};

export function DocumentUpdatedAt({ updatedAt }: DocumentUpdatedAtProps) {
  return (
    <div className="col-span-2">
      <Label className="text-xs text-muted-foreground">Updated</Label>
      <div className="text-sm">{new Date(updatedAt).toLocaleString()}</div>
    </div>
  );
}

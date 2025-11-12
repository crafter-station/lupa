"use client";

import { CreateDocument } from "../create-document";
import { CreateSnapshot } from "../create-snapshot";

export function FloatingDock({ document }: { document: string | null }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-2 px-4 py-2 bg-background/80 backdrop-blur-md border rounded-full shadow-lg">
        <CreateDocument />
        {document ? <CreateSnapshot /> : null}
      </div>
    </div>
  );
}

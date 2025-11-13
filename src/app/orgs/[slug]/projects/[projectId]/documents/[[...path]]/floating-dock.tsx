"use client";

import { Layers } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CreateDocumentDialog } from "../create-document-dialog";
import { CreateSnapshotDialog } from "../create-snapshot-dialog";

export function FloatingDock({ document }: { document: string | null }) {
  const { slug, projectId } = useParams<{
    slug: string;
    projectId: string;
  }>();

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-center gap-1 px-2 py-2 bg-background/80 backdrop-blur-md border rounded-full shadow-lg">
        <Tooltip>
          <TooltipTrigger asChild>
            <CreateDocumentDialog />
          </TooltipTrigger>
          <TooltipContent>Create Document</TooltipContent>
        </Tooltip>

        {document ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <CreateSnapshotDialog />
            </TooltipTrigger>
            <TooltipContent>New Snapshot</TooltipContent>
          </Tooltip>
        ) : null}

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <Link
                href={`/orgs/${slug}/projects/${projectId}/documents/bulk-create`}
              >
                <Layers className="h-4 w-4" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Bulk Create Documents</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

import { Suspense } from "react";
import { DocumentListClient } from "@/components/document-list/client";
import { DocumentListServer } from "@/components/document-list/server";
import { DocumentViewerClient } from "@/components/document-viewer/client";
import { DocumentViewerServer } from "@/components/document-viewer/server";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getFolderDocumentVersion } from "@/lib/folder-utils";

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ projectId: string; path?: string[] }>;
}) {
  const { projectId, path } = await params;
  const { folder, document } = getFolderDocumentVersion(path);

  return (
    <div className="grid grid-cols-3 h-full">
      <div className="col-span-1">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead style={{ width: "200px" }}>Last Modified</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <Suspense
              fallback={
                <DocumentListClient
                  projectId={projectId}
                  preloadedItems={[]}
                  folder={folder}
                />
              }
            >
              <DocumentListServer projectId={projectId} folder={folder} />
            </Suspense>
          </TableBody>
        </Table>
      </div>

      <div className="col-span-2">
        <Suspense
          fallback={
            <DocumentViewerClient
              projectId={projectId}
              folder={folder}
              documentName={document}
              preloadedDocument={null}
              preloadedLatestSnapshot={null}
            />
          }
        >
          <DocumentViewerServer
            projectId={projectId}
            folder={folder}
            documentName={document}
          />
        </Suspense>
      </div>
    </div>
  );
}

import { Suspense } from "react";
import { DocumentDetailsClient } from "@/components/document-details/client";
import { DocumentDetailsServer } from "@/components/document-details/server";
import { DocumentListClient } from "@/components/document-list/client";
import { DocumentListServer } from "@/components/document-list/server";
import { SnapshotDetailsClient } from "@/components/snapshot-details/client";
import { SnapshotDetailsServer } from "@/components/snapshot-details/server";
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

  console.log({ folder, document });

  return (
    <div className="grid grid-cols-3 h-full w-full">
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

      <div className="border-l col-span-2 grid grid-rows-3 h-full w-full">
        <div className="row-span-1 border-b">
          <Suspense
            fallback={
              <DocumentDetailsClient
                projectId={projectId}
                folder={folder}
                documentName={document}
                preloadedDocument={null}
              />
            }
          >
            <DocumentDetailsServer
              projectId={projectId}
              folder={folder}
              documentName={document}
            />
          </Suspense>
        </div>

        <div className="row-span-2">
          <Suspense
            fallback={
              <SnapshotDetailsClient
                projectId={projectId}
                folder={folder}
                documentName={document}
                preloadedDocument={null}
                preloadedLatestSnapshot={null}
              />
            }
          >
            <SnapshotDetailsServer
              projectId={projectId}
              folder={folder}
              documentName={document}
            />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

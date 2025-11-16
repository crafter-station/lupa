import { and, eq, like } from "drizzle-orm";

import { DocumentDetails } from "@/components/document-details";
import { DocumentList } from "@/components/document-list";
import { getItems } from "@/components/document-list/get-items";
import { SnapshotDetails } from "@/components/snapshot-details";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { getSelectedDocumentNameAndFolder } from "@/lib/folder-utils";

import { FloatingDock } from "./floating-dock";

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ projectId: string; path?: string[]; slug: string }>;
}) {
  "use cache";

  const { projectId, path, slug } = await params;
  const { folder, name } = getSelectedDocumentNameAndFolder(path);

  const documents = await db
    .select()
    .from(schema.Document)
    .where(
      and(
        eq(schema.Document.project_id, projectId),
        like(schema.Document.folder, `${folder}%`),
      ),
    );

  const selectedDocument = documents.find(
    (doc) => doc.folder === folder && doc.name === name,
  );

  const items = getItems({
    documents,
    folder,
    orgSlug: slug,
    projectId,
  });

  return (
    <>
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
              <DocumentList
                folder={folder}
                items={items}
                selectedDocumentName={name}
              />
            </TableBody>
          </Table>
        </div>

        <div className="border-l col-span-2 grid grid-rows-3 h-full w-full">
          <div className="row-span-1 border-b">
            <DocumentDetails
              projectId={projectId}
              selectedDocument={selectedDocument ?? null}
              documents={documents}
            />
          </div>

          <div className="row-span-2">
            <SnapshotDetails selectedDocument={selectedDocument ?? null} />
          </div>
        </div>
      </div>
      <FloatingDock
        selectedDocument={selectedDocument ?? null}
        documents={documents}
      />
    </>
  );
}

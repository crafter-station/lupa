import { eq, inArray } from "drizzle-orm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { CreateDocument } from "../create-document";
import { DocumentList } from "../document-list";
import { DocumentVersionViewer } from "./document-version-viewer";

export default async function DocumentsPathPage({
  params,
}: {
  params: Promise<{ projectId: string; path?: string[]; slug: string }>;
}) {
  const { slug, projectId, path: rawPath = [] } = await params;

  const path = rawPath.map(decodeURIComponent);

  const lastSegment = path[path.length - 1];
  const secondLastSegment = path.length > 1 ? path[path.length - 2] : null;

  let isDocumentView = lastSegment?.startsWith("doc:");
  let documentId: string | null = null;

  if (
    lastSegment?.startsWith("v") &&
    !Number.isNaN(Number(lastSegment.slice(1))) &&
    secondLastSegment?.startsWith("doc:")
  ) {
    isDocumentView = true;
    documentId = secondLastSegment.slice(4);
  } else if (lastSegment?.startsWith("doc:")) {
    isDocumentView = true;
    documentId = lastSegment.slice(4);
  }

  if (isDocumentView && documentId) {
    const [preloadedDocument] = await db
      .select()
      .from(schema.Document)
      .where(eq(schema.Document.id, documentId));

    const snapshots = preloadedDocument
      ? await db
          .select()
          .from(schema.Snapshot)
          .where(eq(schema.Snapshot.document_id, documentId))
      : [];

    const preloadedDocuments = await db
      .select()
      .from(schema.Document)
      .where(eq(schema.Document.project_id, projectId));

    const preloadedSnapshotsForList =
      preloadedDocuments.length > 0
        ? await db
            .select()
            .from(schema.Snapshot)
            .where(
              inArray(
                schema.Snapshot.document_id,
                preloadedDocuments.map((d) => d.id),
              ),
            )
        : [];

    return (
      <div className="grid grid-cols-2 gap-4 h-[calc(100vh-10rem)]">
        <div className="overflow-y-auto flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <h1 className="text-2xl font-bold">Documents</h1>
            <div className="flex gap-2">
              <Link
                href={`/orgs/${slug}/projects/${projectId}/documents/bulk-create`}
              >
                <Button variant="outline">Bulk Create from Website</Button>
              </Link>
              <CreateDocument />
            </div>
          </div>
          <DocumentList
            preloadedDocuments={preloadedDocuments}
            preloadedSnapshots={preloadedSnapshotsForList}
          />
        </div>
        <div className="overflow-y-auto border-l pl-4">
          <DocumentVersionViewer
            documentId={documentId}
            preloadedDocument={preloadedDocument ?? null}
            preloadedSnapshots={snapshots}
            preloadedAllDocuments={preloadedDocuments}
          />
        </div>
      </div>
    );
  }

  const preloadedDocuments = await db
    .select()
    .from(schema.Document)
    .where(eq(schema.Document.project_id, projectId));

  const preloadedSnapshotsForList =
    preloadedDocuments.length > 0
      ? await db
          .select()
          .from(schema.Snapshot)
          .where(
            inArray(
              schema.Snapshot.document_id,
              preloadedDocuments.map((d) => d.id),
            ),
          )
      : [];

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-start">
        <h1 className="text-2xl font-bold">Documents</h1>
        <div className="flex gap-2">
          <Link
            href={`/orgs/${slug}/projects/${projectId}/documents/bulk-create`}
          >
            <Button variant="outline">Bulk Create from Website</Button>
          </Link>
          <CreateDocument />
        </div>
      </div>
      <DocumentList
        preloadedDocuments={preloadedDocuments}
        preloadedSnapshots={preloadedSnapshotsForList}
      />
    </div>
  );
}

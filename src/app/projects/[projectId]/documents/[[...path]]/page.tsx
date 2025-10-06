import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { CreateDocument } from "../create-document";
import { DocumentList } from "../document-list";
import { DocumentVersionViewer } from "./document-version-viewer";

export const revalidate = 60;

export default async function DocumentsPathPage({
  params,
}: {
  params: Promise<{ projectId: string; path?: string[] }>;
}) {
  const { projectId, path: rawPath = [] } = await params;

  const path = rawPath.map(decodeURIComponent);

  const lastSegment = path[path.length - 1];
  const secondLastSegment = path.length > 1 ? path[path.length - 2] : null;

  let isDocumentView = lastSegment?.startsWith("doc:");
  let versionIndex: number | null = null;
  let documentId: string | null = null;
  let folderPath: string[] = [];

  if (
    lastSegment?.startsWith("v") &&
    !Number.isNaN(Number(lastSegment.slice(1))) &&
    secondLastSegment?.startsWith("doc:")
  ) {
    isDocumentView = true;
    versionIndex = Number(lastSegment.slice(1));
    documentId = secondLastSegment.slice(4);
    folderPath = path.slice(0, -2);
  } else if (lastSegment?.startsWith("doc:")) {
    isDocumentView = true;
    documentId = lastSegment.slice(4);
    folderPath = path.slice(0, -1);
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

    const currentPath =
      folderPath.length > 0 ? `/${folderPath.join("/")}/` : "/";

    return (
      <div className="grid grid-cols-2 gap-4 h-[calc(100vh-10rem)]">
        <div className="overflow-y-auto flex flex-col gap-2">
          <div className="flex justify-between items-start">
            <h1 className="text-2xl font-bold">Documents</h1>
            <CreateDocument currentPath={currentPath} />
          </div>
          <DocumentList
            preloadedDocuments={preloadedDocuments}
            currentPath={currentPath}
          />
        </div>
        <div className="overflow-y-auto border-l pl-4">
          {preloadedDocument ? (
            <DocumentVersionViewer
              preloadedDocument={preloadedDocument}
              preloadedSnapshots={snapshots}
              versionIndex={versionIndex}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <p>Document not found</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const currentPath = path.length > 0 ? `/${path.join("/")}/` : "/";

  const preloadedDocuments = await db
    .select()
    .from(schema.Document)
    .where(eq(schema.Document.project_id, projectId));

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-start">
        <h1 className="text-2xl font-bold">Documents</h1>
        <CreateDocument currentPath={currentPath} />
      </div>
      <DocumentList
        preloadedDocuments={preloadedDocuments}
        currentPath={currentPath}
      />
    </div>
  );
}

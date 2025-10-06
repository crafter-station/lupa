import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { CreateDocument } from "./create-document";
import { DocumentList } from "./document-list";

export const revalidate = 60;

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;

  const preloadedDocuments = await db
    .select()
    .from(schema.Document)
    .where(eq(schema.Document.project_id, projectId));

  return (
    <>
      <div className="flex justify-between items-start">
        <h1 className="text-2xl font-bold">Documents</h1>
        <CreateDocument />
      </div>
      <DocumentList preloadedDocuments={preloadedDocuments} />
    </>
  );
}

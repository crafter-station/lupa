import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { DocumentDetails } from "./document-details";

export const revalidate = 60;

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ documentId: string }>;
}) {
  const { documentId } = await params;

  const [preloadedDocument] = await db
    .select()
    .from(schema.Document)
    .where(eq(schema.Document.id, documentId));

  if (!preloadedDocument) {
    throw new Error("Document not found");
  }

  const snapshots = await db
    .select()
    .from(schema.Snapshot)
    .where(eq(schema.Snapshot.document_id, documentId));

  return <DocumentDetails preloadedSnapshots={snapshots} />;
}

import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { SourceDetails } from "./source-details";

export default async function SourcePage({
  params,
}: {
  params: Promise<{ sourceId: string }>;
}) {
  const { sourceId } = await params;

  const [preloadedSource] = await db
    .select()
    .from(schema.Source)
    .where(eq(schema.Source.id, sourceId));

  if (!preloadedSource) {
    throw new Error("Source not found");
  }

  const snapshots = await db
    .select()
    .from(schema.SourceSnapshot)
    .where(eq(schema.SourceSnapshot.source_id, sourceId));

  return (
    <div>
      <SourceDetails
        preloadedSource={preloadedSource}
        preloadedSnapshots={snapshots}
      />
    </div>
  );
}

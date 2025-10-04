import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { CreateSource } from "./create-source";
import { SourceList } from "./source-list";

export default async function SourcesPage({
  params,
}: {
  params: Promise<{ bucketId: string }>;
}) {
  const { bucketId } = await params;

  const preloadedSources = await db
    .select()
    .from(schema.Source)
    .where(eq(schema.Source.bucket_id, bucketId));

  return (
    <div>
      <h1 className="text-2xl font-bold">Sources</h1>
      <SourceList preloadedSources={preloadedSources} bucketId={bucketId} />
      <CreateSource />
    </div>
  );
}

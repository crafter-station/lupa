import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";

export default async function BucketPage({
  params,
}: {
  params: Promise<{ bucketId: string }>;
}) {
  const { bucketId } = await params;

  const [preloadedBucket] = await db
    .select()
    .from(schema.Bucket)
    .where(eq(schema.Bucket.id, bucketId));

  if (!preloadedBucket) {
    throw new Error("Bucket not found");
  }

  return <pre>Here we can put graphs, metrics, and more</pre>;
}

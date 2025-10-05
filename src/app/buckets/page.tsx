import { db } from "@/db";
import * as schema from "@/db/schema";
import { BucketList } from "./bucket-list";
import { CreateBucket } from "./create-bucket";

export const revalidate = 60;

export default async function BucketsPage() {
  const preloadedBuckets = await db.select().from(schema.Bucket);

  return (
    <>
      <div className="flex justify-between items-start">
        <h1 className="text-2xl font-bold">Buckets</h1>
        <CreateBucket />
      </div>
      <BucketList preloadedBuckets={preloadedBuckets} />
    </>
  );
}

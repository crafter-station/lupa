import { Separator } from "@/components/ui/separator";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { BucketList } from "./bucket-list";
import { CreateBucket } from "./create-bucket";

export const revalidate = 60;

export default async function BucketsPage() {
  const preloadedBuckets = await db.select().from(schema.Bucket);

  return (
    <div>
      Buckets
      <BucketList preloadedBuckets={preloadedBuckets} />
      <Separator className="my-4" />
      <CreateBucket />
    </div>
  );
}

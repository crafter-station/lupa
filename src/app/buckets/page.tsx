import { api } from "@convex/_generated/api";
import { preloadQuery } from "convex/nextjs";
import { Separator } from "@/components/ui/separator";
import { BucketList } from "./bucket-list";
import { CreateBucket } from "./create-bucket";

export default async function BucketsPage() {
  const preloadedBuckets = await preloadQuery(api.bucket.list);

  return (
    <div>
      Buckets
      <BucketList preloadedBuckets={preloadedBuckets} />
      <Separator className="my-4" />
      <CreateBucket />
    </div>
  );
}

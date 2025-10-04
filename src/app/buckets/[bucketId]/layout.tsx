import { eq } from "drizzle-orm";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { BucketDetails } from "./bucket-details";

export default async function BucketLayout({
  params,
  children,
}: {
  children: React.ReactNode;
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

  return (
    <div>
      <BucketDetails preloadedBucket={preloadedBucket} />
      <div>
        <Link
          href={`/buckets/${bucketId}`}
          className={buttonVariants({ variant: "outline" })}
        >
          Overview
        </Link>
        <Link
          href={`/buckets/${bucketId}/sources`}
          className={buttonVariants({ variant: "outline" })}
        >
          Sources
        </Link>
      </div>
      {children}
    </div>
  );
}

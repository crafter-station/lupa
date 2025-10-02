import { api } from "@convex/_generated/api";
import { preloadQuery } from "convex/nextjs";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { BucketDetails } from "./bucket-details";

export default async function BucketLayout({
  params,
  children,
}: {
  children: React.ReactNode;
  params: Promise<{ bucketId: string }>;
}) {
  const { bucketId } = await params;

  const preloadedBucket = await preloadQuery(api.bucket.get, { id: bucketId });

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

import Link from "next/link";

export default async function BucketPage({
  params,
}: {
  params: Promise<{ bucketId: string }>;
}) {
  const { bucketId } = await params;

  return (
    <div>
      <h1 className="text-2xl font-bold">Overview</h1>
    </div>
  );
}

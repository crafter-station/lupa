import { api } from "@convex/_generated/api";
import { preloadQuery } from "convex/nextjs";
import { CreateSource } from "./create-source";
import { SourceList } from "./source-list";

export default async function SourcesPage({
  params,
}: {
  params: Promise<{ bucketId: string }>;
}) {
  const { bucketId } = await params;

  const preloadedSources = await preloadQuery(api.source.list, { bucketId });

  return (
    <div>
      <h1 className="text-2xl font-bold">Sources</h1>
      <SourceList preloadedSources={preloadedSources} />
      <CreateSource />
    </div>
  );
}

import { Index as VectorIndex } from "@upstash/vector";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";

export async function GET(request: Request) {
  const searchParamsSplit = request.url.split("?");
  if (!searchParamsSplit[1])
    return new Response(JSON.stringify({}), { status: 400 });

  const searchParams = new URLSearchParams(searchParamsSplit[1]);

  const query = searchParams.get("q");
  const deploymentId = searchParams.get("deploymentId");

  if (!query)
    return new Response(JSON.stringify({ error: "Missing query parameter" }), {
      status: 400,
    });

  if (!deploymentId)
    return new Response(
      JSON.stringify({ error: "Missing deploymentId parameter" }),
      {
        status: 400,
      },
    );

  const deployments = await db
    .select()
    .from(schema.Deployment)
    .where(eq(schema.Deployment.id, deploymentId))
    .limit(1);

  if (!deployments.length)
    return new Response(JSON.stringify({ error: "Deployment not found" }), {
      status: 404,
    });

  const deployment = deployments[0];

  const url = `https://api.upstash.com/v2/vector/index/${deployment.vector_index_id}`;
  const options = {
    method: "GET",
    headers: {
      Authorization: `Basic ${process.env.UPSTASH_MANAGEMENT_API_KEY}`,
    },
  };

  const upstashResponse = await fetch(url, options);
  const vectorConfig = (await upstashResponse.json()) as {
    id: string;
    endpoint: string;
    token: string;
  };

  const vector = new VectorIndex({
    url: `https://${vectorConfig.endpoint}`,
    token: vectorConfig.token,
  });

  const results = await vector.query({
    data: query,
    topK: 10,
    includeData: true,
    includeMetadata: true,
  });

  return new Response(
    JSON.stringify({
      query,
      results,
    }),
  );
}

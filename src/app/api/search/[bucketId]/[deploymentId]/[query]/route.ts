import { getVectorIndex, invalidateVectorCache } from "@/lib/vector";

export const preferredRegion = "iad1";

export const revalidate = false;

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ bucketId: string; deploymentId: string; query: string }>;
  },
) {
  try {
    const { deploymentId, query } = await params;

    const vector = await getVectorIndex(deploymentId);

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
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Search API error:", error);

    if (error instanceof Error) {
      if (error.message.includes("ENCRYPTION_SECRET")) {
        return new Response(
          JSON.stringify({ error: "Server configuration error" }),
          { status: 500 },
        );
      }

      if (error.message.includes("Invalid encrypted data")) {
        const deploymentId = new URL(request.url).searchParams.get(
          "deploymentId",
        );
        if (deploymentId) {
          await invalidateVectorCache(deploymentId);
        }
        return new Response(
          JSON.stringify({ error: "Cache corrupted, please retry" }),
          { status: 500 },
        );
      }

      if (error.message.includes("not found")) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 404,
        });
      }
    }

    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
}

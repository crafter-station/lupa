import { getVectorIndex, invalidateVectorCache } from "@/lib/vector";

export const preferredRegion = "iad1";

export const revalidate = false;

export const dynamic = "force-static";

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ projectId: string; deploymentId: string; query: string }>;
  },
) {
  try {
    const { deploymentId, query } = await params;
    const decodedQuery = decodeURIComponent(query);

    const vector = await getVectorIndex(deploymentId);

    const results = await vector.query({
      data: decodedQuery,
      topK: 5,
      includeData: true,
      includeMetadata: true,
    });

    return new Response(
      JSON.stringify({
        query: decodedQuery,
        results,
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Search API error:", error);
    const { deploymentId } = await params;

    let statusCode = 500;
    let errorMessage = "Internal server error";

    if (error instanceof Error) {
      if (error.message.includes("ENCRYPTION_SECRET")) {
        errorMessage = "Server configuration error";
        statusCode = 500;
      } else if (error.message.includes("Invalid encrypted data")) {
        await invalidateVectorCache(deploymentId);
        errorMessage = "Cache corrupted, please retry";
        statusCode = 500;
      } else if (error.message.includes("not found")) {
        errorMessage = error.message;
        statusCode = 404;
      }
    }

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: statusCode,
    });
  }
}

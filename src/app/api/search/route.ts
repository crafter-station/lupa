import { getVectorIndex, invalidateVectorCache } from "@/lib/vector";

export async function GET(request: Request) {
  try {
    const searchParamsSplit = request.url.split("?");
    if (!searchParamsSplit[1]) {
      return new Response(
        JSON.stringify({ error: "Missing query parameters" }),
        { status: 400 },
      );
    }

    const searchParams = new URLSearchParams(searchParamsSplit[1]);

    const query = searchParams.get("q");
    const deploymentId = searchParams.get("deploymentId");

    if (!query) {
      return new Response(
        JSON.stringify({ error: "Missing query parameter" }),
        { status: 400 },
      );
    }

    if (!deploymentId) {
      return new Response(
        JSON.stringify({ error: "Missing deploymentId parameter" }),
        { status: 400 },
      );
    }

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

import type { NextRequest } from "next/server";
import { getTopEmbeddings } from "@/lib/tinybird-client";

export const preferredRegion = ["iad1"];

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ projectId: string; deploymentId: string }>;
  },
) {
  try {
    const { projectId, deploymentId } = await params;
    const { searchParams } = request.nextUrl;
    const days = Number.parseInt(searchParams.get("days") || "30", 10);
    const limit = Number.parseInt(searchParams.get("limit") || "100", 10);

    const data = await getTopEmbeddings(projectId, deploymentId, days, limit);

    return Response.json({ data });
  } catch (error) {
    console.error("Analytics API error:", error);
    return Response.json(
      { error: "Failed to fetch embeddings" },
      { status: 500 },
    );
  }
}

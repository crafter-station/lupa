import type { NextRequest } from "next/server";
import { getDeploymentOverview } from "@/lib/tinybird-client";

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
    const hours = Number.parseInt(searchParams.get("hours") || "24", 10);

    const data = await getDeploymentOverview(projectId, deploymentId, hours);

    return Response.json({ data });
  } catch (error) {
    console.error("Analytics API error:", error);
    return Response.json(
      { error: "Failed to fetch analytics" },
      { status: 500 },
    );
  }
}

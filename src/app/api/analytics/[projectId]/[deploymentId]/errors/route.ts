import type { NextRequest } from "next/server";
import { getErrors } from "@/lib/tinybird-client";

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

    const data = await getErrors(projectId, deploymentId, days);

    return Response.json({ data });
  } catch (error) {
    console.error("Analytics API error:", error);
    return Response.json({ error: "Failed to fetch errors" }, { status: 500 });
  }
}

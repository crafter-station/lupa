import type { NextRequest } from "next/server";
import { getProjectOverview } from "@/lib/tinybird-client";

export async function GET(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ projectId: string }>;
  },
) {
  try {
    const { projectId } = await params;
    const { searchParams } = request.nextUrl;
    const hours = Number.parseInt(searchParams.get("hours") || "24", 10);

    const data = await getProjectOverview(projectId, hours);

    return Response.json({ data });
  } catch (error) {
    console.error("Analytics API error:", error);
    return Response.json(
      { error: "Failed to fetch analytics" },
      { status: 500 },
    );
  }
}

import type { NextRequest } from "next/server";
import { getProjectTimeseries } from "@/lib/tinybird-client";

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
    const hours = Number.parseInt(searchParams.get("hours") || "168", 10);
    const granularity = (searchParams.get("granularity") || "1h") as
      | "5m"
      | "1h"
      | "1d";

    const data = await getProjectTimeseries(projectId, hours, granularity);

    return Response.json({ data });
  } catch (error) {
    console.error("Analytics API error:", error);
    return Response.json(
      { error: "Failed to fetch timeseries" },
      { status: 500 },
    );
  }
}

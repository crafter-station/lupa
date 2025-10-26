import { type NextRequest, NextResponse } from "next/server";
import { generateInternalToken } from "@/lib/crypto/internal-token";
import { getAPIBaseURL } from "@/lib/utils";

export const POST = async (req: NextRequest) => {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("query");
  const projectId = searchParams.get("projectId");
  const deploymentId = searchParams.get("deploymentId");

  if (!projectId) {
    return NextResponse.json(
      { error: "Project ID is required" },
      { status: 400 },
    );
  }

  if (!deploymentId) {
    return NextResponse.json(
      { error: "Deployment ID is required" },
      { status: 400 },
    );
  }

  if (!query) {
    return NextResponse.json({ error: "Query is required" }, { status: 400 });
  }

  const internalToken = generateInternalToken(projectId);

  const response = await fetch(
    `${getAPIBaseURL(projectId)}/search/?query=${encodeURIComponent(query)}`,
    {
      headers: {
        "Deployment-Id": deploymentId,
        "X-Internal-Token": internalToken,
      },
    },
  );

  try {
    const data = await response.json();

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
};

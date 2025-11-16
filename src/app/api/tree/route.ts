import type { NextRequest } from "next/server";
import { z } from "zod/v3";
import { handleApiError } from "@/lib/api-error";
import { extractSessionOrg, proxyToPublicAPI } from "@/lib/api-proxy";
import { IdSchema } from "@/lib/generate-id";

export const preferredRegion = ["iad1"];

export async function POST(req: NextRequest) {
  try {
    await extractSessionOrg();

    const json = await req.json();

    const { projectId, deploymentId, path, depth } = z
      .object({
        projectId: IdSchema,
        deploymentId: IdSchema,
        path: z.string().default("/"),
        depth: z.string().default("0"),
      })
      .parse(json);

    return await proxyToPublicAPI(
      projectId,
      `/tree/?folder=${encodeURIComponent(path)}&depth=${encodeURIComponent(depth)}`,
      {
        method: "GET",
        headers: {
          "Deployment-Id": deploymentId,
        },
      },
    );
  } catch (error) {
    return handleApiError(error);
  }
}

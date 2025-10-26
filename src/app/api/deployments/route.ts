import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { type NextRequest, NextResponse } from "next/server";
import z from "zod/v3";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { generateInternalToken } from "@/lib/crypto/internal-token";
import { IdSchema } from "@/lib/generate-id";
import { getAPIBaseURL } from "@/lib/utils";

export const POST = async (req: NextRequest) => {
  try {
    const session = await auth();
    const orgId = session.orgId;

    if (!orgId) {
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 400 },
      );
    }

    const body = await req.json();

    const { projectId, deploymentId } = z
      .object({
        projectId: IdSchema,
        deploymentId: IdSchema,
      })
      .parse(body);

    const [project] = await db
      .select()
      .from(schema.Project)
      .where(
        and(eq(schema.Project.id, projectId), eq(schema.Project.org_id, orgId)),
      );

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 400 });
    }

    const internalToken = generateInternalToken(projectId);

    const response = await fetch(`${getAPIBaseURL(projectId)}/deployments`, {
      method: "POST",
      body: JSON.stringify({ deploymentId }),
      headers: {
        "Content-Type": "application/json",
        "X-Internal-Token": internalToken,
      },
    });

    try {
      const data = await response.json();

      return NextResponse.json(data, { status: response.status });
    } catch (error) {
      console.log(error);
      return NextResponse.json({ error: "Search failed" }, { status: 500 });
    }
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error: "Unknown error",
      },
      { status: 500 },
    );
  }
};

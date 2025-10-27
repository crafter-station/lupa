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

    const contentType = req.headers.get("content-type") || "";
    const isFormData = contentType.includes("multipart/form-data");

    let projectId: string;
    let type: "website" | "upload";
    let body: BodyInit;

    if (isFormData) {
      const formData = await req.formData();
      projectId = z.string().parse(formData.get("projectId"));
      type = z.enum(["website", "upload"]).parse(formData.get("type"));

      const newFormData = new FormData();
      for (const [key, value] of formData.entries()) {
        if (key !== "projectId" && key !== "type") {
          newFormData.append(key, value);
        }
      }
      body = newFormData;
    } else {
      const json = await req.json();
      projectId = IdSchema.parse(json.projectId);
      type = z.enum(["website", "upload"]).parse(json.type);

      const { projectId: _projectId, type: _type, ...cleanJson } = json;
      body = JSON.stringify(cleanJson);
    }

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

    const headers: HeadersInit = {
      "X-Internal-Token": internalToken,
    };

    if (!isFormData) {
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(
      `${getAPIBaseURL(projectId)}/snapshots?type=${type}`,
      {
        method: "POST",
        body,
        headers,
      },
    );

    try {
      const data = await response.json();

      return NextResponse.json(data, { status: response.status });
    } catch (error) {
      console.log(error);
      return NextResponse.json(
        { error: "Snapshot creation failed" },
        { status: 500 },
      );
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

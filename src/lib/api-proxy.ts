import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import type { ZodSchema } from "zod/v3";
import { db } from "@/db";
import * as schema from "@/db/schema";
import type { ApiErrorResponse } from "./api-error";
import { ApiError, ErrorCode, handleApiError } from "./api-error";
import { generateInternalToken } from "./crypto/internal-token";
import { getAPIBaseURL } from "./utils";

export interface ProxyOptions {
  method?: string;
  body?: BodyInit;
  headers?: Record<string, string>;
  deploymentId?: string;
}

export async function proxyToPublicAPI<T = unknown>(
  projectId: string,
  endpoint: string,
  options: ProxyOptions = {},
  responseSchema?: ZodSchema<T>,
): Promise<NextResponse<T | ApiErrorResponse>> {
  try {
    const internalToken = generateInternalToken(projectId);

    const headers: HeadersInit = {
      "X-Internal-Token": internalToken,
      ...options.headers,
    };

    if (options.deploymentId) {
      headers["Deployment-Id"] = options.deploymentId;
    }

    console.log({ hello: "freidnsscs" });

    const response = await fetch(`${getAPIBaseURL(projectId)}${endpoint}`, {
      method: options.method || "GET",
      headers,
      body: options.body,
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    if (responseSchema) {
      const validated = responseSchema.parse(data);
      return NextResponse.json(validated, { status: response.status });
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function validateProjectOwnership(
  projectId: string,
  orgId: string,
) {
  const [project] = await db
    .select()
    .from(schema.Project)
    .where(
      and(eq(schema.Project.id, projectId), eq(schema.Project.org_id, orgId)),
    );

  if (!project) {
    throw new ApiError(ErrorCode.PROJECT_NOT_FOUND, "Project not found", 404);
  }

  return project;
}

export async function extractSessionOrgId() {
  const session = await auth();
  const orgId = session.orgId;

  if (!orgId) {
    throw new ApiError(
      ErrorCode.ORGANIZATION_NOT_FOUND,
      "Organization not found",
      400,
    );
  }

  return orgId;
}

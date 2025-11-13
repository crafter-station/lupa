import type { NextRequest } from "next/server";
import z from "zod/v3";
import { handleApiError } from "@/lib/api-error";
import {
  extractSessionOrg,
  proxyToPublicAPI,
  validateProjectOwnership,
} from "@/lib/api-proxy";
import { IdSchema } from "@/lib/generate-id";

export const preferredRegion = ["iad1"];

export const POST = async (req: NextRequest) => {
  try {
    const { orgId } = await extractSessionOrg();

    const contentType = req.headers.get("content-type") || "";
    const isFormData = contentType.includes("multipart/form-data");

    let projectId: string;
    let type: "website" | "upload";
    let body: BodyInit;

    if (isFormData) {
      const formData = await req.formData();
      projectId = z.string().parse(formData.get("project_id"));
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
      projectId = IdSchema.parse(json.project_id);
      type = z.enum(["website", "upload"]).parse(json.type);

      const { projectId: _projectId, type: _type, ...cleanJson } = json;
      body = JSON.stringify(cleanJson);
    }

    await validateProjectOwnership(projectId, orgId);

    const headers: Record<string, string> = {};

    if (!isFormData) {
      headers["Content-Type"] = "application/json";
    }

    return await proxyToPublicAPI(projectId, `/snapshots?type=${type}`, {
      method: "POST",
      body,
      headers,
    });
  } catch (error) {
    return handleApiError(error);
  }
};

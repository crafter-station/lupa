"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import z from "zod/v3";
import { db } from "@/db";
import * as schema from "@/db/schema";

type UpdateDeploymentNameActionState = {
  form_data: {
    projectId: string;
    deploymentId: string;
    name: string;
  };
} & (
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
    }
);

export const UpdateDeploymentNameAction = async (
  _state: UpdateDeploymentNameActionState,
  formData: FormData,
): Promise<UpdateDeploymentNameActionState> => {
  try {
    const { projectId, deploymentId, name } = z
      .object({
        projectId: z.string(),
        deploymentId: z.string(),
        name: z.preprocess(
          (value) =>
            typeof value === "string" && value.trim().length
              ? value.trim()
              : undefined,
          z.string().min(1, "Name cannot be empty"),
        ),
      })
      .parse(Object.fromEntries(formData));

    const session = await auth();

    if (!session.orgId || !session.orgSlug) {
      throw new Error("User is not a member of any organization");
    }

    const project = await db.query.Project.findFirst({
      where: (projects, { eq }) => eq(projects.id, projectId),
    });

    if (!project) {
      throw new Error("Project not found");
    }

    if (project.org_id !== session.orgId) {
      throw new Error("Unauthorized");
    }

    const deployment = await db.query.Deployment.findFirst({
      where: and(
        eq(schema.Deployment.id, deploymentId),
        eq(schema.Deployment.project_id, projectId),
      ),
    });

    if (!deployment) {
      throw new Error("Deployment not found");
    }

    await db
      .update(schema.Deployment)
      .set({
        name,
        updated_at: new Date().toISOString(),
      })
      .where(eq(schema.Deployment.id, deploymentId));

    revalidatePath(
      `/orgs/${session.orgSlug}/projects/${projectId}/deployments`,
    );
    revalidatePath(
      `/orgs/${session.orgSlug}/projects/${projectId}/deployments/${deploymentId}`,
    );

    return {
      ok: true,
      form_data: {
        projectId,
        deploymentId,
        name,
      },
    };
  } catch (error) {
    console.error(error);

    return {
      ok: false,
      error: error instanceof Error ? error.message : "Unknown error",
      form_data: {
        projectId: formData.get("projectId")?.toString() || "",
        deploymentId: formData.get("deploymentId")?.toString() || "",
        name: formData.get("name")?.toString() || "",
      },
    };
  }
};

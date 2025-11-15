"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import z from "zod/v3";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { generateDeploymentName } from "@/lib/deployment-name";
import { generateId } from "@/lib/generate-id";
import { deploy } from "@/trigger/deploy.task";

type CreateDeploymentActionState = {
  form_data: {
    projectId: string;
    name?: string | undefined;
  };
} & (
  | {
      ok: true;
      action_data: {
        url: string;
      };
    }
  | {
      ok: false;
      error: string;
    }
);

export const CreateDeploymentAction = async (
  _state: CreateDeploymentActionState,
  formData: FormData,
): Promise<CreateDeploymentActionState> => {
  try {
    const { projectId, name } = z
      .object({
        projectId: z.string(),
        name: z.preprocess(
          (value) =>
            typeof value === "string"
              ? value.trim()?.length
                ? value.trim()
                : undefined
              : undefined,
          z.string().optional(),
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

    const deploymentId = generateId();
    const deploymentName = name || generateDeploymentName();

    await db.insert(schema.Deployment).values({
      id: deploymentId,
      org_id: session.orgId,
      project_id: projectId,
      name: deploymentName,
      status: "queued",
      environment: null,
    });

    await deploy.trigger({
      deploymentId: deploymentId,
    });

    revalidatePath(
      `/orgs/${session.orgSlug}/projects/${projectId}/deployments`,
    );
    revalidatePath(
      `/orgs/${session.orgSlug}/projects/${projectId}/deployments/${deploymentId}`,
    );

    return {
      ok: true,
      action_data: {
        url: `/orgs/${session.orgSlug}/projects/${projectId}/deployments/${deploymentId}`,
      },
      form_data: {
        projectId,
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
        name: formData.get("name")?.toString(),
      },
    };
  }
};

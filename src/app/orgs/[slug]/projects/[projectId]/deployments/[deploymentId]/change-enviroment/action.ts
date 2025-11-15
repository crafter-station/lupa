"use server";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import z from "zod/v3";
import { db } from "@/db";

import * as schema from "@/db/schema";
import { getVectorIndex } from "@/lib/crypto/vector";

type UpdateDeploymentEnvironmentActionState = {
  form_data: {
    projectId: string;
    deploymentId: string;
    environment: "production" | "staging" | null;
  };
} & (
  | {
      ok: true;
      action_data: {
        message: string;
      };
    }
  | {
      ok: false;
      error: string;
    }
);

const FormDataSchema = z.object({
  projectId: z.string(),
  deploymentId: z.string(),
  environment: z
    .enum(["production", "staging", "null"])
    .transform((val) => (val === "null" ? null : val)),
});

function validateEnvironmentTransition(
  currentEnv: "production" | "staging" | null,
  targetEnv: "production" | "staging" | null,
): { valid: boolean; error?: string } {
  if (currentEnv === targetEnv) {
    return { valid: true };
  }

  const validTransitions: Array<[typeof currentEnv, typeof targetEnv]> = [
    [null, "staging"],
    ["staging", "production"],
    ["staging", null],
    ["production", "staging"],
    ["production", null],
  ];

  const isValid = validTransitions.some(
    ([from, to]) => from === currentEnv && to === targetEnv,
  );

  if (!isValid) {
    if (currentEnv === null && targetEnv === "production") {
      return {
        valid: false,
        error:
          "Cannot promote directly to production. Promote to staging first.",
      };
    }
    return {
      valid: false,
      error: `Invalid transition from ${currentEnv ?? "null"} to ${targetEnv ?? "null"}`,
    };
  }

  return { valid: true };
}

export const UpdateDeploymentEnvironmentAction = async (
  _state: UpdateDeploymentEnvironmentActionState,
  formData: FormData,
): Promise<UpdateDeploymentEnvironmentActionState> => {
  try {
    const { projectId, deploymentId, environment } = FormDataSchema.parse(
      Object.fromEntries(formData),
    );

    const session = await auth.protect();

    if (!session.orgId || !session.orgSlug) {
      throw new Error("User is not a member of any organization");
    }

    const project = await db.query.Project.findFirst({
      where: and(
        eq(schema.Project.id, projectId),
        eq(schema.Project.org_id, session.orgId),
      ),
    });

    if (!project) {
      throw new Error("Project not found or access denied");
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

    if (deployment.status !== "ready" && environment !== null) {
      throw new Error("Deployment must be ready to change environment");
    }

    const validation = validateEnvironmentTransition(
      deployment.environment,
      environment,
    );

    if (!validation.valid) {
      throw new Error(validation.error);
    }

    let demotedDeploymentId: string | null = null;

    if (environment !== null) {
      const existingDeployment = await db.query.Deployment.findFirst({
        where: and(
          eq(schema.Deployment.project_id, projectId),
          eq(schema.Deployment.environment, environment),
        ),
      });

      if (existingDeployment) {
        demotedDeploymentId = existingDeployment.id;
      }

      await db
        .update(schema.Deployment)
        .set({
          environment: null,
          updated_at: new Date().toISOString(),
        })
        .where(
          and(
            eq(schema.Deployment.project_id, projectId),
            eq(schema.Deployment.environment, environment),
          ),
        );
    }

    await db
      .update(schema.Deployment)
      .set({
        environment,
        updated_at: new Date().toISOString(),
      })
      .where(eq(schema.Deployment.id, deploymentId));

    if (environment === "production") {
      await db
        .update(schema.Project)
        .set({
          production_deployment_id: deploymentId,
          updated_at: new Date().toISOString(),
        })
        .where(eq(schema.Project.id, projectId));
    } else if (environment === "staging") {
      await db
        .update(schema.Project)
        .set({
          staging_deployment_id: deploymentId,
          updated_at: new Date().toISOString(),
        })
        .where(eq(schema.Project.id, projectId));
    } else {
      if (deployment.environment === "production") {
        await db
          .update(schema.Project)
          .set({
            production_deployment_id: null,
            updated_at: new Date().toISOString(),
          })
          .where(eq(schema.Project.id, projectId));
      } else if (deployment.environment === "staging") {
        await db
          .update(schema.Project)
          .set({
            staging_deployment_id: null,
            updated_at: new Date().toISOString(),
          })
          .where(eq(schema.Project.id, projectId));
      }
    }

    getVectorIndex(projectId).catch((error) => {
      console.error("Failed to preload vector config:", error);
    });

    const message =
      environment === "production"
        ? "Successfully promoted to production!"
        : environment === "staging"
          ? "Successfully promoted to staging!"
          : "Successfully demoted!";

    revalidatePath(
      `/orgs/${session.orgSlug}/projects/${projectId}/deployments`,
    );
    revalidatePath(
      `/orgs/${session.orgSlug}/projects/${projectId}/deployments/${deploymentId}`,
    );

    if (demotedDeploymentId) {
      revalidatePath(
        `/orgs/${session.orgSlug}/projects/${projectId}/deployments/${demotedDeploymentId}`,
      );
    }

    return {
      ok: true,
      action_data: {
        message,
      },
      form_data: {
        projectId,
        deploymentId,
        environment,
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
        environment:
          formData.get("environment")?.toString() === "null"
            ? null
            : (formData.get("environment")?.toString() as
                | "production"
                | "staging"),
      },
    };
  }
};

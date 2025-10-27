import { Pool } from "@neondatabase/serverless";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import { db } from "@/db";
import {
  invalidateDeploymentInfo,
  invalidateProductionDeployment,
  invalidateStagingDeployment,
  setProductionDeploymentId,
  setStagingDeploymentId,
} from "@/db/redis";
import * as schema from "@/db/schema";

export async function promoteDeploymentToProduction(
  projectId: string,
  deploymentId: string,
): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL?.replace("-pooler", ""),
  });

  const db = drizzle({
    client: pool,
    schema,
  });

  await db.transaction(async (tx) => {
    const deployment = await tx.query.Deployment.findFirst({
      where: and(
        eq(schema.Deployment.id, deploymentId),
        eq(schema.Deployment.project_id, projectId),
        eq(schema.Deployment.status, "ready"),
      ),
    });

    if (!deployment) {
      throw new Error("Deployment not found or not ready");
    }

    await tx
      .update(schema.Deployment)
      .set({
        environment: "staging",
        updated_at: new Date().toISOString(),
      })
      .where(
        and(
          eq(schema.Deployment.project_id, projectId),
          eq(schema.Deployment.environment, "production"),
        ),
      );

    await tx
      .update(schema.Deployment)
      .set({
        environment: "production",
        updated_at: new Date().toISOString(),
      })
      .where(eq(schema.Deployment.id, deploymentId));

    await tx
      .update(schema.Project)
      .set({
        production_deployment_id: deploymentId,
        updated_at: new Date().toISOString(),
      })
      .where(eq(schema.Project.id, projectId));
  });

  await pool.end();

  await Promise.all([
    invalidateProductionDeployment(projectId),
    setProductionDeploymentId(projectId, deploymentId),
  ]);
}

export async function promoteDeploymentToStaging(
  projectId: string,
  deploymentId: string,
): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL?.replace("-pooler", ""),
  });

  const db = drizzle({
    client: pool,
    schema,
  });

  await db.transaction(async (tx) => {
    const deployment = await tx.query.Deployment.findFirst({
      where: and(
        eq(schema.Deployment.id, deploymentId),
        eq(schema.Deployment.project_id, projectId),
        eq(schema.Deployment.status, "ready"),
      ),
    });

    if (!deployment) {
      throw new Error("Deployment not found or not ready");
    }

    await tx
      .update(schema.Deployment)
      .set({
        environment: null,
        updated_at: new Date().toISOString(),
      })
      .where(
        and(
          eq(schema.Deployment.project_id, projectId),
          eq(schema.Deployment.environment, "staging"),
        ),
      );

    await tx
      .update(schema.Deployment)
      .set({
        environment: "staging",
        updated_at: new Date().toISOString(),
      })
      .where(eq(schema.Deployment.id, deploymentId));

    await tx
      .update(schema.Project)
      .set({
        staging_deployment_id: deploymentId,
        updated_at: new Date().toISOString(),
      })
      .where(eq(schema.Project.id, projectId));
  });

  await pool.end();

  await Promise.all([
    invalidateStagingDeployment(projectId),
    setStagingDeploymentId(projectId, deploymentId),
  ]);
}

export async function demoteDeploymentFromProduction(
  projectId: string,
  deploymentId: string,
): Promise<void> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL?.replace("-pooler", ""),
  });

  const db = drizzle({
    client: pool,
    schema,
  });

  await db.transaction(async (tx) => {
    const deployment = await tx.query.Deployment.findFirst({
      where: and(
        eq(schema.Deployment.id, deploymentId),
        eq(schema.Deployment.project_id, projectId),
        eq(schema.Deployment.environment, "production"),
      ),
    });

    if (!deployment) {
      throw new Error("Deployment not found or not in production");
    }

    await tx
      .update(schema.Deployment)
      .set({
        environment: "staging",
        updated_at: new Date().toISOString(),
      })
      .where(eq(schema.Deployment.id, deploymentId));

    await tx
      .update(schema.Project)
      .set({
        production_deployment_id: null,
        updated_at: new Date().toISOString(),
      })
      .where(eq(schema.Project.id, projectId));
  });

  await pool.end();

  await Promise.all([
    invalidateProductionDeployment(projectId),
    invalidateDeploymentInfo(deploymentId),
  ]);
}

export async function updateDeploymentEnvironment(
  projectId: string,
  deploymentId: string,
  environment: "production" | "staging",
): Promise<void> {
  if (environment === "production") {
    await promoteDeploymentToProduction(projectId, deploymentId);
  } else if (environment === "staging") {
    await promoteDeploymentToStaging(projectId, deploymentId);
  }
}

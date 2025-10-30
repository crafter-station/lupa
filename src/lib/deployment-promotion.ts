import { Pool } from "@neondatabase/serverless";
import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-serverless";
import {
  invalidateDeploymentInfo,
  invalidateProductionDeployment,
  invalidateProjectContext,
  invalidateStagingDeployment,
  setProductionDeploymentId,
  setStagingDeploymentId,
} from "@/db/redis";
import * as schema from "@/db/schema";

export { generateDeploymentName } from "./deployment-name";

export function validateEnvironmentTransition(
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

export async function updateDeploymentName(
  projectId: string,
  deploymentId: string,
  name: string,
): Promise<{ txid: string }> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL.replace("-pooler", ""),
  });

  try {
    const db = drizzle({ client: pool, schema });

    const result = await db.transaction(async (tx) => {
      const txidResult = await tx.execute(
        sql`SELECT pg_current_xact_id()::xid::text as txid`,
      );

      const deployment = await tx.query.Deployment.findFirst({
        where: and(
          eq(schema.Deployment.id, deploymentId),
          eq(schema.Deployment.project_id, projectId),
        ),
      });

      if (!deployment) {
        throw new Error("Deployment not found");
      }

      await tx
        .update(schema.Deployment)
        .set({
          name,
          updated_at: new Date().toISOString(),
        })
        .where(eq(schema.Deployment.id, deploymentId));

      if (!txidResult.rows[0]?.txid) {
        throw new Error("Failed to get transaction ID");
      }

      return { txid: txidResult.rows[0].txid as string };
    });

    return result;
  } finally {
    await pool.end();
  }
}

export async function updateDeploymentEnvironmentWithValidation(
  projectId: string,
  deploymentId: string,
  targetEnvironment: "production" | "staging" | null,
): Promise<{ txid: string }> {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL.replace("-pooler", ""),
  });

  try {
    const db = drizzle({ client: pool, schema });

    const result = await db.transaction(async (tx) => {
      const deployment = await tx.query.Deployment.findFirst({
        where: and(
          eq(schema.Deployment.id, deploymentId),
          eq(schema.Deployment.project_id, projectId),
        ),
      });

      if (!deployment) {
        throw new Error("Deployment not found");
      }

      if (deployment.status !== "ready" && targetEnvironment !== null) {
        throw new Error("Deployment must be ready to change environment");
      }

      const validation = validateEnvironmentTransition(
        deployment.environment,
        targetEnvironment,
      );

      if (!validation.valid) {
        throw new Error(validation.error);
      }

      if (targetEnvironment !== null) {
        await tx
          .update(schema.Deployment)
          .set({
            environment: null,
            updated_at: new Date().toISOString(),
          })
          .where(
            and(
              eq(schema.Deployment.project_id, projectId),
              eq(schema.Deployment.environment, targetEnvironment),
            ),
          );
      }

      await tx
        .update(schema.Deployment)
        .set({
          environment: targetEnvironment,
          updated_at: new Date().toISOString(),
        })
        .where(eq(schema.Deployment.id, deploymentId));

      if (targetEnvironment === "production") {
        await tx
          .update(schema.Project)
          .set({
            production_deployment_id: deploymentId,
            updated_at: new Date().toISOString(),
          })
          .where(eq(schema.Project.id, projectId));
      } else if (targetEnvironment === "staging") {
        await tx
          .update(schema.Project)
          .set({
            staging_deployment_id: deploymentId,
            updated_at: new Date().toISOString(),
          })
          .where(eq(schema.Project.id, projectId));
      } else {
        if (deployment.environment === "production") {
          await tx
            .update(schema.Project)
            .set({
              production_deployment_id: null,
              updated_at: new Date().toISOString(),
            })
            .where(eq(schema.Project.id, projectId));
        } else if (deployment.environment === "staging") {
          await tx
            .update(schema.Project)
            .set({
              staging_deployment_id: null,
              updated_at: new Date().toISOString(),
            })
            .where(eq(schema.Project.id, projectId));
        }
      }

      const txidResult = await tx.execute(
        sql`SELECT pg_current_xact_id()::xid::text as txid`,
      );

      if (!txidResult.rows[0]?.txid) {
        throw new Error("Failed to get transaction ID");
      }

      return { txid: txidResult.rows[0].txid as string };
    });

    await Promise.all([
      invalidateProductionDeployment(projectId),
      invalidateStagingDeployment(projectId),
      invalidateDeploymentInfo(deploymentId),
      invalidateProjectContext(projectId),
    ]);

    if (targetEnvironment === "production") {
      await setProductionDeploymentId(projectId, deploymentId);
    } else if (targetEnvironment === "staging") {
      await setStagingDeploymentId(projectId, deploymentId);
    }

    const { getVectorIndex } = await import("./crypto/vector");
    getVectorIndex(projectId, { skipCache: true }).catch((error) => {
      console.error("Failed to preload vector config:", error);
    });

    return result;
  } finally {
    await pool.end();
  }
}

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
    invalidateProjectContext(projectId),
  ]);

  const { getVectorIndex } = await import("./crypto/vector");
  getVectorIndex(projectId, { skipCache: true }).catch((error) => {
    console.error("Failed to preload vector config:", error);
  });
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
    invalidateProjectContext(projectId),
  ]);

  const { getVectorIndex } = await import("./crypto/vector");
  getVectorIndex(projectId, { skipCache: true }).catch((error) => {
    console.error("Failed to preload vector config:", error);
  });
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
        eq(schema.Deployment.status, "ready"),
      ),
    });

    if (!deployment) {
      throw new Error("Deployment not found or not ready");
    }

    if (deployment.environment !== "staging") {
      throw new Error("Only staging deployments can be promoted to production");
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

export async function setDeploymentEnvironment(
  projectId: string,
  deploymentId: string,
  targetEnvironment: "production" | "staging" | null,
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
      ),
    });

    if (!deployment) {
      throw new Error("Deployment not found");
    }

    if (targetEnvironment !== null) {
      await tx
        .update(schema.Deployment)
        .set({
          environment: null,
          updated_at: new Date().toISOString(),
        })
        .where(
          and(
            eq(schema.Deployment.project_id, projectId),
            eq(schema.Deployment.environment, targetEnvironment),
          ),
        );
    }

    await tx
      .update(schema.Deployment)
      .set({
        environment: targetEnvironment,
        updated_at: new Date().toISOString(),
      })
      .where(eq(schema.Deployment.id, deploymentId));

    if (targetEnvironment === "production") {
      await tx
        .update(schema.Project)
        .set({
          production_deployment_id: deploymentId,
          updated_at: new Date().toISOString(),
        })
        .where(eq(schema.Project.id, projectId));
    } else if (targetEnvironment === "staging") {
      await tx
        .update(schema.Project)
        .set({
          staging_deployment_id: deploymentId,
          updated_at: new Date().toISOString(),
        })
        .where(eq(schema.Project.id, projectId));
    } else {
      if (deployment.environment === "production") {
        await tx
          .update(schema.Project)
          .set({
            production_deployment_id: null,
            updated_at: new Date().toISOString(),
          })
          .where(eq(schema.Project.id, projectId));
      } else if (deployment.environment === "staging") {
        await tx
          .update(schema.Project)
          .set({
            staging_deployment_id: null,
            updated_at: new Date().toISOString(),
          })
          .where(eq(schema.Project.id, projectId));
      }
    }
  });

  await pool.end();

  await Promise.all([
    invalidateProductionDeployment(projectId),
    invalidateStagingDeployment(projectId),
    invalidateDeploymentInfo(deploymentId),
    invalidateProjectContext(projectId),
  ]);

  if (targetEnvironment === "production") {
    await setProductionDeploymentId(projectId, deploymentId);
  } else if (targetEnvironment === "staging") {
    await setStagingDeploymentId(projectId, deploymentId);
  }

  const { getVectorIndex } = await import("./crypto/vector");
  getVectorIndex(projectId, { skipCache: true }).catch((error) => {
    console.error("Failed to preload vector config:", error);
  });
}

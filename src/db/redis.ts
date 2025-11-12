import { Redis } from "@upstash/redis";
import { and, eq } from "drizzle-orm";
import { db } from ".";

export const redis = Redis.fromEnv();

interface ProjectInfo {
  org_id: string;
  name: string;
}

interface DeploymentInfo {
  projectId: string;
  environment?: string | null;
  status?: string;
  vectorIndexId?: string;
}

export async function getProductionDeploymentId(
  projectId: string,
): Promise<string | null> {
  return await redis.get<string>(`project:${projectId}:production_deployment`);
}

export async function setProductionDeploymentId(
  projectId: string,
  deploymentId: string,
): Promise<void> {
  await redis.set(`project:${projectId}:production_deployment`, deploymentId, {
    ex: 3600,
  });
}

export async function invalidateProductionDeployment(
  projectId: string,
): Promise<void> {
  await redis.del(`project:${projectId}:production_deployment`);
}

export async function getProjectInfo(
  projectId: string,
): Promise<ProjectInfo | null> {
  return await redis.get<ProjectInfo>(`project:${projectId}:exists`);
}

export async function setProjectInfo(
  projectId: string,
  info: ProjectInfo,
): Promise<void> {
  await redis.set(`project:${projectId}:exists`, JSON.stringify(info), {
    ex: 1800,
  });
}

export async function validateDeploymentOwnership(
  projectId: string,
  deploymentId: string,
): Promise<boolean> {
  const cachedProjectId = await redis.get<string>(
    `deployment:${deploymentId}:project`,
  );
  if (cachedProjectId === null) return false;
  if (cachedProjectId !== projectId) return false;
  return true;
}

export async function cacheDeploymentInfo(
  deploymentId: string,
  info: DeploymentInfo,
): Promise<void> {
  await redis.set(`deployment:${deploymentId}:project`, info.projectId, {
    ex: 3600,
  });
  if (info.environment && info.status) {
    await redis.set(`deployment:${deploymentId}:info`, JSON.stringify(info), {
      ex: 600,
    });
  }
}

export async function invalidateDeploymentInfo(
  deploymentId: string,
): Promise<void> {
  await redis.del(`deployment:${deploymentId}:project`);
  await redis.del(`deployment:${deploymentId}:info`);
}

export async function getStagingDeploymentId(
  projectId: string,
): Promise<string | null> {
  return await redis.get<string>(`project:${projectId}:staging_deployment`);
}

export async function setStagingDeploymentId(
  projectId: string,
  deploymentId: string,
): Promise<void> {
  await redis.set(`project:${projectId}:staging_deployment`, deploymentId, {
    ex: 3600,
  });
}

export async function invalidateStagingDeployment(
  projectId: string,
): Promise<void> {
  await redis.del(`project:${projectId}:staging_deployment`);
}

export interface ProjectContext {
  project: {
    id: string;
    org_id: string;
    name: string;
  };
  deployments: {
    production: {
      id: string;
      status: string;
      environment: "production";
    } | null;
    staging: {
      id: string;
      status: string;
      environment: "staging";
    } | null;
  };
}

export async function getProjectContext(
  projectId: string,
): Promise<ProjectContext | null> {
  const cacheKey = `project:${projectId}:context`;

  const cached = await redis.get<ProjectContext>(cacheKey);
  if (cached) return cached;

  const { Project, Deployment } = await import("./schema");

  const result = await db
    .select({
      project_id: Project.id,
      project_org_id: Project.org_id,
      project_name: Project.name,
    })
    .from(Project)
    .where(eq(Project.id, projectId))
    .limit(1);

  if (!result[0]) return null;

  const deployments = await db
    .select({
      id: Deployment.id,
      environment: Deployment.environment,
      status: Deployment.status,
    })
    .from(Deployment)
    .where(
      and(eq(Deployment.project_id, projectId), eq(Deployment.status, "ready")),
    )
    .limit(2);

  const context: ProjectContext = {
    project: {
      id: result[0].project_id,
      org_id: result[0].project_org_id,
      name: result[0].project_name,
    },
    deployments: {
      production: (() => {
        const dep = deployments.find((d) => d.environment === "production");
        return dep
          ? {
              id: dep.id,
              status: "ready",
              environment: "production" as const,
            }
          : null;
      })(),
      staging: (() => {
        const dep = deployments.find((d) => d.environment === "staging");
        return dep
          ? {
              id: dep.id,
              status: "ready",
              environment: "staging" as const,
            }
          : null;
      })(),
    },
  };

  await redis.set(cacheKey, context, {
    ex: 60 * 60 * 24,
  });

  return context;
}

export async function invalidateProjectContext(
  projectId: string,
): Promise<void> {
  await redis.del(`project:${projectId}:context`);
}

export interface ProjectAndDeploymentCache {
  projectInfo: ProjectInfo | null;
  deploymentId: string | null;
  deploymentProjectId: string | null;
}

export async function getProjectAndDeploymentCache(
  projectId: string,
  deploymentId: string | null,
  environment: "production" | "staging",
): Promise<ProjectAndDeploymentCache> {
  const envKey =
    environment === "production"
      ? `project:${projectId}:production_deployment`
      : `project:${projectId}:staging_deployment`;

  if (deploymentId) {
    const [projectInfo, deploymentProjectId] = await redis
      .pipeline()
      .get<ProjectInfo>(`project:${projectId}:exists`)
      .get<string>(`deployment:${deploymentId}:project`)
      .exec<[ProjectInfo | null, string | null]>();

    return {
      projectInfo,
      deploymentId,
      deploymentProjectId,
    };
  }

  const [projectInfo, cachedDeploymentId] = await redis
    .pipeline()
    .get<ProjectInfo>(`project:${projectId}:exists`)
    .get<string>(envKey)
    .exec<[ProjectInfo | null, string | null]>();

  return {
    projectInfo,
    deploymentId: cachedDeploymentId,
    deploymentProjectId: null,
  };
}

export interface ProjectWithDeployment {
  project: {
    id: string;
    org_id: string;
    name: string;
  };
  deployment: {
    id: string;
    project_id: string;
    environment: string | null;
    status: string | null;
  } | null;
}

export async function getProjectWithDeployment(
  projectId: string,
  deploymentId: string | null,
  environment?: "production" | "staging",
): Promise<ProjectWithDeployment | null> {
  const { Project, Deployment } = await import("./schema");

  if (deploymentId) {
    const result = await db
      .select({
        project_id: Project.id,
        project_org_id: Project.org_id,
        project_name: Project.name,
        deployment_id: Deployment.id,
        deployment_project_id: Deployment.project_id,
        deployment_environment: Deployment.environment,
        deployment_status: Deployment.status,
      })
      .from(Project)
      .leftJoin(Deployment, eq(Deployment.id, deploymentId))
      .where(eq(Project.id, projectId))
      .limit(1);

    if (!result[0]) return null;

    const row = result[0];

    return {
      project: {
        id: row.project_id,
        org_id: row.project_org_id,
        name: row.project_name,
      },
      deployment: row.deployment_id
        ? {
            id: row.deployment_id,
            project_id: row.deployment_project_id || projectId,
            environment: row.deployment_environment,
            status: row.deployment_status,
          }
        : null,
    };
  }

  if (environment) {
    const result = await db
      .select({
        project_id: Project.id,
        project_org_id: Project.org_id,
        project_name: Project.name,
        deployment_id: Deployment.id,
        deployment_project_id: Deployment.project_id,
        deployment_environment: Deployment.environment,
        deployment_status: Deployment.status,
      })
      .from(Project)
      .leftJoin(
        Deployment,
        and(
          eq(Deployment.project_id, Project.id),
          eq(Deployment.environment, environment),
          eq(Deployment.status, "ready"),
        ),
      )
      .where(eq(Project.id, projectId))
      .limit(1);

    if (!result[0]) return null;

    const row = result[0];

    return {
      project: {
        id: row.project_id,
        org_id: row.project_org_id,
        name: row.project_name,
      },
      deployment: row.deployment_id
        ? {
            id: row.deployment_id,
            project_id: row.deployment_project_id || projectId,
            environment: row.deployment_environment,
            status: row.deployment_status,
          }
        : null,
    };
  }

  const result = await db
    .select({
      project_id: Project.id,
      project_org_id: Project.org_id,
      project_name: Project.name,
    })
    .from(Project)
    .where(eq(Project.id, projectId))
    .limit(1);

  if (!result[0]) return null;

  return {
    project: {
      id: result[0].project_id,
      org_id: result[0].project_org_id,
      name: result[0].project_name,
    },
    deployment: null,
  };
}

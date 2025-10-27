import { Redis } from "@upstash/redis";

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

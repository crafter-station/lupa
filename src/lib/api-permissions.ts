import type { ApiKeyEnvironment, ApiKeyType } from "@/db/schema/api-key";
import type { DeploymentEnvironment } from "@/db/schema/deployment";

interface ApiKeyPermissions {
  canRead: boolean;
  canWrite: boolean;
  targetEnvironment: "production" | "staging";
}

export function getApiKeyPermissions(
  keyType: ApiKeyType,
  keyEnvironment: ApiKeyEnvironment,
): ApiKeyPermissions {
  const canWrite = keyType === "sk";
  const targetEnvironment =
    keyEnvironment === "live" ? "production" : "staging";

  return {
    canRead: true,
    canWrite,
    targetEnvironment,
  };
}

export function checkWritePermission(
  keyType: ApiKeyType,
  operation: string,
): { allowed: boolean; error?: string } {
  if (keyType === "pk") {
    return {
      allowed: false,
      error: `Operation '${operation}' requires a secret key (lupa_sk_*). Public keys (lupa_pk_*) are read-only.`,
    };
  }

  return { allowed: true };
}

export function checkEnvironmentAccess(
  keyEnvironment: ApiKeyEnvironment,
  deploymentEnvironment: DeploymentEnvironment,
  deploymentId?: string | null,
): { allowed: boolean; error?: string } {
  if (deploymentId) {
    return { allowed: true };
  }

  const expectedEnv = keyEnvironment === "live" ? "production" : "staging";

  if (deploymentEnvironment !== expectedEnv) {
    return {
      allowed: false,
      error: `Key environment '${keyEnvironment}' cannot access '${deploymentEnvironment}' deployment. Use Deployment-Id header to override.`,
    };
  }

  return { allowed: true };
}

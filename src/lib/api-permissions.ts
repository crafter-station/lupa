import type { ApiKeyEnvironment, ApiKeyType } from "@/db/schema/api-key";
import type { DeploymentEnvironment } from "@/db/schema/deployment";
import { ApiError, ErrorCode } from "./api-error";
import { getApiKeyDataFromRequest } from "./crypto/api-key";
import { verifyInternalToken } from "./crypto/internal-token";

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

/**
 * Helper function to extract projectId from the request.
 * Handles two patterns:
 * 1. Path-based: /api/projects/{projectId}/... (rewritten internal routes)
 * 2. Subdomain-based: {projectId}.localhost:3000 or {projectId}.lupa.build (from Host header)
 */
function extractProjectIdFromPath(request: Request): string | null {
  try {
    // Pattern 1: Try path-based extraction first (rewritten routes)
    const url = new URL(request.url);
    const pathParts = url.pathname.split("/").filter(Boolean);

    const projectsIndex = pathParts.indexOf("projects");
    if (projectsIndex !== -1 && pathParts.length > projectsIndex + 1) {
      return pathParts[projectsIndex + 1];
    }

    // Pattern 2: Extract from Host header (subdomain-based routing)
    // Use Host header instead of url.hostname because request.url doesn't reflect the actual host
    const hostHeader =
      request.headers.get("host") || request.headers.get("x-forwarded-host");
    if (hostHeader) {
      const hostname = hostHeader.split(":")[0]; // Remove port

      // Local development: {projectId}.localhost
      if (hostname.includes(".localhost")) {
        const subdomain = hostname.split(".")[0];
        if (subdomain && subdomain !== "localhost") {
          return subdomain;
        }
      }

      // Production: {projectId}.lupa.build
      if (hostname.includes(".lupa.build")) {
        const subdomain = hostname.split(".")[0];
        if (subdomain && subdomain !== "www" && subdomain !== "docs") {
          return subdomain;
        }
      }
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Requires either a valid internal token OR a secret API key.
 * Internal tokens are used for www.lupa.build <-> <projectId>.lupa.build communication.
 * Secret keys are used for external API consumers.
 *
 * Public keys (lupa_pk_*) are rejected as they are read-only.
 */
export async function requireSecretKey(request: Request): Promise<void> {
  const internalToken = request.headers.get("X-Internal-Token");

  if (internalToken) {
    const projectId = extractProjectIdFromPath(request);

    if (projectId) {
      const isValid = verifyInternalToken(internalToken, projectId);

      if (isValid) {
        return;
      }
    }
  }

  const keyData = await getApiKeyDataFromRequest(request);

  if (!keyData) {
    throw new ApiError(ErrorCode.UNAUTHORIZED, "Valid API key required", 401);
  }

  if (keyData.key_type === "pk") {
    throw new ApiError(
      ErrorCode.READ_ONLY_KEY,
      "This operation requires a secret key (lupa_sk_*). Public keys (lupa_pk_*) are read-only.",
      403,
    );
  }
}

export async function getRequestApiKeyData(request: Request) {
  return await getApiKeyDataFromRequest(request);
}

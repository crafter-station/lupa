import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import {
  type NextFetchEvent,
  type NextRequest,
  NextResponse,
} from "next/server";
import { db } from "./db";
import {
  cacheDeploymentInfo,
  getProductionDeploymentId,
  getProjectInfo,
  getStagingDeploymentId,
  setProductionDeploymentId,
  setProjectInfo,
  setStagingDeploymentId,
  validateDeploymentOwnership,
} from "./db/redis";
import * as schema from "./db/schema";
import { validateApiKey } from "./lib/crypto/api-key";
import { verifyInternalToken } from "./lib/crypto/internal-token";
import type { RouteRewriteContext } from "./lib/proxy-routes";
import { matchRoute, requiresDeployment } from "./lib/proxy-routes";
import { rootDomain } from "./lib/utils";

const isProtectedRoute = createRouteMatcher(["/app(.*)"]);

const isPrivateRoute = createRouteMatcher(["/orgs/(.*)"]);

interface DeploymentResolutionResult {
  valid: boolean;
  deploymentId?: string | null;
  error?: { code: string; message: string };
}

async function resolveAndValidateDeployment(
  projectId: string,
  requestedDeploymentId: string | null,
  requiresDeployment: boolean,
  targetEnvironment?: "production" | "staging" | null,
): Promise<DeploymentResolutionResult> {
  const projectInfo = await getProjectInfo(projectId);
  if (!projectInfo) {
    const project = await db.query.Project.findFirst({
      where: eq(schema.Project.id, projectId),
      columns: { id: true, org_id: true, name: true },
    });

    if (!project) {
      return {
        valid: false,
        error: { code: "PROJECT_NOT_FOUND", message: "Project not found" },
      };
    }

    await setProjectInfo(projectId, {
      org_id: project.org_id,
      name: project.name,
    });
  }

  if (!requiresDeployment) {
    if (requestedDeploymentId) {
      const isValid = await validateDeploymentOwnership(
        projectId,
        requestedDeploymentId,
      );

      if (!isValid) {
        const deployment = await db.query.Deployment.findFirst({
          where: and(
            eq(schema.Deployment.id, requestedDeploymentId),
            eq(schema.Deployment.project_id, projectId),
          ),
          columns: {
            id: true,
            project_id: true,
            environment: true,
            status: true,
          },
        });

        if (!deployment) {
          return {
            valid: false,
            error: {
              code: "DEPLOYMENT_NOT_FOUND",
              message:
                "Deployment not found or does not belong to this project",
            },
          };
        }

        await cacheDeploymentInfo(requestedDeploymentId, {
          projectId: deployment.project_id,
          environment: deployment.environment,
          status: deployment.status,
        });
      }
    }

    return { valid: true, deploymentId: requestedDeploymentId };
  }

  let deploymentId = requestedDeploymentId;

  if (!deploymentId) {
    if (targetEnvironment === "staging") {
      deploymentId = await getStagingDeploymentId(projectId);

      if (!deploymentId) {
        const stagingDeployment = await db.query.Deployment.findFirst({
          where: and(
            eq(schema.Deployment.project_id, projectId),
            eq(schema.Deployment.environment, "staging"),
            eq(schema.Deployment.status, "ready"),
          ),
          columns: { id: true },
        });

        if (!stagingDeployment) {
          return {
            valid: false,
            error: {
              code: "NO_STAGING_DEPLOYMENT",
              message:
                "No staging deployment found. Please specify Deployment-Id header.",
            },
          };
        }

        deploymentId = stagingDeployment.id;
        await setStagingDeploymentId(projectId, deploymentId);
      }
    } else {
      deploymentId = await getProductionDeploymentId(projectId);

      if (!deploymentId) {
        const prodDeployment = await db.query.Deployment.findFirst({
          where: and(
            eq(schema.Deployment.project_id, projectId),
            eq(schema.Deployment.environment, "production"),
            eq(schema.Deployment.status, "ready"),
          ),
          columns: { id: true },
        });

        if (!prodDeployment) {
          return {
            valid: false,
            error: {
              code: "NO_PRODUCTION_DEPLOYMENT",
              message:
                "No production deployment found. Please specify Deployment-Id header.",
            },
          };
        }

        deploymentId = prodDeployment.id;
        await setProductionDeploymentId(projectId, deploymentId);
      }
    }
  } else {
    const isValid = await validateDeploymentOwnership(projectId, deploymentId);

    if (!isValid) {
      const deployment = await db.query.Deployment.findFirst({
        where: and(
          eq(schema.Deployment.id, deploymentId),
          eq(schema.Deployment.project_id, projectId),
        ),
        columns: {
          id: true,
          project_id: true,
          environment: true,
          status: true,
        },
      });

      if (!deployment) {
        return {
          valid: false,
          error: {
            code: "DEPLOYMENT_NOT_FOUND",
            message: "Deployment not found or does not belong to this project",
          },
        };
      }

      await cacheDeploymentInfo(deploymentId, {
        projectId: deployment.project_id,
        environment: deployment.environment,
        status: deployment.status,
      });
    }
  }

  return { valid: true, deploymentId };
}

async function handleSubdomainRequest(
  req: NextRequest,
  event: NextFetchEvent,
  subdomain: string,
  url: URL,
) {
  const projectId = subdomain.toLowerCase();

  console.log({
    pathname: url.pathname,
    searchParams: url.searchParams,
    subdomain,
  });

  const internalToken = req.headers.get("X-Internal-Token");
  let isAuthenticated = false;
  let apiKeyData:
    | { environment: "live" | "test"; key_type: "sk" | "pk" }
    | undefined;

  if (internalToken && verifyInternalToken(internalToken, projectId)) {
    isAuthenticated = true;
  } else {
    const { valid, data } = await validateApiKey(req, event, projectId);
    isAuthenticated = valid;
    apiKeyData = data;
  }

  if (!isAuthenticated) {
    return Response.json(
      {
        error: { code: "INVALID_API_KEY", message: "API Key is not valid" },
      },
      { status: 403 },
    );
  }

  if (apiKeyData && ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    if (apiKeyData.key_type === "pk") {
      return Response.json(
        {
          error: {
            code: "READ_ONLY_KEY",
            message: `Operation '${req.method}' requires a secret key (lupa_sk_*). Public keys (lupa_pk_*) are read-only.`,
          },
        },
        { status: 403 },
      );
    }
  }

  const routeRequiresDeployment = requiresDeployment(url.pathname);

  const requestedDeploymentId = req.headers.get("Deployment-Id");
  let targetEnvironment: "production" | "staging" | null = null;

  if (apiKeyData) {
    targetEnvironment =
      apiKeyData.environment === "live" ? "production" : "staging";
  }

  const deploymentResult = await resolveAndValidateDeployment(
    projectId,
    requestedDeploymentId,
    routeRequiresDeployment,
    targetEnvironment,
  );

  if (!deploymentResult.valid) {
    return Response.json(
      { error: deploymentResult.error },
      {
        status:
          deploymentResult.error?.code === "PROJECT_NOT_FOUND" ? 404 : 400,
      },
    );
  }

  const deploymentId = deploymentResult.deploymentId ?? null;

  const ctx: RouteRewriteContext = {
    projectId,
    deploymentId,
    searchParams: url.searchParams,
    pathname: url.pathname,
  };

  const rewritePath = matchRoute(ctx);

  if (rewritePath === null) {
    return Response.json(
      {
        error: {
          code: "MISSING_PARAMETER",
          message: "Missing required parameter",
        },
      },
      { status: 400 },
    );
  }

  if (rewritePath) {
    const rewriteUrl = new URL(rewritePath, req.url);
    return NextResponse.rewrite(rewriteUrl);
  }

  return NextResponse.next();
}

export default clerkMiddleware(
  async (auth, req: NextRequest, event: NextFetchEvent) => {
    const url = req.nextUrl;

    const subdomain = extractSubdomain(req);

    // Rewrite docs subdomain requests to /docs route
    if (subdomain === "docs") {
      const rewriteUrl = new URL(`/docs${url.pathname}`, req.url);
      rewriteUrl.search = url.search;

      return NextResponse.rewrite(rewriteUrl);
    }

    if (isProtectedRoute(req)) await auth.protect();

    if (url.pathname.startsWith("/app")) {
      const session = await auth();

      return NextResponse.redirect(
        new URL(`/orgs/${session.orgSlug}/projects`, url.origin),
      );
    }

    if (isPrivateRoute(req)) {
      const orgSlug = url.pathname.split("/")[2];
      const session = await auth();
      await auth.protect(() => orgSlug === session.orgSlug);
    }

    // Redirect www.lupa.build/docs/* to docs.lupa.build/*
    if (!subdomain && url.pathname.startsWith("/docs")) {
      const redirectUrl = new URL(url.href);
      redirectUrl.hostname = "docs.lupa.build";
      redirectUrl.pathname = url.pathname.replace(/^\/docs/, "") || "/";

      return NextResponse.redirect(redirectUrl, 301);
    }

    if (subdomain) {
      return await handleSubdomainRequest(req, event, subdomain, url);
    }

    // For all other routes, continue normally
    return NextResponse.next();
  },
  {
    organizationSyncOptions: {
      organizationPatterns: [
        "/orgs/:slug", // Match the org slug
        "/orgs/:slug/(.*)", // Wildcard match for optional trailing path segments
      ],
    },
  },
);

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};

function extractSubdomain(request: NextRequest): string | null {
  const url = request.url;

  const host = request.headers.get("host") || "";

  const hostname = host.split(":")[0];

  // Local development environment
  if (url.includes("localhost") || url.includes("127.0.0.1")) {
    // Try to extract subdomain from the full URL
    const fullUrlMatch = url.match(/http:\/\/([^.]+)\.localhost/);
    if (fullUrlMatch?.[1]) {
      return fullUrlMatch[1];
    }

    // Fallback to host header approach
    if (hostname.includes(".localhost")) {
      return hostname.split(".")[0];
    }

    return null;
  }

  // Production environment
  const rootDomainFormatted = rootDomain.split(":")[0];

  // Handle preview deployment URLs (tenant---branch-name.vercel.app)
  if (hostname.includes("---") && hostname.endsWith(".vercel.app")) {
    const parts = hostname.split("---");
    return parts.length > 0 ? parts[0] : null;
  }

  // Regular subdomain detection
  const isSubdomain =
    hostname !== rootDomainFormatted &&
    hostname !== `www.${rootDomainFormatted}` &&
    hostname.endsWith(`.${rootDomainFormatted}`);

  return isSubdomain ? hostname.replace(`.${rootDomainFormatted}`, "") : null;
}

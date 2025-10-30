import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import {
  type NextFetchEvent,
  type NextRequest,
  NextResponse,
} from "next/server";
import {
  cacheDeploymentInfo,
  getProjectAndDeploymentCache,
  getProjectWithDeployment,
  setProductionDeploymentId,
  setProjectInfo,
  setStagingDeploymentId,
} from "./db/redis";
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

export default clerkMiddleware(
  async (auth, req: NextRequest, event: NextFetchEvent) => {
    const url = req.nextUrl;

    const subdomain = extractSubdomain(req);

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

    if (!subdomain && url.pathname.startsWith("/docs")) {
      const redirectUrl = new URL(url.href);
      redirectUrl.hostname = `docs.${rootDomain}`;
      redirectUrl.pathname = url.pathname.replace(/^\/docs/, "") || "/";

      return NextResponse.redirect(redirectUrl, 301);
    }

    if (subdomain) {
      return await handleSubdomainRequest(req, event, subdomain, url);
    }

    return NextResponse.next();
  },
  {
    organizationSyncOptions: {
      organizationPatterns: ["/orgs/:slug", "/orgs/:slug/(.*)"],
    },
  },
);

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

function extractSubdomain(request: NextRequest): string | null {
  const url = request.url;

  const host = request.headers.get("host") || "";

  const hostname = host.split(":")[0];

  if (url.includes("localhost") || url.includes("127.0.0.1")) {
    const fullUrlMatch = url.match(/http:\/\/([^.]+)\.localhost/);
    if (fullUrlMatch?.[1]) {
      return fullUrlMatch[1];
    }

    if (hostname.includes(".localhost")) {
      return hostname.split(".")[0];
    }

    return null;
  }

  const rootDomainFormatted = rootDomain.split(":")[0];

  if (hostname.includes("---") && hostname.endsWith(".vercel.app")) {
    const parts = hostname.split("---");
    return parts.length > 0 ? parts[0] : null;
  }

  const isSubdomain =
    hostname !== rootDomainFormatted &&
    hostname !== `www.${rootDomainFormatted}` &&
    hostname.endsWith(`.${rootDomainFormatted}`);

  return isSubdomain ? hostname.replace(`.${rootDomainFormatted}`, "") : null;
}

async function resolveAndValidateDeployment(
  projectId: string,
  requestedDeploymentId: string | null,
  requiresDeployment: boolean,
  targetEnvironment?: "production" | "staging" | null,
): Promise<DeploymentResolutionResult> {
  const cacheResult = await getProjectAndDeploymentCache(
    projectId,
    requestedDeploymentId,
    targetEnvironment || "production",
  );

  let projectInfo = cacheResult.projectInfo;
  let deploymentId = cacheResult.deploymentId;

  if (!projectInfo || (requiresDeployment && !deploymentId)) {
    const dbResult = await getProjectWithDeployment(
      projectId,
      requestedDeploymentId,
      requiresDeployment ? targetEnvironment || "production" : undefined,
    );

    if (!dbResult) {
      return {
        valid: false,
        error: { code: "PROJECT_NOT_FOUND", message: "Project not found" },
      };
    }

    projectInfo = dbResult.project;
    await setProjectInfo(projectId, {
      org_id: projectInfo.org_id,
      name: projectInfo.name,
    });

    if (requiresDeployment) {
      if (!dbResult.deployment) {
        const errorCode =
          targetEnvironment === "staging"
            ? "NO_STAGING_DEPLOYMENT"
            : "NO_PRODUCTION_DEPLOYMENT";
        const errorMessage = `No ${targetEnvironment || "production"} deployment found. Please specify Deployment-Id header.`;
        return {
          valid: false,
          error: { code: errorCode, message: errorMessage },
        };
      }

      deploymentId = dbResult.deployment.id;

      if (targetEnvironment === "staging") {
        await setStagingDeploymentId(projectId, deploymentId);
      } else {
        await setProductionDeploymentId(projectId, deploymentId);
      }

      await cacheDeploymentInfo(deploymentId, {
        projectId: dbResult.deployment.project_id,
        environment: dbResult.deployment.environment,
        status: dbResult.deployment.status || "ready",
      });
    } else if (requestedDeploymentId) {
      if (!dbResult.deployment) {
        return {
          valid: false,
          error: {
            code: "DEPLOYMENT_NOT_FOUND",
            message: "Deployment not found or does not belong to this project",
          },
        };
      }

      if (dbResult.deployment.project_id !== projectId) {
        return {
          valid: false,
          error: {
            code: "DEPLOYMENT_NOT_FOUND",
            message: "Deployment not found or does not belong to this project",
          },
        };
      }

      await cacheDeploymentInfo(requestedDeploymentId, {
        projectId: dbResult.deployment.project_id,
        environment: dbResult.deployment.environment,
        status: dbResult.deployment.status || "ready",
      });
    }
  }

  if (
    requestedDeploymentId &&
    cacheResult.deploymentProjectId &&
    cacheResult.deploymentProjectId !== projectId
  ) {
    return {
      valid: false,
      error: {
        code: "DEPLOYMENT_NOT_FOUND",
        message: "Deployment not found or does not belong to this project",
      },
    };
  }

  if (!requiresDeployment) {
    return { valid: true, deploymentId: requestedDeploymentId };
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

  const internalToken = req.headers.get("X-Internal-Token");

  if (internalToken && verifyInternalToken(internalToken, projectId)) {
    const requestedDeploymentId = req.headers.get("Deployment-Id");

    const ctx: RouteRewriteContext = {
      projectId,
      deploymentId: requestedDeploymentId,
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

  const { valid, data } = await validateApiKey(req, event, projectId);

  if (!valid || !data) {
    return Response.json(
      {
        error: { code: "INVALID_API_KEY", message: "API Key is not valid" },
      },
      { status: 403 },
    );
  }

  const routeRequiresDeployment = requiresDeployment(url.pathname);

  const requestedDeploymentId = req.headers.get("Deployment-Id");
  const targetEnvironment =
    data.environment === "live" ? "production" : "staging";

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

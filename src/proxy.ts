import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { Redis } from "@upstash/redis";
import { and, eq } from "drizzle-orm";
import {
  type NextFetchEvent,
  type NextRequest,
  NextResponse,
} from "next/server";
import { db } from "./db";
import * as schema from "./db/schema";
import { rootDomain } from "./lib/utils";

const redis = Redis.fromEnv();

const isProtectedRoute = createRouteMatcher(["/app(.*)"]);
const isPrivateRoute = createRouteMatcher(["/orgs/(.*)"]);

export const preferredRegion = ["iad1", "gru1"];
export const fetchCache = "default-no-store";

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};

const ROUTES = [
  {
    pattern: /^\/api\/deployments/,
    requiresDeployment: false,
    rewrite: (
      projectId: string,
      _deploymentId: string | null,
      _pathname: string,
      searchParams: URLSearchParams,
    ) => {
      const params = searchParams.toString();
      return `/api/projects/${projectId}/deployments${params ? `?${params}` : ""}`;
    },
  },
  {
    pattern: /^\/api\/documents/,
    requiresDeployment: false,
    rewrite: (
      projectId: string,
      _deploymentId: string | null,
      pathname: string,
      searchParams: URLSearchParams,
    ) => {
      const pathParts = pathname.split("/").filter(Boolean);
      const params = searchParams.toString();

      if (pathParts.length === 3 && pathParts[2] === "bulk") {
        return `/api/projects/${projectId}/documents/bulk${params ? `?${params}` : ""}`;
      }

      if (pathParts.length === 3) {
        const documentId = pathParts[2];
        return `/api/projects/${projectId}/documents/${documentId}${params ? `?${params}` : ""}`;
      }

      return `/api/projects/${projectId}/documents${params ? `?${params}` : ""}`;
    },
  },
  {
    pattern: /^\/api\/snapshots/,
    requiresDeployment: false,
    rewrite: (
      projectId: string,
      _deploymentId: string | null,
      _pathname: string,
      searchParams: URLSearchParams,
    ) => {
      const params = searchParams.toString();
      return `/api/projects/${projectId}/snapshots${params ? `?${params}` : ""}`;
    },
  },
  {
    pattern: /^\/api\/search/,
    requiresDeployment: true,
    rewrite: (
      projectId: string,
      deploymentId: string | null,
      _pathname: string,
      searchParams: URLSearchParams,
    ) => {
      const query = searchParams.get("query");
      if (!query || !deploymentId) return null;
      return `/api/projects/${projectId}/deployments/${deploymentId}/search/${encodeURIComponent(query)}`;
    },
  },
  {
    pattern: /^\/api\/ls/,
    requiresDeployment: true,
    rewrite: (
      projectId: string,
      deploymentId: string | null,
      _pathname: string,
      searchParams: URLSearchParams,
    ) => {
      const folder = searchParams.get("folder");
      if (!folder || !deploymentId) return null;
      return `/api/projects/${projectId}/deployments/${deploymentId}/ls/${encodeURIComponent(folder)}`;
    },
  },
  {
    pattern: /^\/api\/cat/,
    requiresDeployment: true,
    rewrite: (
      projectId: string,
      deploymentId: string | null,
      _pathname: string,
      searchParams: URLSearchParams,
    ) => {
      const path = searchParams.get("path");
      if (!path || !deploymentId) return null;
      return `/api/projects/${projectId}/deployments/${deploymentId}/cat/${encodeURIComponent(path)}`;
    },
  },
  {
    pattern: /^\/api\/tree/,
    requiresDeployment: true,
    rewrite: (
      projectId: string,
      deploymentId: string | null,
      _pathname: string,
      searchParams: URLSearchParams,
    ) => {
      const folder = searchParams.get("folder") || "/";
      const depth = searchParams.get("depth") || "0";
      if (!deploymentId) return null;
      return `/api/projects/${projectId}/deployments/${deploymentId}/tree/${encodeURIComponent(folder)}/${depth}`;
    },
  },
  {
    pattern: /^\/api\/mcp/,
    requiresDeployment: true,
    rewrite: (
      projectId: string,
      deploymentId: string | null,
      _pathname: string,
      _searchParams: URLSearchParams,
    ) => {
      if (!deploymentId) return null;
      return `/api/projects/${projectId}/deployments/${deploymentId}/mcp/mcp`;
    },
  },
  {
    pattern: /^\/api\/sse/,
    requiresDeployment: true,
    rewrite: (
      projectId: string,
      deploymentId: string | null,
      _pathname: string,
      _searchParams: URLSearchParams,
    ) => {
      if (!deploymentId) return null;
      return `/api/projects/${projectId}/deployments/${deploymentId}/mcp/sse`;
    },
  },
  {
    pattern: /^\/api\/message/,
    requiresDeployment: true,
    rewrite: (
      projectId: string,
      deploymentId: string | null,
      _pathname: string,
      _searchParams: URLSearchParams,
    ) => {
      if (!deploymentId) return null;
      return `/api/projects/${projectId}/deployments/${deploymentId}/mcp/message`;
    },
  },
];

function matchRoute(
  projectId: string,
  deploymentId: string | null,
  pathname: string,
  searchParams: URLSearchParams,
): string | null {
  for (const route of ROUTES) {
    if (route.pattern.test(pathname)) {
      return route.rewrite(projectId, deploymentId, pathname, searchParams);
    }
  }
  return null;
}

export default clerkMiddleware(
  async (auth, req: NextRequest, _event: NextFetchEvent) => {
    const url = req.nextUrl;

    let subdomain: string | null = null;
    {
      const host = req.headers.get("host") || "";
      const hostname = host.split(":")[0];

      if (url.href.includes("localhost") || url.href.includes("127.0.0.1")) {
        const match = url.href.match(/http:\/\/([^.]+)\.localhost/);
        if (match?.[1]) {
          subdomain = match[1];
        } else if (hostname.includes(".localhost")) {
          subdomain = hostname.split(".")[0];
        }
      } else {
        const rootDomainFormatted = rootDomain.split(":")[0];

        if (hostname.includes("---") && hostname.endsWith(".vercel.app")) {
          const parts = hostname.split("---");
          subdomain = parts.length > 0 ? parts[0] : null;
        } else {
          const isSubdomain =
            hostname !== rootDomainFormatted &&
            hostname !== `www.${rootDomainFormatted}` &&
            hostname.endsWith(`.${rootDomainFormatted}`);

          subdomain = isSubdomain
            ? hostname.replace(`.${rootDomainFormatted}`, "")
            : null;
        }
      }
    }

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
      const projectId = subdomain.toLowerCase();

      const internalToken = req.headers.get("X-Internal-Token");
      if (internalToken) {
        let tokenValid = false;
        try {
          const secret = process.env.INTERNAL_REQUEST_SECRET;
          if (secret) {
            const decoded = Buffer.from(internalToken, "base64").toString();
            const [payloadStr, signature] = decoded.split(".");

            if (payloadStr && signature) {
              const payload = JSON.parse(payloadStr);

              if (
                payload.exp >= Date.now() &&
                payload.projectId === projectId &&
                payload.iss === "lupa-internal"
              ) {
                const expectedSig = createHmac("sha256", secret)
                  .update(payloadStr)
                  .digest("hex");

                const sigBuf = Buffer.from(signature, "utf-8");
                const expectedSigBuf = Buffer.from(expectedSig, "utf-8");

                if (sigBuf.length === expectedSigBuf.length) {
                  tokenValid = timingSafeEqual(sigBuf, expectedSigBuf);
                }
              }
            }
          }
        } catch {}

        if (tokenValid) {
          const deploymentId = req.headers.get("Deployment-Id");
          const rewritePath = matchRoute(
            projectId,
            deploymentId,
            url.pathname,
            url.searchParams,
          );

          if (rewritePath === null) {
            return Response.json(
              { error: { code: "MISSING_PARAMETER" } },
              { status: 400 },
            );
          }

          if (rewritePath) {
            return NextResponse.rewrite(new URL(rewritePath, req.url));
          }

          return NextResponse.next();
        }
      }

      const authHeader = req.headers.get("authorization");
      if (!authHeader?.startsWith("Bearer ")) {
        return Response.json(
          { error: { code: "MISSING_API_KEY" } },
          { status: 401 },
        );
      }

      const apiKey = authHeader.replace("Bearer ", "").trim();
      const requestedDeploymentId = req.headers.get("Deployment-Id");

      const environment = apiKey.includes("_live_") ? "production" : "staging";

      let routeRequiresDeployment = false;
      for (const route of ROUTES) {
        if (route.pattern.test(url.pathname)) {
          routeRequiresDeployment = route.requiresDeployment ?? false;
          break;
        }
      }

      const keyHash = createHash("sha256").update(apiKey).digest("hex");
      const deploymentKey = requestedDeploymentId || `auto:${environment}`;
      const cacheKey = `auth:${keyHash}:${projectId}:${deploymentKey}`;

      const res = await fetch(
        `${process.env.UPSTASH_REDIS_REST_URL}/get/${encodeURIComponent(cacheKey)}`,
        {
          headers: {
            Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN}`,
          },
          cache: "force-cache",
          next: { revalidate: 86400 }, // Cache for 24 hours
        },
      );
      const d = await res.json();
      const cached = JSON.parse(d.result) as {
        valid: boolean;
        projectId?: string;
        deploymentId?: string | null;
        readOnly?: boolean;
        orgId?: string;
        error?: string;
      } | null;

      let authResult = cached;

      if (!authResult) {
        let result:
          | {
              key_id: string;
              project_id: string;
              org_id: string;
              key_type: "sk" | "pk";
              deployment_id: string | null;
            }[]
          | undefined;

        if (requestedDeploymentId) {
          result = await db
            .select({
              key_id: schema.ApiKey.id,
              project_id: schema.ApiKey.project_id,
              org_id: schema.ApiKey.org_id,
              key_type: schema.ApiKey.key_type,
              deployment_id: schema.Deployment.id,
            })
            .from(schema.ApiKey)
            .leftJoin(
              schema.Deployment,
              and(
                eq(schema.Deployment.id, requestedDeploymentId),
                eq(schema.Deployment.project_id, schema.ApiKey.project_id),
              ),
            )
            .where(
              and(
                eq(schema.ApiKey.key_hash, keyHash),
                eq(schema.ApiKey.is_active, true),
                eq(schema.ApiKey.project_id, projectId),
              ),
            )
            .limit(1);
        } else {
          result = await db
            .select({
              key_id: schema.ApiKey.id,
              project_id: schema.ApiKey.project_id,
              org_id: schema.ApiKey.org_id,
              key_type: schema.ApiKey.key_type,
              deployment_id: schema.Deployment.id,
            })
            .from(schema.ApiKey)
            .leftJoin(
              schema.Deployment,
              and(
                eq(schema.Deployment.project_id, schema.ApiKey.project_id),
                eq(schema.Deployment.environment, environment),
                eq(schema.Deployment.status, "ready"),
              ),
            )
            .where(
              and(
                eq(schema.ApiKey.key_hash, keyHash),
                eq(schema.ApiKey.is_active, true),
                eq(schema.ApiKey.project_id, projectId),
              ),
            )
            .limit(1);
        }

        if (!result[0]?.key_id) {
          authResult = { valid: false, error: "INVALID_API_KEY" };
          await redis.set(cacheKey, authResult, { ex: 300 });
        } else if (requestedDeploymentId && !result[0].deployment_id) {
          authResult = { valid: false, error: "DEPLOYMENT_NOT_FOUND" };
          await redis.set(cacheKey, authResult, { ex: 300 });
        } else {
          authResult = {
            valid: true,
            projectId: result[0].project_id,
            deploymentId: result[0].deployment_id,
            readOnly: result[0].key_type === "pk",
            orgId: result[0].org_id,
          };
          await redis.set(cacheKey, authResult, { ex: 60 * 60 * 24 * 7 }); // Cache for 7 days

          // event.waitUntil(
          //   db
          //     .update(schema.ApiKey)
          //     .set({
          //       last_used_at: new Date().toISOString(),
          //       updated_at: new Date().toISOString(),
          //     })
          //     .where(eq(schema.ApiKey.id, result[0].key_id))
          //     .catch(console.error),
          // );
        }
      }

      if (!authResult?.valid) {
        return Response.json(
          { error: { code: authResult.error } },
          { status: 403 },
        );
      }

      if (routeRequiresDeployment && !authResult.deploymentId) {
        return Response.json(
          { error: { code: "NO_DEPLOYMENT_FOUND" } },
          { status: 400 },
        );
      }

      const rewritePath = matchRoute(
        authResult.projectId || projectId,
        authResult.deploymentId ?? null,
        url.pathname,
        url.searchParams,
      );

      if (rewritePath === null) {
        return Response.json(
          { error: { code: "MISSING_PARAMETER" } },
          { status: 400 },
        );
      }

      if (rewritePath) {
        return NextResponse.rewrite(new URL(rewritePath, req.url));
      }

      return NextResponse.next();
    }

    return NextResponse.next();
  },
  {
    organizationSyncOptions: {
      organizationPatterns: ["/orgs/:slug", "/orgs/:slug/(.*)"],
    },
  },
);

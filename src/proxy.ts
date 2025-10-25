import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { nanoid } from "nanoid";
import {
  type NextFetchEvent,
  type NextRequest,
  NextResponse,
} from "next/server";
import { validateApiKey } from "./lib/api-key";
import {
  logApiKeyUsage,
  logSearchRequest,
  logSearchResults,
} from "./lib/tinybird";
import { rootDomain } from "./lib/utils";

const isProtectedRoute = createRouteMatcher(["/app(.*)"]);

const isPrivateRoute = createRouteMatcher(["/orgs/(.*)"]);

const isApiRoute = createRouteMatcher(["/api/(.*)"]);

const isPublicApiRoute = createRouteMatcher([
  "/api/collections/(.*)",
  "/api/analytics/(.*)",
  "/api/firecrawl/(.*)",
]);

export default clerkMiddleware(
  async (auth, req: NextRequest, event: NextFetchEvent) => {
    const url = req.nextUrl;

    const subdomain = extractSubdomain(req);
    console.log(subdomain);

    // Rewrite docs subdomain requests to /docs route
    if (subdomain === "docs") {
      const rewriteUrl = new URL(`/docs${url.pathname}`, req.url);
      rewriteUrl.search = url.search;

      return NextResponse.rewrite(rewriteUrl);
    }

    if (isApiRoute(req) && !isPublicApiRoute(req)) {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer lupa_sk_")) {
        const validation = await validateApiKey(req);
        if (!validation.valid) {
          return new Response(
            JSON.stringify({ error: "Invalid or expired API key" }),
            {
              status: 401,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      } else if (url.pathname === "/api/search") {
        const session = await auth();
        if (!session.userId) {
          return new Response(
            JSON.stringify({
              error: "Authentication required. Use API key or login.",
            }),
            {
              status: 401,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
      }
    }

    if (isProtectedRoute(req)) await auth.protect();

    if (url.pathname === "/app") {
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

    // Rewrite /api/snapshot/[snapshot_id] to Vercel Blob Storage
    const snapshotsMatch = url.pathname.match(/^\/api\/snapshots\/([^/]+)$/);
    if (snapshotsMatch) {
      const snapshotId = snapshotsMatch[1];
      const blobUrl = `${process.env.VERCEL_BLOB_STORAGE_ROOT_DOMAIN}/parsed/${snapshotId}.md`;
      return NextResponse.rewrite(blobUrl);
    }

    // Redirect www.lupa.build/docs/* to docs.lupa.build/*
    if (url.hostname === "www.lupa.build" && url.pathname.startsWith("/docs")) {
      const redirectUrl = new URL(url.href);
      redirectUrl.hostname = "docs.lupa.build";
      redirectUrl.pathname = url.pathname.replace(/^\/docs/, "") || "/";

      return NextResponse.redirect(redirectUrl, 301);
    }

    if (url.pathname === "/api/search") {
      const projectId = url.searchParams.get("projectId");
      const deploymentId = url.searchParams.get("deploymentId");
      const query = url.searchParams.get("query");

      if (projectId && deploymentId && query) {
        const requestId = nanoid();
        const startTime = Date.now();

        const validation = await validateApiKey(req);
        const isApiKeyAuth = validation.valid;

        if (
          !isApiKeyAuth &&
          validation.projectId &&
          validation.projectId !== projectId
        ) {
          return new Response(
            JSON.stringify({
              error: "API key does not have access to this project",
            }),
            {
              status: 403,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        const apiUrl = new URL(
          `/api/search/${projectId}/${deploymentId}/${encodeURIComponent(query)}`,
          req.url,
        );

        try {
          const response = await fetch(apiUrl.toString(), {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          });

          const responseTime = Date.now() - startTime;
          const data = await response.json();

          const results = data.results || [];
          const scores = results
            .map((r: { score: number }) => r.score)
            .filter((s: number) => typeof s === "number");

          const loggingPromises = [
            logSearchRequest({
              requestId,
              projectId,
              deploymentId,
              query: decodeURIComponent(query),
              statusCode: response.status,
              responseTimeMs: responseTime,
              resultsReturned: results.length,
              avgSimilarityScore:
                scores.length > 0
                  ? scores.reduce((a: number, b: number) => a + b, 0) /
                    scores.length
                  : 0,
              minSimilarityScore: scores.length > 0 ? Math.min(...scores) : 0,
              maxSimilarityScore: scores.length > 0 ? Math.max(...scores) : 0,
            }),
            logSearchResults(requestId, projectId, deploymentId, results),
          ];

          if (isApiKeyAuth && validation.apiKeyId) {
            loggingPromises.push(
              logApiKeyUsage({
                timestamp: new Date(),
                projectId,
                apiKeyId: validation.apiKeyId,
                endpoint: "/api/search",
                method: "GET",
                statusCode: response.status,
                responseTimeMs: responseTime,
              }),
            );
          }

          event.waitUntil(Promise.all(loggingPromises));

          return new Response(JSON.stringify(data), {
            status: response.status,
            headers: {
              "Content-Type": "application/json",
            },
          });
        } catch (error) {
          console.error("Middleware search error:", error);

          // Log the error asynchronously
          const responseTime = Date.now() - startTime;
          event.waitUntil(
            logSearchRequest({
              requestId,
              projectId,
              deploymentId,
              query: decodeURIComponent(query),
              statusCode: 500,
              responseTimeMs: responseTime,
              resultsReturned: 0,
              avgSimilarityScore: 0,
              minSimilarityScore: 0,
              maxSimilarityScore: 0,
            }),
          );

          return new Response(
            JSON.stringify({ error: "Internal server error" }),
            {
              status: 500,
              headers: {
                "Content-Type": "application/json",
              },
            },
          );
        }
      }
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

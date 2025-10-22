import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { nanoid } from "nanoid";
import {
  type NextFetchEvent,
  type NextRequest,
  NextResponse,
} from "next/server";
import { logSearchRequest, logSearchResults } from "./lib/tinybird";

const isProtectedRoute = createRouteMatcher(["/app(.*)"]);

const isPrivateRoute = createRouteMatcher(["/orgs/(.*)"]);

export default clerkMiddleware(
  async (auth, req: NextRequest, event: NextFetchEvent) => {
    if (isProtectedRoute(req)) await auth.protect();

    const url = req.nextUrl;

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

    // Rewrite docs subdomain requests to /docs route
    if (url.hostname === "docs.lupa.build") {
      const rewriteUrl = new URL(`/docs${url.pathname}`, req.url);
      rewriteUrl.search = url.search;

      return NextResponse.rewrite(rewriteUrl);
    }

    if (url.pathname === "/api/search") {
      const projectId = url.searchParams.get("projectId");
      const deploymentId = url.searchParams.get("deploymentId");
      const query = url.searchParams.get("query");

      if (projectId && deploymentId && query) {
        const requestId = nanoid();
        const startTime = Date.now();

        // Build the internal API URL
        const apiUrl = new URL(
          `/api/search/${projectId}/${deploymentId}/${encodeURIComponent(query)}`,
          req.url,
        );

        try {
          // Fetch from the internal API
          const response = await fetch(apiUrl.toString(), {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          });

          const responseTime = Date.now() - startTime;
          const data = await response.json();

          // Extract results and scores for analytics
          const results = data.results || [];
          const scores = results
            .map((r: { score: number }) => r.score)
            .filter((s: number) => typeof s === "number");

          // Log analytics asynchronously in the background
          event.waitUntil(
            Promise.all([
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
            ]),
          );

          // Return the response to the client
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

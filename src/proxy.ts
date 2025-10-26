import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import {
  type NextFetchEvent,
  type NextRequest,
  NextResponse,
} from "next/server";
import { validateApiKey } from "./lib/api-key";

import { rootDomain } from "./lib/utils";

const isProtectedRoute = createRouteMatcher(["/app(.*)"]);

const isPrivateRoute = createRouteMatcher(["/orgs/(.*)"]);

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

    // https://<project_id>.lupa.build/api/

    if (subdomain) {
      const projectId = subdomain.toLowerCase();

      console.log({
        pathname: url.pathname,
        searchParams: url.searchParams,
        subdomain,
      });

      const {
        valid,
        apiKeyId,
        projectId: p,
      } = await validateApiKey(req, projectId);

      if (!valid) {
        console.log(apiKeyId, p);
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

      const deploymentId = req.headers.get("Deployment-Id");

      if (url.pathname.startsWith("/api/search")) {
        console.log("calling search api (proxy)");

        const query = url.searchParams.get("query");

        if (!query) {
          return NextResponse.json(
            {
              error: "Missing `query` parameter",
            },
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            },
          );
        }

        const rewriteUrl = new URL(
          `/api/projects/${projectId}/deployments/${deploymentId}/search/${encodeURIComponent(query)}`,
          req.url,
        );

        return NextResponse.rewrite(rewriteUrl);
      }
      if (url.pathname.startsWith("/api/ls")) {
        const folder = url.searchParams.get("folder");
        if (!folder) {
          return NextResponse.json(
            {
              error: "Missing `folder` parameter",
            },
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
        const rewriteUrl = new URL(
          `/api/projects/${projectId}/deployments/${deploymentId}/ls/${encodeURIComponent(folder)}`,
          req.url,
        );

        return NextResponse.rewrite(rewriteUrl);
      }
      if (url.pathname.startsWith("/api/cat")) {
        const path = url.searchParams.get("path");
        if (!path) {
          return NextResponse.json(
            {
              error: "Missing `path` parameter",
            },
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            },
          );
        }
        const rewriteUrl = new URL(
          `/api/projects/${projectId}/deployments/${deploymentId}/cat/${encodeURIComponent(path)}`,
          req.url,
        );

        return NextResponse.rewrite(rewriteUrl);
      }
      if (url.pathname.startsWith("/api/mcp")) {
        const rewriteUrl = new URL(
          `/api/projects/${projectId}/deployments/${deploymentId}/mcp/mcp`,
          req.url,
        );

        return NextResponse.rewrite(rewriteUrl);
      }
      if (url.pathname.startsWith("/api/sse")) {
        const rewriteUrl = new URL(
          `/api/projects/${projectId}/deployments/${deploymentId}/mcp/sse`,
          req.url,
        );

        return NextResponse.rewrite(rewriteUrl);
      }
      if (url.pathname.startsWith("/api/message")) {
        const rewriteUrl = new URL(
          `/api/projects/${projectId}/deployments/${deploymentId}/mcp/message`,
          req.url,
        );

        return NextResponse.rewrite(rewriteUrl);
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

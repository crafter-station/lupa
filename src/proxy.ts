import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import {
  type NextFetchEvent,
  type NextRequest,
  NextResponse,
} from "next/server";
import { validateApiKey } from "./lib/crypto/api-key";
import { verifyInternalToken } from "./lib/crypto/internal-token";
import type { RouteRewriteContext } from "./lib/proxy-routes";
import { matchRoute } from "./lib/proxy-routes";
import { rootDomain } from "./lib/utils";

const isProtectedRoute = createRouteMatcher(["/app(.*)"]);

const isPrivateRoute = createRouteMatcher(["/orgs/(.*)"]);

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

  if (internalToken && verifyInternalToken(internalToken, projectId)) {
    isAuthenticated = true;
  } else {
    const { valid } = await validateApiKey(req, event, projectId);
    isAuthenticated = valid;
  }

  if (!isAuthenticated) {
    return Response.json(
      {
        error: { code: "INVALID_API_KEY", message: "API Key is not valid" },
      },
      { status: 403 },
    );
  }

  const deploymentId = req.headers.get("Deployment-Id");

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

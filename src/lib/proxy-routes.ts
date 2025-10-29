export interface RouteRewriteContext {
  projectId: string;
  deploymentId: string | null;
  searchParams: URLSearchParams;
  pathname: string;
}

export interface RouteConfig {
  pattern: RegExp;
  requiresDeploymentId?: boolean;
  rewrite: (ctx: RouteRewriteContext) => string | null;
}

export const SUBDOMAIN_ROUTES: RouteConfig[] = [
  {
    pattern: /^\/api\/deployments/,
    rewrite: (ctx) => `/api/projects/${ctx.projectId}/deployments`,
  },
  {
    pattern: /^\/api\/documents/,
    rewrite: (ctx) => {
      const pathParts = ctx.pathname.split("/").filter(Boolean);

      if (pathParts.length === 3 && pathParts[2] === "bulk") {
        return `/api/projects/${ctx.projectId}/documents/bulk${ctx.searchParams.toString() ? `?${ctx.searchParams.toString()}` : ""}`;
      }

      if (pathParts.length === 3) {
        const documentId = pathParts[2];
        return `/api/projects/${ctx.projectId}/documents/${documentId}${ctx.searchParams.toString() ? `?${ctx.searchParams.toString()}` : ""}`;
      }

      return `/api/projects/${ctx.projectId}/documents${ctx.searchParams.toString() ? `?${ctx.searchParams.toString()}` : ""}`;
    },
  },
  {
    pattern: /^\/api\/snapshots/,
    rewrite: (ctx) =>
      `/api/projects/${ctx.projectId}/snapshots${ctx.searchParams.toString() ? `?${ctx.searchParams.toString()}` : ""}`,
  },
  {
    pattern: /^\/api\/search/,
    requiresDeploymentId: true,
    rewrite: (ctx) => {
      const query = ctx.searchParams.get("query");
      if (!query || !ctx.deploymentId) return null;
      return `/api/projects/${ctx.projectId}/deployments/${ctx.deploymentId}/search/${encodeURIComponent(query)}`;
    },
  },
  {
    pattern: /^\/api\/ls/,
    requiresDeploymentId: true,
    rewrite: (ctx) => {
      const folder = ctx.searchParams.get("folder");
      if (!folder || !ctx.deploymentId) return null;
      return `/api/projects/${ctx.projectId}/deployments/${ctx.deploymentId}/ls/${encodeURIComponent(folder)}`;
    },
  },
  {
    pattern: /^\/api\/cat/,
    requiresDeploymentId: true,
    rewrite: (ctx) => {
      const path = ctx.searchParams.get("path");
      if (!path || !ctx.deploymentId) return null;
      return `/api/projects/${ctx.projectId}/deployments/${ctx.deploymentId}/cat/${encodeURIComponent(path)}`;
    },
  },
  {
    pattern: /^\/api\/tree/,
    requiresDeploymentId: true,
    rewrite: (ctx) => {
      const folder = ctx.searchParams.get("folder") || "/";
      const depth = ctx.searchParams.get("depth") || "0";
      if (!ctx.deploymentId) return null;
      return `/api/projects/${ctx.projectId}/deployments/${ctx.deploymentId}/tree/${encodeURIComponent(folder)}/${depth}`;
    },
  },
  {
    pattern: /^\/api\/mcp/,
    requiresDeploymentId: true,
    rewrite: (ctx) => {
      if (!ctx.deploymentId) return null;
      return `/api/projects/${ctx.projectId}/deployments/${ctx.deploymentId}/mcp/mcp`;
    },
  },
  {
    pattern: /^\/api\/sse/,
    requiresDeploymentId: true,
    rewrite: (ctx) => {
      if (!ctx.deploymentId) return null;
      return `/api/projects/${ctx.projectId}/deployments/${ctx.deploymentId}/mcp/sse`;
    },
  },
  {
    pattern: /^\/api\/message/,
    requiresDeploymentId: true,
    rewrite: (ctx) => {
      if (!ctx.deploymentId) return null;
      return `/api/projects/${ctx.projectId}/deployments/${ctx.deploymentId}/mcp/message`;
    },
  },
];

export function matchRoute(ctx: RouteRewriteContext): string | null {
  for (const route of SUBDOMAIN_ROUTES) {
    if (route.pattern.test(ctx.pathname)) {
      return route.rewrite(ctx);
    }
  }
  return null;
}

export function requiresDeployment(pathname: string): boolean {
  for (const route of SUBDOMAIN_ROUTES) {
    if (route.pattern.test(pathname)) {
      return route.requiresDeploymentId ?? false;
    }
  }
  return false;
}

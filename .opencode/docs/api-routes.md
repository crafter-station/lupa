# API Route Architecture

## Overview

Lupa implements a **two-tier API architecture** that separates external-facing public APIs from internal application routes. This design provides a clean API surface for external consumers while maintaining secure internal communication between services.

```
┌─────────────────┐
│  External User  │
│   (API Key)     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  <projectId>.lupa.build/api/...     │
│  Public API Routes (External)       │
│  Auth: API Key                      │
└─────────────────────────────────────┘
         ▲
         │ Internal Token
         │
┌────────┴────────┐       ┌──────────────────┐
│  WWW User       │──────▶│  www.lupa.build  │
│  (Clerk Auth)   │       │  Application API │
└─────────────────┘       │  Auth: Clerk     │
                          └──────────────────┘
```

## Core Concepts

### Public API Routes

**Location**: `src/app/api/(public)/projects/[projectId]/...`

**Purpose**: External-facing API consumed by end-users with API keys

**URL Pattern**: `https://<projectId>.lupa.build/api/...`

**Authentication**: API Key via `Authorization: Bearer lupa_sk_...` header

**Available Endpoints**:
- `/api/search?query=<query>` - Search deployment (requires `Deployment-Id` header)
- `/api/deployments` - Create deployment
- `/api/documents` - Manage documents (POST for create)
- `/api/documents/<id>` - Get/update/delete specific document
- `/api/snapshots` - Create snapshots
- `/api/ls?folder=<path>` - List files in deployment folder (agent tool)
- `/api/cat?path=<path>` - Read file content from deployment (agent tool)
- `/api/mcp`, `/api/sse`, `/api/message` - MCP protocol endpoints

**Key Characteristics**:
- Clean, resource-oriented URLs
- Authentication handled centrally in middleware
- No business logic duplication with app routes
- Documented with OpenAPI annotations

### Application API Routes

**Location**: `src/app/api/...` (without `(public)` directory)

**Purpose**: Internal routes for www.lupa.build web application

**URL Pattern**: `https://www.lupa.build/api/...`

**Authentication**: Clerk session-based auth

**Behavior**: Orchestrator/proxy that validates authorization and calls Public API routes

**Available Endpoints**:
- `/api/search` - Proxy to public search API
- `/api/documents` - Proxy to public documents API
- `/api/snapshots` - Proxy to public snapshots API
- `/api/deployments` - Proxy to public deployments API
- `/api/projects` - Project management (no public equivalent)
- `/api/api-keys` - API key management (no public equivalent)
- `/api/analytics/*` - Analytics endpoints (Tinybird)
- `/api/collections/*` - TanStack Electric collections
- `/api/chat` - AI chat interface

**Key Characteristics**:
- Validates Clerk session and organization ownership
- Extracts `projectId` from request body/params
- Generates short-lived internal tokens (5s TTL)
- Proxies requests to public API subdomain
- Returns responses transparently to client

## Authentication Flow

### 1. Public API (External Users)

```
Request → proxy.ts middleware → validateApiKey() → Route Handler
```

**Process**:
1. Extract `Authorization: Bearer lupa_sk_...` header
2. Hash API key with SHA-256
3. Check Redis cache (30-day TTL)
4. If cache miss, query PostgreSQL
5. Validate API key is active and matches projectId
6. Update `last_used_at` timestamp (async, non-blocking)
7. Continue to route handler

**Implementation**: `src/lib/crypto/api-key.ts`

**Security Features**:
- API keys stored as SHA-256 hashes
- Redis caching reduces DB load
- Per-project scoping prevents cross-project access
- Revocable keys with soft delete

### 2. Application API (WWW Users)

```
Request → Clerk auth → Validate ownership → Generate internal token → Fetch public API → Return response
```

**Process**:
1. Validate Clerk session: `await auth()`
2. Extract `projectId` from request
3. Query database to verify user's organization owns project
4. Generate internal token with `generateInternalToken(projectId)`
5. Make fetch request to `https://<projectId>.lupa.build/api/...`
6. Include `X-Internal-Token` header
7. Return proxied response to client

**Implementation**: See `src/app/api/documents/route.ts`, `src/app/api/search/route.ts`

### 3. Internal Token System

**Purpose**: Secure server-to-server communication between www.lupa.build and <projectId>.lupa.build

**Implementation**: `src/lib/crypto/internal-token.ts`

**Token Structure**:
```typescript
interface InternalTokenPayload {
  iss: "lupa-internal"    // Issuer
  projectId: string       // Project being accessed
  exp: number            // Expiry (Date.now() + 5000ms)
}
```

**Generation**:
```typescript
const payload = { iss: "lupa-internal", projectId, exp: Date.now() + 5000 };
const payloadStr = JSON.stringify(payload);
const signature = createHmac("sha256", INTERNAL_REQUEST_SECRET)
  .update(payloadStr)
  .digest("hex");
const token = Buffer.from(`${payloadStr}.${signature}`).toString("base64");
```

**Validation** (in `proxy.ts`):
1. Base64 decode token
2. Split into payload and signature
3. Parse payload JSON
4. Check expiry (`exp < Date.now()`)
5. Verify issuer is `"lupa-internal"`
6. Verify projectId matches subdomain
7. Recompute signature and compare using `timingSafeEqual()`

**Security Features**:
- Short-lived (5 second TTL)
- HMAC-SHA256 signature prevents tampering
- Timing-safe comparison prevents timing attacks
- Project-scoped (can't be reused for other projects)
- Issuer validation prevents token confusion

## Middleware Magic

The `src/proxy.ts` file is the heart of the routing system. It runs on every request and handles:

1. Subdomain extraction
2. Authentication
3. URL rewriting
4. Special cases (docs subdomain, Clerk protected routes)

### Subdomain Extraction

Handles multiple environments:

**Localhost**: `proj_abc123.localhost:3000` → `"proj_abc123"`

**Production**: `proj_abc123.lupa.build` → `"proj_abc123"`

**Vercel Previews**: `proj_abc123---branch.vercel.app` → `"proj_abc123"`

**Implementation**: `extractSubdomain()` function at `src/proxy.ts:232`

### Authentication Layer

**Priority order**:
1. Check `X-Internal-Token` header (for www.lupa.build → subdomain requests)
2. Validate API key via `Authorization: Bearer` header (for external requests)
3. Return 403 if neither is valid

**Code location**: `src/proxy.ts:66-86`

```typescript
const internalToken = req.headers.get("X-Internal-Token");
let isAuthenticated = false;

if (internalToken && verifyInternalToken(internalToken, projectId)) {
  isAuthenticated = true;
} else {
  const { valid } = await validateApiKey(req, event, projectId);
  isAuthenticated = valid;
}

if (!isAuthenticated) {
  return new Response(JSON.stringify({ error: "API Key is not valid" }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}
```

### URL Rewrites

Transform clean public URLs to internal route structure:

| Public URL | Internal Route | Notes |
|------------|----------------|-------|
| `/api/search?query=X` | `/api/projects/{projectId}/deployments/{deploymentId}/search/{X}` | Requires `Deployment-Id` header |
| `/api/deployments` | `/api/projects/{projectId}/deployments` | - |
| `/api/documents` | `/api/projects/{projectId}/documents` | - |
| `/api/snapshots` | `/api/projects/{projectId}/snapshots` | - |
| `/api/ls?folder=X` | `/api/projects/{projectId}/deployments/{deploymentId}/ls/{X}` | Agent tool |
| `/api/cat?path=X` | `/api/projects/{projectId}/deployments/{deploymentId}/cat/{X}` | Agent tool |
| `/api/mcp` | `/api/projects/{projectId}/deployments/{deploymentId}/mcp/mcp` | MCP transport |
| `/api/sse` | `/api/projects/{projectId}/deployments/{deploymentId}/mcp/sse` | MCP SSE transport |
| `/api/message` | `/api/projects/{projectId}/deployments/{deploymentId}/mcp/message` | MCP message handler |

**Implementation**: `src/proxy.ts:88-207`

### Deployment-Id Header

For deployment-scoped operations (search, ls, cat, MCP), the middleware extracts the `Deployment-Id` header and includes it in the rewritten path.

**Example**:
```bash
GET /api/search?query=refund
Deployment-Id: dep_xyz789

# Rewritten to:
GET /api/projects/proj_abc123/deployments/dep_xyz789/search/refund
```

**Code location**: `src/proxy.ts:117`

## Design Principles & Motivation

### 1. Separation of Concerns

**Public API**: Clean, simple interface optimized for external consumption

**App API**: Business logic layer with authorization, validation, orchestration

**Why**: 
- APIs can evolve independently
- Clear security boundaries between external/internal
- Simpler API documentation for external users
- Internal complexity hidden from public interface

### 2. Security in Depth

Multiple authentication layers:
- **API Keys**: External authentication, per-project scoping, revocable
- **Internal Tokens**: Short-lived (5s), HMAC-signed, prevents replay attacks  
- **Clerk Sessions**: Web application authentication

**Why**: Multiple layers prevent unauthorized access even if one layer is compromised

### 3. URL Beautification

**External**: `<projectId>.lupa.build/api/search?query=foo`

**Internal**: `/api/projects/{projectId}/deployments/{deploymentId}/search/{foo}`

**Why**:
- Better developer experience
- Cleaner API documentation
- Hides internal complexity
- Natural multi-tenancy (projectId in subdomain)

### 4. Performance Optimization

**Redis caching**: API key validation cached for 30 days

**waitUntil**: Non-blocking operations for:
- `last_used_at` timestamp updates
- Tinybird analytics logging

**Why**: Maintains sub-50ms P95 latency for authentication without blocking requests

### 5. Zero Trust Between Services

Even internal requests (www → subdomain) require authentication via internal tokens.

Internal tokens expire quickly (5s) to minimize replay attack window.

**Why**: 
- Defense against compromised internal services
- Clear audit trail of all requests
- Prevents privilege escalation

## Implementation Patterns

### Application Route Pattern

**Location**: `src/app/api/documents/route.ts`, `src/app/api/search/route.ts`, etc.

**Standard pattern for www.lupa.build API routes** (using utilities):

```typescript
import { auth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import z from "zod/v3";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { IdSchema } from "@/lib/generate-id";
import {
  proxyToPublicAPI,
  extractSessionOrgId,
  validateProjectOwnership,
} from "@/lib/api-proxy";
import { handleApiError, ErrorCode, createErrorResponse } from "@/lib/api-error";

export const POST = async (req: NextRequest) => {
  try {
    // 1. Extract and validate session
    const orgId = await extractSessionOrgId(auth);

    // 2. Parse and validate input
    const body = await req.json();
    const { projectId, ...payload } = z.object({
      projectId: IdSchema,
      // ... other fields
    }).parse(body);

    // 3. Verify organization ownership
    await validateProjectOwnership(db, schema, projectId, orgId);

    // 4. Proxy to public API (handles token generation internally)
    return await proxyToPublicAPI(
      projectId,
      "/endpoint",
      {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    return handleApiError(error);
  }
};
```

**Key steps**:
1. Extract orgId using `extractSessionOrgId(auth)` (throws ApiError if missing)
2. Parse request body with Zod schemas
3. Validate ownership with `validateProjectOwnership()` (throws ApiError if not found)
4. Proxy using `proxyToPublicAPI()` (handles token generation, headers, and errors)
5. Errors are automatically caught and formatted by `handleApiError()`

### Public Route Pattern

**Location**: `src/app/api/(public)/projects/[projectId]/deployments/route.ts`

**Standard pattern for <projectId>.lupa.build API routes**:

```typescript
export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ projectId: string }>;
  }
) {
  try {
    // 1. Extract params (authentication already done in middleware)
    const { projectId } = await params;

    // 2. Validate input with Zod
    const json = await request.json();
    const data = Schema.parse(json);

    // 3. Verify project exists
    const project = await db.query.Project.findFirst({
      where: eq(schema.Project.id, projectId),
    });

    if (!project) {
      return Response.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // 4. Perform business logic
    const result = await performOperation(project, data);

    // 5. Return JSON response
    return Response.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { error: "Validation failed", details: error.errors },
        { status: 400 }
      );
    }

    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
```

**Key characteristics**:
- No authentication logic (handled in middleware)
- Zod validation for all inputs
- Proper error handling (distinguish validation vs runtime errors)
- OpenAPI documentation comments
- Use `Response.json()` (not `NextResponse.json()`)

## Developer Guidelines

### Adding a New Public API Endpoint

1. **Create route file**: `src/app/api/(public)/projects/[projectId]/your-endpoint/route.ts`
2. **Add rewrite rule**: In `src/lib/proxy-routes.ts`, add new route config to `SUBDOMAIN_ROUTES` array
3. **Implement handler**: Follow the public route pattern
4. **Add validation**: Use Zod schemas for all inputs
5. **Document**: Add OpenAPI JSDoc comments
6. **Test**: Verify with both API key and internal token auth

**Example**:
```typescript
/**
 * Your endpoint description
 * @description Detailed description
 * @response 200:SuccessSchema
 * @response 400:ErrorResponseSchema
 * @openapi
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  // Implementation
}
```

### Adding a New Application Endpoint

1. **Create route file**: `src/app/api/your-endpoint/route.ts`
2. **Follow pattern**: Use the application route pattern with utilities
3. **Use utilities**: Import `extractSessionOrgId`, `validateProjectOwnership`, `proxyToPublicAPI`, and `handleApiError` from `@/lib/api-proxy` and `@/lib/api-error`
4. **Parse input**: Use Zod schemas for validation
5. **Proxy request**: Call `proxyToPublicAPI()` with appropriate parameters
6. **Handle errors**: Wrap in try-catch and return `handleApiError(error)`

**Checklist**:
- [ ] Import utilities from `@/lib/api-proxy` and `@/lib/api-error`
- [ ] Extract orgId with `await extractSessionOrgId(auth)`
- [ ] Parse request body with Zod
- [ ] Validate ownership with `await validateProjectOwnership(db, schema, projectId, orgId)`
- [ ] Proxy with `await proxyToPublicAPI(projectId, endpoint, options)`
- [ ] Catch and handle errors with `handleApiError(error)`

### Authentication Checklist

**For Public Routes**:
- [ ] Authentication handled in middleware (no additional checks needed in route)
- [ ] Assume `projectId` param is authenticated
- [ ] Focus on input validation and business logic

**For Application Routes**:
- [ ] Check `await auth()` session exists
- [ ] Verify `session.orgId` is present
- [ ] Verify project ownership with DB query
- [ ] Generate fresh internal token (never reuse)
- [ ] Include `X-Internal-Token` in headers when proxying

**For Middleware**:
- [ ] Validate subdomain matches projectId pattern
- [ ] Check internal token first (priority)
- [ ] Fall back to API key validation
- [ ] Return 403 with clear error message if unauthorized

### URL Design Principles

1. **Public URLs should be simple and resource-oriented**
   - Good: `/api/search?query=foo`
   - Bad: `/api/projects/123/deployments/456/search/foo`

2. **Avoid exposing internal IDs when possible**
   - Use subdomain for projectId: `<projectId>.lupa.build`
   - Use header for deploymentId: `Deployment-Id: dep_xyz`

3. **Use query params for optional filters, path params for required identifiers**
   - Good: `/api/documents?type=website`
   - Bad: `/api/documents/filter/website`

4. **Keep URL depth shallow (max 3-4 segments)**
   - Good: `/api/documents/bulk`
   - Bad: `/api/projects/documents/operations/bulk`

5. **Use standard HTTP methods**
   - GET: Retrieve resources
   - POST: Create resources
   - PATCH/PUT: Update resources
   - DELETE: Remove resources

## Examples & Use Cases

### Example 1: External API Consumer Flow

**Scenario**: User makes search request with API key

```bash
curl https://proj_abc123.lupa.build/api/search?query=refund \
  -H "Authorization: Bearer lupa_sk_..." \
  -H "Deployment-Id: dep_xyz789"
```

**Processing flow**:

1. **Request arrives** at Next.js server

2. **Middleware (`proxy.ts`) executes**:
   - Extracts subdomain: `proj_abc123` → `projectId = "proj_abc123"`
   - Extracts `Authorization` header: `lupa_sk_...`
   - Validates API key:
     - Hashes key with SHA-256
     - Checks Redis cache
     - Validates against projectId
     - Returns `{ valid: true }`
   - Extracts `Deployment-Id` header: `dep_xyz789`
   - Rewrites URL: `/api/projects/proj_abc123/deployments/dep_xyz789/search/refund`
   - Continues to route handler

3. **Route handler executes**: `src/app/api/(public)/projects/[projectId]/deployments/[deploymentId]/search/[query]/route.ts`
   - Extracts params: `{ projectId, deploymentId, query }`
   - Performs vector search with Upstash
   - Returns results

4. **Response returned** to client

### Example 2: WWW Application Flow

**Scenario**: Authenticated user searches via web UI

```typescript
// Frontend code
const response = await fetch(
  'https://www.lupa.build/api/search?projectId=proj_abc123&deploymentId=dep_xyz789&query=refund',
  {
    method: 'POST',
    // Clerk session cookie automatically included
  }
);
```

**Processing flow**:

1. **Request arrives** at www.lupa.build

2. **Application route executes**: `src/app/api/search/route.ts`
   - Validates Clerk session: `await auth()`
   - Extracts `orgId` from session
   - Parses query params: `{ projectId, deploymentId, query }`
   - Queries database:
     ```typescript
     const [project] = await db
       .select()
       .from(schema.Project)
       .where(
         and(
           eq(schema.Project.id, projectId),
           eq(schema.Project.org_id, orgId)
         )
       );
     ```
   - Verifies project ownership
   - Generates internal token:
     ```typescript
     const internalToken = generateInternalToken(projectId);
     // Token expires in 5 seconds
     ```

3. **Proxy request** to public API:
   ```typescript
   const response = await fetch(
     `https://proj_abc123.lupa.build/api/search?query=refund`,
     {
       headers: {
         'Deployment-Id': deploymentId,
         'X-Internal-Token': internalToken,
       },
     }
   );
   ```

4. **Middleware validates internal token**:
   - Extracts `X-Internal-Token` header
   - Decodes base64, splits payload and signature
   - Verifies issuer is `"lupa-internal"`
   - Checks token hasn't expired (5s window)
   - Verifies projectId matches subdomain
   - Recomputes HMAC and compares (timing-safe)
   - Allows request through

5. **Public route handler executes** (same as Example 1)

6. **Response proxied back** to www API route

7. **Response returned** to frontend

### Example 3: Creating a Document

**External API (direct)**:

```bash
curl -X POST https://proj_abc123.lupa.build/api/documents?type=website \
  -H "Authorization: Bearer lupa_sk_..." \
  -H "Content-Type: application/json" \
  -d '{
    "folder": "/docs/",
    "name": "Privacy Policy",
    "url": "https://example.com/privacy",
    "enhance": true
  }'
```

**WWW Application (proxied)**:

```typescript
// Frontend
await fetch('https://www.lupa.build/api/documents', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    projectId: 'proj_abc123',
    type: 'website',
    folder: '/docs/',
    name: 'Privacy Policy',
    url: 'https://example.com/privacy',
    enhance: true,
  }),
});

// Backend (src/app/api/documents/route.ts)
// 1. Validate Clerk session
// 2. Extract projectId, verify ownership
// 3. Generate internal token
// 4. Strip projectId/type from body
// 5. Proxy to https://proj_abc123.lupa.build/api/documents?type=website
// 6. Include X-Internal-Token header
// 7. Return response
```

## Decision Log & Trade-offs

### Why subdomain-based routing?

**Pros**:
- Clean API URLs (no projectId in path)
- Natural multi-tenancy isolation
- Better visual separation of projects
- Easier to reason about security boundaries

**Cons**:
- Localhost development complexity (`.localhost` domain)
- Vercel preview handling requires special logic
- SSL certificate management (wildcard cert needed)

**Decision**: Worth it for production DX and clean API surface

### Why internal tokens instead of API keys for www→subdomain?

**Pros**:
- Short-lived (5s) minimizes replay attack window
- Server-generated, can't leak to client
- Can include additional claims (issuer, expiry)
- Separate security boundary from user API keys

**Cons**:
- Additional crypto overhead (HMAC computation)
- More complex to debug than simple API keys
- Requires clock synchronization between services

**Decision**: Better security model worth the complexity

### Why proxy pattern instead of direct DB access in app routes?

**Pros**:
- Single source of truth for business logic
- Public API can be tested independently
- Reusable logic (avoid duplication)
- Forces clean API boundaries
- Better separation of concerns

**Cons**:
- Extra network hop (www → subdomain)
- Slightly higher latency (~10-20ms)
- More complex debugging (two layers)

**Decision**: Maintainability and architectural clarity > minor performance cost

### Why middleware auth instead of per-route?

**Pros**:
- Centralized authentication logic
- Runs before route handlers (early rejection)
- Reduces boilerplate in every route
- Consistent security across all routes
- Can't accidentally forget to add auth

**Cons**:
- Less flexible per-route auth logic
- Harder to have route-specific auth rules
- All-or-nothing approach

**Decision**: Consistency and security over flexibility. Special cases can still be handled in routes.

### Why separate (public) directory?

**Pros**:
- Clear visual separation of external vs internal APIs
- Next.js route groups don't affect URL structure
- Easy to identify which routes are publicly documented
- Can apply different conventions per directory

**Cons**:
- Slightly more complex file structure
- Developers must remember the distinction
- Duplicate route paths (e.g., `/api/search` in both places)

**Decision**: Clear mental model worth the extra directory

## API Utilities

### Error Handling (`src/lib/api-error.ts`)

**ErrorCode Constants**:
```typescript
const ErrorCode = {
  INVALID_API_KEY: "INVALID_API_KEY",
  UNAUTHORIZED: "UNAUTHORIZED",
  ORGANIZATION_NOT_FOUND: "ORGANIZATION_NOT_FOUND",
  PROJECT_NOT_FOUND: "PROJECT_NOT_FOUND",
  DEPLOYMENT_NOT_FOUND: "DEPLOYMENT_NOT_FOUND",
  DOCUMENT_NOT_FOUND: "DOCUMENT_NOT_FOUND",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  MISSING_PARAMETER: "MISSING_PARAMETER",
  FORBIDDEN: "FORBIDDEN",
} as const;
```

**ApiError Class**:
```typescript
class ApiError extends Error {
  constructor(
    public code: ErrorCodeType,
    message: string,
    public status: number,
    public details?: unknown,
  )
}
```

**Usage**:
```typescript
throw new ApiError(ErrorCode.PROJECT_NOT_FOUND, "Project not found", 404);
```

**handleApiError(error: unknown)**:
- Automatically converts `ApiError` to proper JSON response
- Handles `ZodError` with validation details
- Detects common error messages and maps to appropriate codes
- Returns standardized error response format

### Proxy Utilities (`src/lib/api-proxy.ts`)

**proxyToPublicAPI<T>(projectId, endpoint, options, responseSchema?)**:
- Generates internal token automatically
- Makes fetch request to public API subdomain
- Optionally validates response with Zod schema
- Returns NextResponse with proper status code
- Handles errors automatically

**Usage**:
```typescript
return await proxyToPublicAPI(
  projectId,
  "/documents",
  {
    method: "POST",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
    deploymentId: "dep_123", // Optional
  },
);
```

**extractSessionOrgId(auth)**:
- Validates Clerk session
- Extracts orgId from session
- Throws `ApiError` if orgId is missing
- Returns orgId string

**validateProjectOwnership(db, schema, projectId, orgId)**:
- Queries database for project
- Verifies orgId matches project's organization
- Throws `ApiError` if project not found or access denied
- Returns project record

### Route Configuration (`src/lib/proxy-routes.ts`)

**SUBDOMAIN_ROUTES** - Route registry for subdomain URL rewrites:

Each route config has:
- `pattern`: RegExp to match URL pathname
- `requiresDeploymentId`: Boolean flag for routes needing deployment context
- `rewrite`: Function that returns rewritten internal path

**Example**:
```typescript
{
  pattern: /^\/api\/search/,
  requiresDeploymentId: true,
  rewrite: (ctx) => {
    const query = ctx.searchParams.get("query");
    if (!query || !ctx.deploymentId) return null;
    return `/api/projects/${ctx.projectId}/deployments/${ctx.deploymentId}/search/${encodeURIComponent(query)}`;
  },
}
```

**matchRoute(ctx: RouteRewriteContext)**:
- Iterates through SUBDOMAIN_ROUTES
- Returns first matching rewrite path
- Returns null if no match or missing required parameters

## Utility Functions

### `getAPIBaseURL(projectId: string): string`

**Location**: `src/lib/utils.ts:18`

**Purpose**: Generate the base URL for a project's public API

**Returns**: `https://<projectId>.lupa.build/api` (production) or `http://<projectId>.localhost:3000/api` (development)

**Usage**:
```typescript
const url = `${getAPIBaseURL(projectId)}/documents`;
```

### `generateInternalToken(projectId: string): string`

**Location**: `src/lib/crypto/internal-token.ts:9`

**Purpose**: Generate a short-lived internal token for server-to-server communication

**Returns**: Base64-encoded token with HMAC signature

**Usage**:
```typescript
const token = generateInternalToken(projectId);
const response = await fetch(url, {
  headers: { 'X-Internal-Token': token }
});
```

**Note**: Generate a fresh token for each request (never reuse)

### `verifyInternalToken(token: string, expectedProjectId: string): boolean`

**Location**: `src/lib/crypto/internal-token.ts:30`

**Purpose**: Verify an internal token is valid and matches the expected project

**Returns**: `true` if valid, `false` otherwise

**Usage**:
```typescript
if (verifyInternalToken(token, projectId)) {
  // Token is valid
}
```

### `validateApiKey(req: NextRequest, event: NextFetchEvent, projectId?: string)`

**Location**: `src/lib/crypto/api-key.ts:27`

**Purpose**: Validate an API key from the Authorization header

**Returns**: `{ valid: boolean, apiKeyId?: string, projectId?: string, data?: ValidatedApiKey }`

**Usage**:
```typescript
const { valid, data } = await validateApiKey(req, event, projectId);
if (!valid) {
  return new Response('Unauthorized', { status: 403 });
}
```

### `hashApiKey(apiKey: string): string`

**Location**: `src/lib/crypto/api-key.ts:8`

**Purpose**: Hash an API key for storage/lookup

**Returns**: SHA-256 hex digest

**Usage**:
```typescript
const keyHash = hashApiKey(apiKey);
await redis.get(`apikey:${keyHash}`);
```

## Security Considerations

### API Key Storage

- **Never store plain text**: Always hash with SHA-256
- **Use Redis caching**: Reduces DB load, 30-day TTL
- **Soft delete**: Set `is_active = false` instead of deleting records
- **Include metadata**: Store `org_id`, `project_id` for scoping

### Internal Token Security

- **Short TTL**: 5 seconds prevents replay attacks
- **HMAC signing**: Prevents tampering with payload
- **Timing-safe comparison**: Prevents timing attacks on signature validation
- **Issuer validation**: Prevents token confusion attacks
- **Project scoping**: Token can't be reused for different projects

### Middleware Security

- **Early rejection**: Authenticate before routing
- **Clear error messages**: Return 403 with JSON error (don't leak info)
- **No token in logs**: Avoid logging sensitive headers
- **Rate limiting**: (TODO) Add rate limiting per API key

### Database Security

- **Ownership checks**: Always verify org_id matches user's organization
- **Prepared statements**: Drizzle ORM prevents SQL injection
- **Connection pooling**: Use `-pooler` suffix for most queries
- **Direct connection**: Use direct connection (no `-pooler`) for transactions requiring txid

## Monitoring & Observability

### Tinybird Analytics

**Datasources**:
- `api_key_usage`: Tracks API key usage per request
- `search_api_logs`: Logs search queries and results
- `search_results`: Stores individual search result details

**Location**: `src/tinybird/datasources/`

**Usage**:
```typescript
import { logSearchRequest } from '@/lib/tinybird';

await logSearchRequest({
  projectId,
  deploymentId,
  query,
  resultCount,
  latency,
  apiKeyId,
});
```

### API Key Last Used

Updated asynchronously on each request:

```typescript
event.waitUntil(
  updateLastUsed(apiKey.id).catch(console.error)
);
```

**Benefits**:
- Non-blocking (doesn't affect request latency)
- Helps identify unused/stale keys
- Useful for security audits

### Request Logging

**Current**: Basic console.error for errors

**Future**: Add structured logging with:
- Request ID
- User/org context
- Latency metrics
- Error details

## FAQ

### Q: Why are there two `/api/search` routes?

A: One is for external API consumers (in `(public)` directory), one is for the www application. The www route validates Clerk auth and proxies to the public route.

### Q: Can I call the public API directly from www frontend?

A: No. The public API requires an API key, which should never be exposed to the frontend. Always go through the www application API routes, which use Clerk sessions.

### Q: What happens if an internal token expires mid-request?

A: The middleware validates the token before the route handler executes, so if it's expired, the request is rejected immediately with 403.

### Q: Can I reuse an internal token for multiple requests?

A: No. Generate a fresh token for each request. Tokens expire after 5 seconds, so reuse is unreliable and defeats the security purpose.

### Q: Why does the middleware return plain JSON instead of Response.json()?

A: Historical artifact that should be refactored. See "Areas for Improvement" section.

### Q: How do I test subdomain routing locally?

A: Use `<projectId>.localhost:3000`. Modern browsers resolve `*.localhost` automatically. For older browsers, add entries to `/etc/hosts`.

### Q: What happens if Redis is down?

A: API key validation falls back to PostgreSQL directly. Performance will degrade but requests won't fail.

### Q: Can one API key access multiple projects?

A: No. Each API key is scoped to a single project. The validation checks that the key's `project_id` matches the subdomain.

### Q: How do I invalidate an API key immediately?

A: Call `revokeApiKey(keyId)` which sets `is_active = false` and deletes the Redis cache entry.

### Q: What's the difference between `Deployment-Id` header and path param?

A: The public API uses a header for simplicity. The middleware extracts this header and includes it in the internal route path when rewriting.

## Related Documentation

- [Analytics Architecture](./analytics.md) - Tinybird integration and metrics
- [Document Parsing](../src/lib/parsers/README.md) - Parser system architecture
- [Database Schema](../drizzle/README.md) - Drizzle schema documentation
- [Real-time Sync](./electric.md) - TanStack Electric integration
- [Background Jobs](./trigger.md) - Trigger.dev task documentation

## Implementation Notes

### Recent Improvements (2025-01-27)

The following improvements have been implemented to enhance code quality, maintainability, and consistency:

1. **Standardized Error Handling** (`src/lib/api-error.ts`):
   - Created `ApiError` class for structured error handling
   - Defined error code constants for consistent error identification
   - Implemented `handleApiError()` for automatic error response formatting
   - All errors now return consistent JSON structure with error codes

2. **Proxy Utility Functions** (`src/lib/api-proxy.ts`):
   - Created `proxyToPublicAPI()` to eliminate code duplication
   - Implemented `extractSessionOrgId()` for consistent session validation
   - Added `validateProjectOwnership()` for reusable ownership checks
   - Reduced application route code by ~60%

3. **Route Configuration Registry** (`src/lib/proxy-routes.ts`):
   - Extracted URL rewrite logic from middleware into declarative config
   - Created `SUBDOMAIN_ROUTES` array for easy route management
   - Simplified adding new routes (just add to config array)
   - Improved readability and maintainability of `proxy.ts`

4. **Refactored Application Routes**:
   - Updated `/api/search`, `/api/documents`, `/api/snapshots`, `/api/deployments`
   - All routes now use shared utilities
   - Consistent error handling across all routes
   - Reduced boilerplate and improved code clarity

### Future Considerations

- **Rate Limiting**: Add Redis-based rate limiting per API key
- **Request Tracing**: Implement OpenTelemetry for distributed tracing
- **Testing**: Add integration tests for auth flows and URL rewrites
- **Logging**: Enhance structured logging with request context

## Changelog

- **2025-01-27**: Initial documentation created and major architectural improvements implemented

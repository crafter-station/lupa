# API Utilities

This document describes the utility functions and helper libraries available for building Lupa API routes, including error handling, API proxying, and validation utilities.

## Overview

Lupa provides a set of reusable utilities to simplify common API operations:

```
┌─────────────────────────────────────────────────────────────┐
│                      Utility Modules                         │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  @/lib/api-error.ts                                          │
│  └─ Error handling, standardized error responses            │
│                                                               │
│  @/lib/api-proxy.ts                                          │
│  └─ Proxy utilities, session validation, ownership checks   │
│                                                               │
│  @/lib/proxy-routes.ts                                       │
│  └─ URL rewriting configuration                              │
│                                                               │
│  @/lib/utils.ts                                              │
│  └─ General utilities (getAPIBaseURL, cn, etc.)             │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

## Error Handling (`@/lib/api-error.ts`)

Standardized error handling for consistent API responses.

### ErrorCode Constants

All possible error codes in the system:

```typescript
export const ErrorCode = {
  // Authentication
  INVALID_API_KEY: "INVALID_API_KEY",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  READ_ONLY_KEY: "READ_ONLY_KEY",
  
  // Resources
  ORGANIZATION_NOT_FOUND: "ORGANIZATION_NOT_FOUND",
  PROJECT_NOT_FOUND: "PROJECT_NOT_FOUND",
  DEPLOYMENT_NOT_FOUND: "DEPLOYMENT_NOT_FOUND",
  DOCUMENT_NOT_FOUND: "DOCUMENT_NOT_FOUND",
  NO_PRODUCTION_DEPLOYMENT: "NO_PRODUCTION_DEPLOYMENT",
  NO_STAGING_DEPLOYMENT: "NO_STAGING_DEPLOYMENT",
  DEPLOYMENT_NOT_IN_PROJECT: "DEPLOYMENT_NOT_IN_PROJECT",
  DEPLOYMENT_NOT_READY: "DEPLOYMENT_NOT_READY",
  
  // Validation
  VALIDATION_ERROR: "VALIDATION_ERROR",
  MISSING_PARAMETER: "MISSING_PARAMETER",
  
  // Database
  DUPLICATE_DOCUMENT: "DUPLICATE_DOCUMENT",
  CONSTRAINT_VIOLATION: "CONSTRAINT_VIOLATION",
  DATABASE_ERROR: "DATABASE_ERROR",
  
  // General
  INTERNAL_ERROR: "INTERNAL_ERROR",
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];
```

### ApiError Class

Custom error class for structured error handling:

```typescript
export class ApiError extends Error {
  constructor(
    public code: ErrorCodeType,
    message: string,
    public status: number,
    public details?: unknown,
  )
  
  toJSON(): ApiErrorResponse
  toResponse(): NextResponse<ApiErrorResponse>
}
```

**Usage**:

```typescript
import { ApiError, ErrorCode } from "@/lib/api-error";

// Throw structured error
throw new ApiError(
  ErrorCode.PROJECT_NOT_FOUND,
  "Project not found",
  404
);

// With details
throw new ApiError(
  ErrorCode.VALIDATION_ERROR,
  "Invalid input",
  400,
  { field: "name", issue: "required" }
);
```

### handleApiError()

Catch-all error handler that converts any error to a standardized response:

```typescript
export function handleApiError(
  error: unknown
): NextResponse<ApiErrorResponse>
```

**Features**:
- Converts `ApiError` to proper JSON response
- Handles `ZodError` with validation details
- Detects PostgreSQL errors and maps to appropriate codes
- Provides detailed errors in development, sanitized in production
- Logs unhandled errors for debugging

**Usage**:

```typescript
export async function POST(req: NextRequest) {
  try {
    // Your route logic
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleApiError(error);
  }
}
```

**PostgreSQL Error Handling**:

Automatically detects and handles common database errors:

| Postgres Code | Error Code | HTTP Status | Description |
|---------------|------------|-------------|-------------|
| `23505` | `DUPLICATE_DOCUMENT` / `CONSTRAINT_VIOLATION` | 409 | Unique constraint violation |
| `23503` | `DATABASE_ERROR` | 400 | Foreign key violation |
| `23502` | `DATABASE_ERROR` | 400 | NOT NULL violation |
| `23514` | `DATABASE_ERROR` | 400 | CHECK constraint violation |
| `22P02` | `DATABASE_ERROR` | 400 | Invalid text representation |

**Example Error Response**:

```json
{
  "error": {
    "code": "DUPLICATE_DOCUMENT",
    "message": "A document named 'Privacy Policy' already exists in folder '/docs/'",
    "details": {
      "constraint": "document_project_folder_name_unique",
      "folder": "/docs/",
      "name": "Privacy Policy"
    }
  }
}
```

### createErrorResponse()

Create a standardized error response without throwing:

```typescript
export function createErrorResponse(
  code: ErrorCodeType,
  message: string,
  status: number,
  details?: unknown,
): NextResponse<ApiErrorResponse>
```

**Usage**:

```typescript
if (!project) {
  return createErrorResponse(
    ErrorCode.PROJECT_NOT_FOUND,
    "Project not found",
    404
  );
}
```

---

## API Proxy Utilities (`@/lib/api-proxy.ts`)

Utilities for proxying requests from application routes to public API routes.

### proxyToPublicAPI()

Proxy a request to the public API with automatic internal token generation:

```typescript
export async function proxyToPublicAPI<T = unknown>(
  projectId: string,
  endpoint: string,
  options: ProxyOptions = {},
  responseSchema?: ZodSchema<T>,
): Promise<NextResponse<T | ApiErrorResponse>>
```

**ProxyOptions**:

```typescript
interface ProxyOptions {
  method?: string;               // HTTP method (default: GET)
  body?: BodyInit;               // Request body
  headers?: Record<string, string>; // Additional headers
  deploymentId?: string;         // Optional deployment ID
}
```

**Features**:
- Generates internal token automatically
- Constructs correct public API URL
- Includes `Deployment-Id` header if provided
- Optionally validates response with Zod schema
- Returns standardized NextResponse
- Handles errors automatically

**Usage**:

```typescript
import { proxyToPublicAPI } from "@/lib/api-proxy";

// Simple proxy
return await proxyToPublicAPI(
  projectId,
  "/documents"
);

// With options
return await proxyToPublicAPI(
  projectId,
  "/documents",
  {
    method: "POST",
    body: JSON.stringify(data),
    headers: { "Content-Type": "application/json" },
    deploymentId: "def4567890",
  }
);

// With response validation
return await proxyToPublicAPI(
  projectId,
  "/search",
  { method: "GET" },
  SearchResponseSchema // Zod schema
);
```

### extractSessionOrgId()

Extract and validate organization ID from Clerk session:

```typescript
export async function extractSessionOrgId(): Promise<string>
```

**Features**:
- Validates Clerk session exists
- Extracts `orgId` from session
- Throws `ApiError` if session or orgId missing
- Returns orgId string

**Usage**:

```typescript
import { auth } from "@clerk/nextjs/server";
import { extractSessionOrgId } from "@/lib/api-proxy";

export async function POST(req: NextRequest) {
  try {
    const orgId = await extractSessionOrgId();
    // orgId is guaranteed to be present
  } catch (error) {
    return handleApiError(error); // Returns 400 with ORGANIZATION_NOT_FOUND
  }
}
```

**Throws**:
- `ApiError(ORGANIZATION_NOT_FOUND, "Organization not found", 400)` if orgId missing

### validateProjectOwnership()

Validate that an organization owns a project:

```typescript
export async function validateProjectOwnership(
  projectId: string,
  orgId: string,
): Promise<Project>
```

**Features**:
- Queries database for project
- Verifies orgId matches project's org_id
- Throws `ApiError` if not found or unauthorized
- Returns project record if valid

**Usage**:

```typescript
import { validateProjectOwnership } from "@/lib/api-proxy";

const orgId = await extractSessionOrgId();
const project = await validateProjectOwnership(projectId, orgId);

// Project ownership confirmed, proceed with operation
```

**Throws**:
- `ApiError(PROJECT_NOT_FOUND, "Project not found", 404)` if project not found or wrong org

---

## Complete Application Route Pattern

Combining all utilities for a clean, standardized route:

```typescript
import { auth } from "@clerk/nextjs/server";
import type { NextRequest } from "next/server";
import { z } from "zod/v3";
import {
  proxyToPublicAPI,
  extractSessionOrgId,
  validateProjectOwnership,
} from "@/lib/api-proxy";
import { handleApiError } from "@/lib/api-error";

const RequestSchema = z.object({
  projectId: z.string(),
  name: z.string(),
  folder: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    // 1. Extract and validate session
    const orgId = await extractSessionOrgId();

    // 2. Parse and validate input
    const body = await req.json();
    const { projectId, ...payload } = RequestSchema.parse(body);

    // 3. Verify project ownership
    await validateProjectOwnership(projectId, orgId);

    // 4. Proxy to public API
    return await proxyToPublicAPI(
      projectId,
      "/documents",
      {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return handleApiError(error);
  }
}
```

**Error handling is automatic**:
- Zod validation errors → `VALIDATION_ERROR` (400)
- Missing session → `UNAUTHORIZED` (401)
- Missing orgId → `ORGANIZATION_NOT_FOUND` (400)
- Invalid project → `PROJECT_NOT_FOUND` (404)
- Proxy errors → Forwarded from public API
- Unexpected errors → `INTERNAL_ERROR` (500)

---

## URL Rewriting (`@/lib/proxy-routes.ts`)

Configuration for rewriting public API URLs to internal routes.

### RouteConfig Interface

```typescript
interface RouteConfig {
  pattern: RegExp;                // URL pattern to match
  requiresDeploymentId?: boolean; // Whether route needs deployment
  rewrite: (ctx: RouteRewriteContext) => string | null;
}

interface RouteRewriteContext {
  projectId: string;
  deploymentId: string | null;
  searchParams: URLSearchParams;
  pathname: string;
}
```

### SUBDOMAIN_ROUTES

Array of route configurations for URL rewriting:

```typescript
export const SUBDOMAIN_ROUTES: RouteConfig[] = [
  // Search
  {
    pattern: /^\/api\/search/,
    requiresDeploymentId: true,
    rewrite: (ctx) => {
      const query = ctx.searchParams.get("query");
      if (!query || !ctx.deploymentId) return null;
      return `/api/projects/${ctx.projectId}/deployments/${ctx.deploymentId}/search/${encodeURIComponent(query)}`;
    },
  },
  
  // Documents
  {
    pattern: /^\/api\/documents/,
    rewrite: (ctx) => {
      // Handle /api/documents/{id} and /api/documents
      const pathParts = ctx.pathname.split("/").filter(Boolean);
      
      if (pathParts.length === 3) {
        const documentId = pathParts[2];
        return `/api/projects/${ctx.projectId}/documents/${documentId}`;
      }
      
      return `/api/projects/${ctx.projectId}/documents`;
    },
  },
  
  // Add more routes...
];
```

### matchRoute()

Find and execute matching route rewrite:

```typescript
export function matchRoute(
  ctx: RouteRewriteContext
): string | null
```

**Usage** (in middleware):

```typescript
const ctx: RouteRewriteContext = {
  projectId,
  deploymentId,
  searchParams: url.searchParams,
  pathname: url.pathname,
};

const rewritePath = matchRoute(ctx);

if (rewritePath) {
  const rewriteUrl = new URL(rewritePath, req.url);
  return NextResponse.rewrite(rewriteUrl);
}
```

### requiresDeployment()

Check if a pathname requires deployment context:

```typescript
export function requiresDeployment(
  pathname: string
): boolean
```

**Usage**:

```typescript
const needsDeployment = requiresDeployment("/api/search");
// Returns: true
```

---

## General Utilities (`@/lib/utils.ts`)

### getAPIBaseURL()

Generate the base URL for a project's public API:

```typescript
export function getAPIBaseURL(projectId: string): string
```

**Returns**:
- Development: `http://<projectId>.localhost:3000/api`
- Production: `https://<projectId>.lupa.build (e.g., abc1234567.lupa.build)/api`

**Usage**:

```typescript
const url = `${getAPIBaseURL(projectId)}/documents`;
// "https://abc1234567.lupa.build/api/documents"
```

### cn()

Tailwind class name utility (from clsx + tailwind-merge):

```typescript
export function cn(...inputs: ClassValue[]): string
```

**Usage**:

```typescript
<div className={cn("text-base", isActive && "text-blue-600")} />
```

---

## Validation Utilities

### generateId()

Generate 10-character alphanumeric identifiers (no prefixes):

```typescript
import { generateId } from "@/lib/generate-id";

const projectId = generateId();
// "abc1234567"

const documentId = generateId();
// "xyz7654321"
```

**Note**: Only API keys use prefixes (e.g., `lupa_sk_live_...`). All other IDs are plain alphanumeric strings.

### IdSchema

Zod schema for validating IDs:

```typescript
import { IdSchema } from "@/lib/generate-id";

const schema = z.object({
  projectId: IdSchema,
});
```

---

## Example: Complete Public Route

Public routes don't need proxy utilities but use error handling:

```typescript
import { eq } from "drizzle-orm";
import { z } from "zod/v3";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { handleApiError, ErrorCode, createErrorResponse } from "@/lib/api-error";

const CreateDeploymentSchema = z.object({
  snapshotId: z.string(),
  environment: z.enum(["production", "staging"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    
    // Validate input
    const json = await request.json();
    const data = CreateDeploymentSchema.parse(json);
    
    // Verify project exists
    const project = await db.query.Project.findFirst({
      where: eq(schema.Project.id, projectId),
    });
    
    if (!project) {
      return createErrorResponse(
        ErrorCode.PROJECT_NOT_FOUND,
        "Project not found",
        404
      );
    }
    
    // Create deployment
    const deployment = await db.insert(schema.Deployment).values({
      id: generateId(),
      project_id: projectId,
      snapshot_id: data.snapshotId,
      environment: data.environment,
      status: "processing",
    }).returning();
    
    return Response.json(deployment[0], { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

## Testing Utilities

### Mock API Key Validation

For testing routes without real API keys:

```typescript
// test/mocks/api-key.ts
export function mockValidateApiKey(valid: boolean) {
  jest.mock("@/lib/crypto/api-key", () => ({
    validateApiKey: jest.fn().mockResolvedValue({
      valid,
      apiKeyId: "key7890123123",
      projectId: "test123456456",
      data: {
        environment: "test",
        key_type: "sk",
      },
    }),
  }));
}
```

### Mock Clerk Session

```typescript
export function mockClerkSession(orgId: string) {
  jest.mock("@clerk/nextjs/server", () => ({
    auth: jest.fn().mockResolvedValue({
      userId: "user_test123",
      orgId: orgId,
    }),
  }));
}
```

---

## Best Practices

### Error Handling

✅ **Do**:
- Always use `try-catch` with `handleApiError()`
- Throw `ApiError` for known error cases
- Use specific error codes
- Include helpful error messages
- Add details in development mode

❌ **Don't**:
- Return raw error objects
- Use generic error messages
- Expose sensitive information in errors
- Forget to catch async errors

### API Proxying

✅ **Do**:
- Use `proxyToPublicAPI()` for all WWW → subdomain requests
- Generate fresh internal tokens per request
- Validate ownership before proxying
- Pass deployment ID when needed

❌ **Don't**:
- Bypass proxy for direct DB access from WWW routes
- Reuse internal tokens
- Skip ownership validation
- Hardcode API URLs

### Validation

✅ **Do**:
- Use Zod schemas for all inputs
- Validate at route boundaries
- Use `drizzle-zod` for DB schemas
- Parse before business logic

❌ **Don't**:
- Trust client input
- Skip validation for "trusted" sources
- Use runtime type checks instead of Zod

---

## Debugging

### Enable Detailed Errors

In development, errors include full details:

```json
{
  "error": {
    "code": "DATABASE_ERROR",
    "message": "Database operation failed",
    "details": {
      "code": "23505",
      "constraint": "document_project_folder_name_unique",
      "detail": "Key (project_id, folder, name)=(proj_123, /docs/, Privacy Policy) already exists."
    }
  }
}
```

### Logging

Add console.log in error handlers:

```typescript
} catch (error) {
  console.error("Route error:", {
    endpoint: req.nextUrl.pathname,
    error: error instanceof Error ? error.message : error,
  });
  return handleApiError(error);
}
```

---

## Related Documentation

- [API Routes Architecture](./api-routes.md) - Overall system design
- [Authentication](./authentication.md) - Auth utilities
- [Public API Reference](./public-api-reference.md) - API endpoints
- [Deployments](./deployments.md) - Deployment utilities

---

## Changelog

- **2025-10-28**: Initial utilities documentation
- **2025-10-28**: Documented new error codes
- **2025-10-28**: Added validateProjectOwnership signature update
- **2025-10-28**: Documented PostgreSQL error handling

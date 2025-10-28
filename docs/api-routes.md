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
│  <projectId>.lupa.build (e.g., abc1234567.lupa.build)/api/...     │
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

---

## Documentation Structure

This documentation is organized into focused topics for easier navigation:

### 📚 **Core Documentation**

1. **[Authentication](./authentication.md)** - Authentication system overview
   - API key authentication
   - Internal token system
   - Clerk sessions
   - Middleware authentication flow

2. **[API Keys](./api-keys.md)** - API key management and validation
   - Key types (secret vs public)
   - Environments (live vs test)
   - Validation flow and caching
   - Best practices

3. **[Deployments](./deployments.md)** - Deployment system
   - Production and staging environments
   - Auto-resolution based on API key environment
   - Promotion workflows
   - Redis caching strategies

4. **[Public API Reference](./public-api-reference.md)** - Complete API endpoint reference
   - Search endpoints
   - Document management
   - Deployment operations
   - File system operations (agent tools)
   - MCP protocol

5. **[Utilities](./utilities.md)** - Development utilities
   - Error handling utilities
   - API proxy functions
   - URL rewriting configuration
   - Validation helpers

---

## Quick Start

### For External Developers

If you're building an application that consumes Lupa's public API:

1. **Get an API key** from your project settings
2. **Choose key type**:
   - Use `lupa_sk_*` (secret key) for server-side applications
   - Use `lupa_pk_*` (public key) for client-side/read-only access
3. **Choose environment**:
   - Use `_live_` keys for production deployments
   - Use `_test_` keys for staging deployments
4. **Make requests** to `https://<projectId>.lupa.build (e.g., abc1234567.lupa.build)/api/*`
5. **See [Public API Reference](./public-api-reference.md)** for endpoints

**Example**:

```bash
# Search with a live secret key (production deployment)
curl "https://abc1234567.lupa.build/api/search?query=refund" \
  -H "Authorization: Bearer lupa_sk_live_..."

# Search with a test key (staging deployment)
curl "https://abc1234567.lupa.build/api/search?query=refund" \
  -H "Authorization: Bearer lupa_sk_test_..."
```

### For Lupa Developers

If you're building Lupa's internal application routes:

1. **Read [Utilities](./utilities.md)** for helper functions
2. **Use standard patterns** documented in each utility
3. **Follow authentication flow** from [Authentication](./authentication.md)
4. **Handle errors** with utilities from [Utilities](./utilities.md)

**Example Application Route**:

```typescript
import { proxyToPublicAPI, extractSessionOrgId, validateProjectOwnership } from "@/lib/api-proxy";
import { handleApiError } from "@/lib/api-error";

export async function POST(req: NextRequest) {
  try {
    const orgId = await extractSessionOrgId();
    const body = await req.json();
    const { projectId, ...payload } = RequestSchema.parse(body);
    
    await validateProjectOwnership(projectId, orgId);
    
    return await proxyToPublicAPI(projectId, "/endpoint", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

## Core Concepts

### Public API Routes

**Location**: `src/app/api/(public)/projects/[projectId]/...`

**Purpose**: External-facing API consumed by end-users with API keys

**URL Pattern**: `https://<projectId>.lupa.build (e.g., abc1234567.lupa.build)/api/...`

**Authentication**: API Key via `Authorization: Bearer` header

**Key Features**:
- Clean, resource-oriented URLs
- Authentication handled centrally in middleware
- Automatic deployment resolution based on key environment
- Read-only restrictions for public keys
- Documented with OpenAPI annotations

**See**: [Public API Reference](./public-api-reference.md) for complete endpoint list

### Application API Routes

**Location**: `src/app/api/...` (without `(public)` directory)

**Purpose**: Internal routes for www.lupa.build web application

**URL Pattern**: `https://www.lupa.build/api/...`

**Authentication**: Clerk session-based auth

**Behavior**: Validates authorization and proxies to Public API routes

**Key Features**:
- Validates Clerk session and organization ownership
- Generates short-lived internal tokens (5s TTL)
- Proxies requests to public API subdomain
- Returns responses transparently to client

**See**: [Utilities](./utilities.md) for proxy patterns

---

## Architecture Principles

### 1. Separation of Concerns

**Public API**: Clean, simple interface optimized for external consumption

**Application API**: Business logic layer with authorization, validation, orchestration

**Benefits**: 
- APIs can evolve independently
- Clear security boundaries
- Simpler API documentation for external users
- Internal complexity hidden from public interface

### 2. Security in Depth

Multiple authentication layers:
- **API Keys**: External authentication ([see API Keys](./api-keys.md))
- **Internal Tokens**: Server-to-server communication ([see Authentication](./authentication.md))
- **Clerk Sessions**: Web application authentication ([see Authentication](./authentication.md))

**Why**: Multiple layers prevent unauthorized access even if one layer is compromised

### 3. URL Beautification

**External**: `<projectId>.lupa.build (e.g., abc1234567.lupa.build)/api/search?query=foo`

**Internal**: `/api/projects/{projectId}/deployments/{deploymentId}/search/{foo}`

**Benefits**:
- Better developer experience
- Cleaner API documentation
- Hides internal complexity
- Natural multi-tenancy (projectId in subdomain)

### 4. Performance Optimization

- **Redis caching**: API keys cached for 30 days, deployments for 1 hour
- **waitUntil**: Non-blocking operations for timestamps and analytics
- **Sub-50ms P95 latency**: For authentication without blocking requests

**See**: [API Keys](./api-keys.md) and [Deployments](./deployments.md) for caching details

### 5. Zero Trust Between Services

Even internal requests (www → subdomain) require authentication via internal tokens.

**Why**: 
- Defense against compromised internal services
- Clear audit trail of all requests
- Prevents privilege escalation

**See**: [Authentication](./authentication.md) for internal token details

---

## Middleware System

The `src/proxy.ts` file is the heart of the routing system. It runs on every request and handles:

1. **Subdomain extraction** - Handles localhost, production, and Vercel previews
2. **Authentication** - API keys and internal tokens
3. **Deployment resolution** - Auto-selects production/staging based on key environment
4. **URL rewriting** - Transforms public URLs to internal routes
5. **Permission checking** - Enforces read-only restrictions for public keys

**Flow**:

```
Request → Middleware
  ├─ Extract subdomain (projectId)
  ├─ Authenticate (internal token OR API key)
  ├─ Check read-only restrictions (if public key)
  ├─ Resolve deployment (if needed)
  ├─ Rewrite URL
  └─ Continue to route handler
```

**See**: 
- [Authentication](./authentication.md) for authentication flow
- [Deployments](./deployments.md) for deployment resolution
- [Utilities](./utilities.md) for URL rewriting configuration

---

## Key Features

### API Key Environments

API keys have an environment (`live` or `test`) that determines default deployment resolution:

- **Live keys** (`lupa_sk_live_*`) → Production deployment
- **Test keys** (`lupa_sk_test_*`) → Staging deployment

Users can override with explicit `Deployment-Id` header.

**See**: [API Keys](./api-keys.md) and [Deployments](./deployments.md)

### Public vs Secret Keys

- **Secret keys** (`lupa_sk_*`): Full read/write access
- **Public keys** (`lupa_pk_*`): Read-only access

Public keys attempting write operations receive `READ_ONLY_KEY` error.

**See**: [API Keys](./api-keys.md)

### Deployment Promotion

Deployments can be promoted from staging to production with validation:

```bash
POST /api/deployments/{id}/promote
```

Requirements:
- Deployment must be `ready`
- Only one production deployment per project
- Previous production automatically demoted to staging

**See**: [Deployments](./deployments.md) and [Public API Reference](./public-api-reference.md)

---

## Developer Guidelines

### Adding a New Public API Endpoint

1. **Create route file**: `src/app/api/(public)/projects/[projectId]/your-endpoint/route.ts`
2. **Add rewrite rule**: In `src/lib/proxy-routes.ts`, add new route config
3. **Implement handler**: Follow the public route pattern (no auth logic needed)
4. **Add validation**: Use Zod schemas for all inputs
5. **Handle errors**: Return standardized error responses
6. **Document**: Add OpenAPI JSDoc comments

**See**: [Utilities](./utilities.md) for patterns and error handling

### Adding a New Application Endpoint

1. **Create route file**: `src/app/api/your-endpoint/route.ts`
2. **Use utilities**: Import helpers from `@/lib/api-proxy` and `@/lib/api-error`
3. **Follow pattern**: Extract session → Validate ownership → Proxy to public API
4. **Handle errors**: Wrap in try-catch with `handleApiError()`

**Example pattern in [Utilities](./utilities.md)**

### Authentication Checklist

**For Public Routes**:
- ✅ Authentication handled in middleware (no additional checks needed)
- ✅ Focus on input validation and business logic
- ✅ Use `Response.json()` (not `NextResponse.json()`)

**For Application Routes**:
- ✅ Extract orgId with `await extractSessionOrgId()`
- ✅ Validate ownership with `await validateProjectOwnership(projectId, orgId)`
- ✅ Proxy with `await proxyToPublicAPI(...)`
- ✅ Handle errors with `handleApiError(error)`

**See**: [Authentication](./authentication.md) and [Utilities](./utilities.md)

---

## Decision Log & Trade-offs

### Why subdomain-based routing?

**Pros**: Clean URLs, natural multi-tenancy, better security boundaries

**Cons**: Localhost complexity, Vercel preview handling, wildcard SSL needed

**Decision**: Worth it for production DX and clean API surface

### Why internal tokens instead of API keys for www→subdomain?

**Pros**: Short-lived (5s), server-generated, can't leak to client

**Cons**: Additional crypto overhead, more complex to debug

**Decision**: Better security model worth the complexity

**See**: [Authentication](./authentication.md) for implementation details

### Why proxy pattern instead of direct DB access?

**Pros**: Single source of truth, reusable logic, clean API boundaries

**Cons**: Extra network hop (~10-20ms latency)

**Decision**: Maintainability > minor performance cost

### Why separate (public) directory?

**Pros**: Clear visual separation, easy to identify public routes

**Cons**: Slightly more complex file structure

**Decision**: Clear mental model worth the extra directory

---

## Recent Changes (October 2025)

### New API Key System
- Added key types: `sk` (secret) and `pk` (public)
- Added environments: `live` and `test`
- New format: `lupa_(sk|pk)_(live|test)_[random]`
- Legacy format still supported: `lupa_sk_[random]`

### Deployment Environment Auto-Resolution
- Live keys automatically use production deployment
- Test keys automatically use staging deployment
- Can override with explicit `Deployment-Id` header
- Redis caching for deployment resolution

### Read-Only Public Keys
- Public keys (`lupa_pk_*`) restricted to GET requests
- Write operations return `READ_ONLY_KEY` error (403)
- Safe for client-side use

### New Endpoints
- `POST /api/deployments/{id}/promote` - Promote to production
- `PATCH /api/deployments/{id}/environment` - Update environment
- `GET /api/tree` - Get file tree with depth control

### Enhanced Error Handling
- New error codes: `READ_ONLY_KEY`, `NO_PRODUCTION_DEPLOYMENT`, `NO_STAGING_DEPLOYMENT`
- PostgreSQL error detection and mapping
- Detailed errors in development, sanitized in production

**See**: Individual documentation files for complete details

---

## FAQ

### Q: Why are there two `/api/search` routes?

A: One is for external API consumers (in `(public)` directory), one is for the www application. The www route validates Clerk auth and proxies to the public route.

### Q: Can I call the public API directly from www frontend?

A: No. The public API requires an API key, which should never be exposed to the frontend. Always go through the www application API routes, which use Clerk sessions.

### Q: What's the difference between live and test API keys?

A: Live keys default to production deployments, test keys default to staging. Both can override with `Deployment-Id` header.

**See**: [API Keys](./api-keys.md)

### Q: Can public keys create documents?

A: No. Public keys (`lupa_pk_*`) are read-only. Use secret keys (`lupa_sk_*`) for write operations.

**See**: [API Keys](./api-keys.md)

### Q: How do I test subdomain routing locally?

A: Use `<projectId>.localhost:3000`. Modern browsers resolve `*.localhost` automatically.

### Q: What happens if Redis is down?

A: The system falls back to PostgreSQL. Performance degrades slightly but functionality continues.

**See**: [Deployments](./deployments.md)

---

## Related Documentation

- **[Authentication](./authentication.md)** - Authentication system overview
- **[API Keys](./api-keys.md)** - API key management
- **[Deployments](./deployments.md)** - Deployment system
- **[Public API Reference](./public-api-reference.md)** - API endpoints
- **[Utilities](./utilities.md)** - Development utilities

### External Documentation

- [Tinybird Integration](./analytics.md) - Analytics and metrics
- [Document Parsing](../src/lib/parsers/README.md) - Parser system
- [Database Schema](../drizzle/README.md) - Drizzle schema
- [Real-time Sync](./electric.md) - TanStack Electric
- [Background Jobs](./trigger.md) - Trigger.dev tasks

---

## Changelog

- **2025-10-28**: Split documentation into focused files
- **2025-10-28**: Documented new API key system (sk/pk, live/test)
- **2025-10-28**: Documented deployment environment auto-resolution
- **2025-10-28**: Added read-only public key restrictions
- **2025-10-28**: Updated all examples with new key formats
- **2025-01-27**: Initial documentation created
- **2025-01-27**: Major architectural improvements implemented

# Authentication System

This document describes Lupa's authentication system, which uses different authentication methods depending on the context: **API Keys** for external public API access, **Internal Tokens** for server-to-server communication, and **Clerk Sessions** for web application access.

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     Authentication Layers                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  1. API Keys (External Users)                                    │
│     └─ Format: lupa_(sk|pk)_(live|test)_[random]               │
│     └─ Validated in middleware                                   │
│     └─ Cached in Redis (30 days)                                │
│                                                                   │
│  2. Internal Tokens (WWW ↔ Subdomain)                           │
│     └─ HMAC-signed, 5-second TTL                                │
│     └─ Server-generated, never exposed to client                 │
│     └─ Project-scoped                                            │
│                                                                   │
│  3. Clerk Sessions (WWW Users)                                   │
│     └─ Cookie-based sessions                                     │
│     └─ Organization-scoped                                       │
│     └─ Used in application routes                                │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Authentication Methods

### 1. API Key Authentication (External Users)

API keys are used by external consumers to access the public API on subdomain endpoints.

**Location**: `src/lib/crypto/api-key.ts`

**Format**:
- **New format**: `lupa_(sk|pk)_(live|test)_[randomstring]`
  - `sk` = Secret key (read/write)
  - `pk` = Public key (read-only)
  - `live` = Production environment
  - `test` = Staging/test environment
- **Legacy format**: `lupa_sk_[randomstring]` (still supported)

**Validation Flow**:

```typescript
// 1. Extract Authorization header
const authHeader = req.headers.get("authorization");
// "Bearer lupa_sk_live_abc123..."

// 2. Hash the key
const keyHash = hashApiKey(apiKey); // SHA-256

// 3. Check Redis cache
const cached = await redis.get(`apikey:${keyHash}`);

// 4. If cache miss, query PostgreSQL
const keyRecord = await db.query.ApiKey.findFirst({
  where: and(
    eq(keys.key_hash, keyHash),
    eq(keys.is_active, true)
  )
});

// 5. Validate project ownership
if (keyRecord.project_id !== projectId) {
  return { valid: false };
}

// 6. Cache for 30 days
await redis.set(`apikey:${keyHash}`, JSON.stringify(keyData), {
  ex: 60 * 60 * 24 * 30
});

// 7. Update last_used_at (async, non-blocking)
event.waitUntil(updateLastUsed(keyRecord.id));
```

**Implementation Details**:

```typescript
interface ValidatedApiKey {
  id: string;
  org_id: string;
  project_id: string;
  name: string;
  environment: "live" | "test";  // Determines deployment resolution
  key_type: "sk" | "pk";         // Determines read/write permissions
}

export async function validateApiKey(
  req: NextRequest,
  event: NextFetchEvent,
  projectId?: string,
): Promise<{
  valid: boolean;
  apiKeyId?: string;
  projectId?: string;
  data?: ValidatedApiKey;
}>
```

**Key Features**:
- SHA-256 hashing for secure storage
- Redis caching reduces database load
- Fallback to PostgreSQL if Redis is unavailable
- Invalid keys cached for 5 minutes to prevent brute force
- Per-project scoping prevents cross-project access
- Environment-aware (determines default deployment)

**Security Considerations**:
- Keys are **never** stored in plain text
- Redis cache includes active status to prevent using revoked keys
- `updateLastUsed()` is non-blocking to maintain low latency
- Keys are revocable via soft delete (`is_active = false`)

See [api-keys.md](./api-keys.md) for detailed information about API key types, environments, and management.

---

### 2. Internal Token System (Server-to-Server)

Internal tokens enable secure communication between `www.lupa.build` and `<projectId>.lupa.build (e.g., abc1234567.lupa.build)` subdomains without exposing API keys.

**Location**: `src/lib/crypto/internal-token.ts`

**Purpose**: 
- Proxy requests from www application routes to public API routes
- Short-lived to minimize security risk
- Cannot be reused across projects
- Never exposed to client

**Token Structure**:

```typescript
interface InternalTokenPayload {
  iss: "lupa-internal";    // Issuer (prevents token confusion)
  projectId: string;       // Project being accessed
  exp: number;            // Expiry timestamp (Date.now() + 5000ms)
}
```

**Generation**:

```typescript
export function generateInternalToken(projectId: string): string {
  const payload = {
    iss: "lupa-internal",
    projectId,
    exp: Date.now() + 5000, // 5 seconds
  };
  
  const payloadStr = JSON.stringify(payload);
  
  // HMAC-SHA256 signature
  const signature = createHmac("sha256", INTERNAL_REQUEST_SECRET)
    .update(payloadStr)
    .digest("hex");
  
  // Base64 encode: payload.signature
  const token = Buffer.from(`${payloadStr}.${signature}`).toString("base64");
  
  return token;
}
```

**Validation** (in middleware):

```typescript
export function verifyInternalToken(
  token: string,
  expectedProjectId: string
): boolean {
  try {
    // 1. Base64 decode
    const decoded = Buffer.from(token, "base64").toString("utf8");
    const [payloadStr, signature] = decoded.split(".");
    
    // 2. Parse payload
    const payload = JSON.parse(payloadStr);
    
    // 3. Check expiry
    if (payload.exp < Date.now()) {
      return false; // Token expired
    }
    
    // 4. Verify issuer
    if (payload.iss !== "lupa-internal") {
      return false; // Wrong issuer
    }
    
    // 5. Verify project ID
    if (payload.projectId !== expectedProjectId) {
      return false; // Wrong project
    }
    
    // 6. Recompute signature
    const expectedSignature = createHmac("sha256", INTERNAL_REQUEST_SECRET)
      .update(payloadStr)
      .digest("hex");
    
    // 7. Timing-safe comparison
    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch (error) {
    return false;
  }
}
```

**Security Features**:

| Feature | Description | Security Benefit |
|---------|-------------|------------------|
| **5-second TTL** | Token expires quickly | Minimizes replay attack window |
| **HMAC-SHA256** | Cryptographic signature | Prevents tampering with payload |
| **Timing-safe comparison** | Constant-time signature check | Prevents timing attacks |
| **Issuer validation** | Checks `iss` claim | Prevents token confusion attacks |
| **Project scoping** | Embedded in payload | Can't reuse for different projects |
| **Server-only** | Never sent to client | Can't be stolen from frontend |

**Usage Example**:

```typescript
// Application route (src/app/api/search/route.ts)
export async function POST(req: NextRequest) {
  const { projectId, deploymentId, query } = await req.json();
  
  // Generate fresh token
  const token = generateInternalToken(projectId);
  
  // Proxy to public API
  const response = await fetch(
    `https://${projectId}.lupa.build/api/search?query=${query}`,
    {
      headers: {
        'X-Internal-Token': token,
        'Deployment-Id': deploymentId,
      }
    }
  );
  
  return NextResponse.json(await response.json());
}
```

**Important**: Always generate a **fresh token** for each request. Never cache or reuse tokens.

---

### 3. Clerk Session Authentication (WWW Users)

Clerk provides session-based authentication for users accessing the web application at `www.lupa.build`.

**Location**: Handled by `@clerk/nextjs/server`

**Flow**:

```typescript
import { auth } from "@clerk/nextjs/server";

// In application route
export async function POST(req: NextRequest) {
  // 1. Validate session
  const session = await auth();
  
  if (!session.userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
  
  // 2. Extract organization ID
  const orgId = session.orgId;
  
  if (!orgId) {
    return NextResponse.json(
      { error: "Organization not found" },
      { status: 400 }
    );
  }
  
  // 3. Validate project ownership
  const project = await db.query.Project.findFirst({
    where: and(
      eq(schema.Project.id, projectId),
      eq(schema.Project.org_id, orgId)
    )
  });
  
  if (!project) {
    return NextResponse.json(
      { error: "Project not found" },
      { status: 404 }
    );
  }
  
  // 4. Proceed with request...
}
```

**Middleware Protection**:

```typescript
// src/proxy.ts
const isProtectedRoute = createRouteMatcher(["/app(.*)"]);
const isPrivateRoute = createRouteMatcher(["/orgs/(.*)"]);

export default clerkMiddleware(async (auth, req, event) => {
  // Protect /app routes
  if (isProtectedRoute(req)) {
    await auth.protect();
  }
  
  // Protect organization routes
  if (isPrivateRoute(req)) {
    const orgSlug = url.pathname.split("/")[2];
    const session = await auth();
    await auth.protect(() => orgSlug === session.orgSlug);
  }
  
  // ...
});
```

**Key Features**:
- Cookie-based sessions (httpOnly, secure)
- Organization-based access control
- Automatic token refresh
- Built-in CSRF protection

---

## Middleware Authentication Flow

The `src/proxy.ts` middleware is the central authentication point for all subdomain requests.

**Priority Order**:

1. **Internal Token** (highest priority)
2. **API Key** (fallback)
3. **403 Forbidden** (no valid auth)

**Code Flow**:

```typescript
async function handleSubdomainRequest(
  req: NextRequest,
  event: NextFetchEvent,
  subdomain: string,
  url: URL,
) {
  const projectId = subdomain.toLowerCase();
  
  // Step 1: Try internal token
  const internalToken = req.headers.get("X-Internal-Token");
  let isAuthenticated = false;
  let apiKeyData: { environment: "live" | "test"; key_type: "sk" | "pk" } | undefined;
  
  if (internalToken && verifyInternalToken(internalToken, projectId)) {
    isAuthenticated = true;
  } else {
    // Step 2: Try API key
    const { valid, data } = await validateApiKey(req, event, projectId);
    isAuthenticated = valid;
    apiKeyData = data;
  }
  
  // Step 3: Reject if neither valid
  if (!isAuthenticated) {
    return Response.json(
      {
        error: {
          code: "INVALID_API_KEY",
          message: "API Key is not valid"
        }
      },
      { status: 403 }
    );
  }
  
  // Step 4: Check read-only restrictions
  if (apiKeyData && ["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    if (apiKeyData.key_type === "pk") {
      return Response.json(
        {
          error: {
            code: "READ_ONLY_KEY",
            message: `Operation '${req.method}' requires a secret key (lupa_sk_*). Public keys (lupa_pk_*) are read-only.`
          }
        },
        { status: 403 }
      );
    }
  }
  
  // Step 5: Resolve deployment (see deployments.md)
  // Step 6: Rewrite URL and continue
}
```

**Authentication Decision Tree**:

```
Request arrives at <projectId>.lupa.build (e.g., abc1234567.lupa.build)/api/...
│
├─ Has X-Internal-Token header?
│  ├─ Yes → Verify token
│  │       ├─ Valid → ✅ Authenticated (skip API key check)
│  │       └─ Invalid → Continue to API key check
│  │
│  └─ No → Continue to API key check
│
├─ Has Authorization: Bearer header?
│  ├─ Yes → Validate API key
│  │       ├─ Valid → ✅ Authenticated
│  │       │         └─ Check read-only restrictions
│  │       └─ Invalid → ❌ 403 Forbidden
│  │
│  └─ No → ❌ 403 Forbidden
```

---

## Application Route Authentication Pattern

Application routes (at `www.lupa.build/api/*`) use a standard pattern combining all three auth methods:

```typescript
import { auth } from "@clerk/nextjs/server";
import { proxyToPublicAPI, extractSessionOrgId, validateProjectOwnership } from "@/lib/api-proxy";
import { handleApiError } from "@/lib/api-error";

export async function POST(req: NextRequest) {
  try {
    // 1. Clerk authentication
    const orgId = await extractSessionOrgId(); // Throws if no session
    
    // 2. Parse and validate input
    const body = await req.json();
    const { projectId, ...payload } = BodySchema.parse(body);
    
    // 3. Verify organization ownership
    await validateProjectOwnership(projectId, orgId); // Throws if unauthorized
    
    // 4. Proxy to public API (generates internal token automatically)
    return await proxyToPublicAPI(
      projectId,
      "/endpoint",
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

See [utilities.md](./utilities.md) for details on `proxyToPublicAPI`, `extractSessionOrgId`, and `validateProjectOwnership` utilities.

---

## Security Best Practices

### For API Keys:
- ✅ Always use HTTPS in production
- ✅ Rotate keys regularly (30-90 days)
- ✅ Use test keys for development/staging
- ✅ Revoke keys immediately if compromised
- ✅ Use public keys (pk) for client-side/read-only access
- ❌ Never commit API keys to git
- ❌ Never expose secret keys (sk) to browser/client

### For Internal Tokens:
- ✅ Generate fresh token for each request
- ✅ Validate expiry before processing
- ✅ Use timing-safe comparison for signatures
- ❌ Never reuse tokens across requests
- ❌ Never cache tokens
- ❌ Never send tokens to client

### For Clerk Sessions:
- ✅ Always verify `orgId` exists
- ✅ Validate project ownership before operations
- ✅ Use middleware protection for sensitive routes
- ❌ Never trust client-provided `orgId`

---

## Error Responses

All authentication failures return a standardized error format:

```typescript
{
  "error": {
    "code": "INVALID_API_KEY" | "UNAUTHORIZED" | "FORBIDDEN" | "READ_ONLY_KEY",
    "message": "Human-readable error message"
  }
}
```

**Common Error Codes**:

| Code | Status | Description |
|------|--------|-------------|
| `INVALID_API_KEY` | 403 | API key is invalid or revoked |
| `UNAUTHORIZED` | 401 | No authentication provided |
| `FORBIDDEN` | 403 | Valid auth but insufficient permissions |
| `READ_ONLY_KEY` | 403 | Public key attempted write operation |
| `ORGANIZATION_NOT_FOUND` | 400 | Clerk session missing orgId |
| `PROJECT_NOT_FOUND` | 404 | Project doesn't exist or no access |

---

## Monitoring & Observability

### API Key Usage Tracking:

```typescript
// src/lib/tinybird.ts
await logApiKeyUsage({
  apiKeyId: validatedKey.id,
  projectId: validatedKey.project_id,
  endpoint: req.nextUrl.pathname,
  method: req.method,
  statusCode: response.status,
  timestamp: Date.now(),
});
```

### Last Used Timestamp:

```typescript
// Updated asynchronously (non-blocking)
event.waitUntil(
  db.update(ApiKey)
    .set({ last_used_at: new Date().toISOString() })
    .where(eq(ApiKey.id, keyId))
);
```

This helps identify:
- Unused/stale API keys
- Suspicious usage patterns
- Keys that should be rotated

---

## Related Documentation

- [API Keys](./api-keys.md) - Detailed API key management
- [Deployments](./deployments.md) - Environment resolution logic
- [Public API Reference](./public-api-reference.md) - API endpoints
- [Utilities](./utilities.md) - Authentication utilities
- [API Routes Architecture](./api-routes.md) - Overall system design

---

## Changelog

- **2025-10-28**: Initial authentication documentation
- **2025-10-28**: Documented new API key formats (sk/pk, live/test)
- **2025-10-28**: Added read-only public key restrictions

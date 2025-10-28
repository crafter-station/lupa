# API Keys

This document provides comprehensive information about Lupa's API key system, including key types, environments, creation, validation, and management.

## Overview

API keys are the primary authentication method for external consumers accessing Lupa's public API. Each key is scoped to a single project and can be configured for different environments and permission levels.

```
┌────────────────────────────────────────────────────────────┐
│                      API Key Anatomy                        │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  lupa_sk_live_abc123def456ghi789                           │
│  │    │  │    │                                             │
│  │    │  │    └─ Random string (base62, 32+ chars)        │
│  │    │  └────── Environment: live | test                  │
│  │    └───────── Key type: sk (secret) | pk (public)       │
│  └────────────── Prefix (identifies as Lupa key)           │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

## Key Types

Lupa supports two types of API keys with different permission levels:

### Secret Keys (`sk`)

**Format**: `lupa_sk_live_...` or `lupa_sk_test_...`

**Permissions**: Full read/write access

**Allowed Operations**:
- ✅ GET (read operations)
- ✅ POST (create operations)
- ✅ PATCH/PUT (update operations)
- ✅ DELETE (delete operations)

**Use Cases**:
- Server-side applications
- Backend services
- CI/CD pipelines
- Administrative scripts

**Security**: 
- ⚠️ Must be kept secret
- ⚠️ Never expose to browser/client
- ⚠️ Never commit to version control
- ⚠️ Store in environment variables

### Public Keys (`pk`)

**Format**: `lupa_pk_live_...` or `lupa_pk_test_...`

**Permissions**: Read-only access

**Allowed Operations**:
- ✅ GET (read operations)
- ❌ POST, PUT, PATCH, DELETE (write operations blocked)

**Use Cases**:
- Client-side applications (browser, mobile)
- Public documentation/demos
- Monitoring dashboards
- Analytics widgets

**Security**:
- ✅ Safe to expose in client-side code
- ✅ Limited blast radius if compromised
- ✅ Can be embedded in public repositories (test environment only)

**Write Operation Behavior**:

If a public key attempts a write operation, the API returns:

```json
{
  "error": {
    "code": "READ_ONLY_KEY",
    "message": "Operation 'POST' requires a secret key (lupa_sk_*). Public keys (lupa_pk_*) are read-only."
  }
}
```

HTTP Status: `403 Forbidden`

---

## Environments

Each API key is tied to a specific environment that determines which deployment it accesses by default.

### Live Environment (`live`)

**Purpose**: Production traffic

**Default Deployment**: Production deployment (environment = `production`)

**Key Format**: `lupa_sk_live_...` or `lupa_pk_live_...`

**Behavior**:
- Automatically resolves to project's production deployment
- If no production deployment exists, returns error
- Can override with `Deployment-Id` header

**Use Cases**:
- Production applications
- Live customer-facing services
- Production monitoring

### Test Environment (`test`)

**Purpose**: Development and testing

**Default Deployment**: Staging deployment (environment = `staging`)

**Key Format**: `lupa_sk_test_...` or `lupa_pk_test_...`

**Behavior**:
- Automatically resolves to project's staging deployment
- If no staging deployment exists, returns error
- Can override with `Deployment-Id` header

**Use Cases**:
- Development environments
- Automated tests
- Staging/preview deployments
- QA testing

### Environment-Based Deployment Resolution

When a request arrives **without** a `Deployment-Id` header, the middleware automatically resolves the deployment based on the API key's environment:

```typescript
// Middleware logic (src/proxy.ts)
let targetEnvironment: "production" | "staging" | null = null;

if (apiKeyData) {
  targetEnvironment = apiKeyData.environment === "live" 
    ? "production" 
    : "staging";
}

// Resolve deployment
const deployment = await resolveDeployment(projectId, targetEnvironment);
```

**Resolution Flow**:

```
API Key Environment → Default Deployment
├─ live  → production
└─ test  → staging
```

See [deployments.md](./deployments.md) for detailed information about deployment resolution.

---

## API Key Formats

### New Format (Recommended)

**Structure**: `lupa_{keyType}_{environment}_{random}`

**Examples**:
- `lupa_sk_live_7x9Kp2mN4qR8tV3wY6zB1cD5fG0hJ`
- `lupa_pk_test_Aa9Bb8Cc7Dd6Ee5Ff4Gg3Hh2Ii1Jj`

**Pattern**: `/^lupa_(sk|pk)_(live|test)_[a-zA-Z0-9_-]+$/`

**Benefits**:
- Self-documenting (type and environment visible)
- Easy to filter/audit by environment
- Supports public/secret key distinction
- Follows modern API key conventions

### Legacy Format (Still Supported)

**Structure**: `lupa_sk_{random}`

**Examples**:
- `lupa_sk_7x9Kp2mN4qR8tV3wY6zB1cD5fG0hJ`

**Pattern**: `/^lupa_sk_[a-zA-Z0-9_-]{32,}$/`

**Behavior**:
- Treated as secret key (`sk`)
- Defaults to live environment
- No migration required (works indefinitely)

**Recommendation**: Migrate to new format for better observability

---

## Creating API Keys

API keys are created through the web application's API key management interface.

### Via Web UI

1. Navigate to project settings
2. Click "API Keys" tab
3. Click "Create API Key"
4. Configure:
   - **Name**: Descriptive name (e.g., "Production Server", "Mobile App")
   - **Environment**: `live` or `test`
   - **Key Type**: `sk` (secret) or `pk` (public)
5. Copy the generated key (shown only once)

### Via API (Application Route)

**Endpoint**: `POST /api/api-keys`

**Request**:
```json
{
  "projectId": "abc1234567",
  "name": "Production Server",
  "environment": "live",
  "key_type": "sk"
}
```

**Response**:
```json
{
  "id": "key3456789",
  "name": "Production Server",
  "key": "lupa_sk_live_7x9Kp2mN4qR8tV3wY6zB1cD5fG0hJ",
  "key_preview": "lupa_sk_live_...0hJ",
  "environment": "live",
  "key_type": "sk",
  "is_active": true,
  "created_at": "2025-10-28T10:30:00Z"
}
```

⚠️ **Important**: The `key` field is only returned once during creation. Store it securely immediately.

### Key Generation Process

```typescript
// src/app/api/api-keys/route.ts
import { generateId } from "@/lib/generate-id";
import { hashApiKey } from "@/lib/crypto/api-key";

// 1. Generate random key
const keyType = "sk"; // or "pk"
const environment = "live"; // or "test"
const randomPart = generateSecureRandom(32); // base62
const apiKey = `lupa_${keyType}_${environment}_${randomPart}`;

// 2. Hash for storage
const keyHash = hashApiKey(apiKey); // SHA-256

// 3. Create preview (last 3 chars)
const keyPreview = `lupa_${keyType}_${environment}_...${randomPart.slice(-3)}`;

// 4. Store in database
await db.insert(ApiKey).values({
  id: generateId("key"),
  org_id: orgId,
  project_id: projectId,
  name: name,
  key_hash: keyHash,
  key_preview: keyPreview,
  environment: environment,
  key_type: keyType,
  is_active: true,
});

// 5. Return plain key (only time it's shown)
return { key: apiKey, ... };
```

---

## Validation Flow

When an API key is presented, it goes through a multi-step validation process:

### Step 1: Format Validation

```typescript
// Check if key matches expected pattern
const legacyPattern = /^lupa_sk_[a-zA-Z0-9_-]{32,}$/;
const newPattern = /^lupa_(sk|pk)_(live|test)_[a-zA-Z0-9_-]+$/;

if (!legacyPattern.test(apiKey) && !newPattern.test(apiKey)) {
  return { valid: false }; // Invalid format
}
```

### Step 2: Redis Cache Lookup

```typescript
const keyHash = hashApiKey(apiKey); // SHA-256
const redisKey = `apikey:${keyHash}`;

const cached = await redis.get<ApiKeyCache | "invalid">(redisKey);

if (cached === "invalid") {
  return { valid: false }; // Known invalid key
}

if (cached) {
  // Cache hit - validate cached data
  if (!cached.is_active) {
    return { valid: false }; // Revoked key
  }
  
  if (projectId && cached.project_id !== projectId) {
    return { valid: false }; // Wrong project
  }
  
  return { valid: true, data: cached };
}
```

**Cache TTL**: 30 days for valid keys, 5 minutes for invalid keys

### Step 3: Database Lookup (Cache Miss)

```typescript
const keyRecord = await db.query.ApiKey.findFirst({
  where: and(
    eq(keys.key_hash, keyHash),
    eq(keys.is_active, true)
  )
});

if (!keyRecord) {
  // Cache as invalid to prevent repeated DB lookups
  await redis.set(redisKey, "invalid", { ex: 300 });
  return { valid: false };
}

// Cache for future requests
await redis.set(redisKey, JSON.stringify({
  id: keyRecord.id,
  org_id: keyRecord.org_id,
  project_id: keyRecord.project_id,
  is_active: keyRecord.is_active,
  name: keyRecord.name,
  environment: keyRecord.environment,
  key_type: keyRecord.key_type,
}), { ex: 60 * 60 * 24 * 30 }); // 30 days
```

### Step 4: Project Validation

```typescript
if (projectId && keyRecord.project_id !== projectId) {
  return { valid: false }; // Key doesn't belong to this project
}
```

### Step 5: Update Last Used (Async)

```typescript
// Non-blocking update
event.waitUntil(
  db.update(ApiKey)
    .set({
      last_used_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .where(eq(ApiKey.id, keyRecord.id))
    .catch(console.error)
);
```

### Complete Validation Function

```typescript
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

**Location**: `src/lib/crypto/api-key.ts`

---

## Storage & Security

### Hashing

API keys are **never stored in plain text**. Instead, they are hashed using SHA-256:

```typescript
import { createHash } from "node:crypto";

export function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}
```

**Database Schema**:

```typescript
{
  id: "key3456789",
  key_hash: "a3f5c9b2d8e1f4c7b9a2d5e8f1c4b7a9...", // SHA-256 hash
  key_preview: "lupa_sk_live_...0hJ",             // Last 3 chars
  // ... other fields
}
```

### Redis Caching

**Valid keys** are cached for 30 days:

```typescript
await redis.set(`apikey:${keyHash}`, JSON.stringify(keyData), {
  ex: 60 * 60 * 24 * 30 // 30 days
});
```

**Invalid keys** are cached for 5 minutes to prevent brute force:

```typescript
await redis.set(`apikey:${keyHash}`, "invalid", {
  ex: 300 // 5 minutes
});
```

**Cache Invalidation**:

When a key is revoked or deleted, the cache is immediately cleared:

```typescript
await redis.del(`apikey:${key.key_hash}`);
```

### Database Schema

```typescript
// src/db/schema/api-key.ts
export const ApiKey = pgTable("api_key", {
  id: text("id").primaryKey(),
  org_id: text("org_id").notNull(),
  project_id: text("project_id").notNull()
    .references(() => Project.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  key_hash: text("key_hash").notNull().unique(),
  key_preview: text("key_preview").notNull(),
  environment: ApiKeyEnvironment("environment").notNull().default("live"),
  key_type: ApiKeyType("key_type").notNull().default("sk"),
  is_active: boolean("is_active").notNull().default(true),
  last_used_at: timestamp("last_used_at"),
  created_at: timestamp("created_at").notNull().defaultNow(),
  updated_at: timestamp("updated_at").notNull().defaultNow(),
}, (table) => [
  uniqueIndex("api_key_project_env_type_name_unique")
    .on(table.project_id, table.environment, table.key_type, table.name)
    .where(sql`${table.is_active} = true`)
]);
```

**Unique Constraint**: Only one active key per `(project, environment, key_type, name)` combination.

---

## Managing API Keys

### Listing Keys

**Endpoint**: `GET /api/api-keys?projectId={projectId}`

**Response**:
```json
{
  "keys": [
    {
      "id": "key1234567",
      "name": "Production Server",
      "key_preview": "lupa_sk_live_...0hJ",
      "environment": "live",
      "key_type": "sk",
      "is_active": true,
      "last_used_at": "2025-10-28T09:15:00Z",
      "created_at": "2025-10-15T10:30:00Z"
    },
    {
      "id": "key_def456",
      "name": "Mobile App",
      "key_preview": "lupa_pk_live_...3Qq",
      "environment": "live",
      "key_type": "pk",
      "is_active": true,
      "last_used_at": "2025-10-28T10:20:00Z",
      "created_at": "2025-10-20T14:45:00Z"
    }
  ]
}
```

### Revoking Keys (Soft Delete)

**Endpoint**: `DELETE /api/api-keys/{keyId}`

**Behavior**:
- Sets `is_active = false`
- Clears Redis cache
- Key becomes immediately invalid
- Key record retained for audit trail

**Implementation**:

```typescript
// src/lib/crypto/api-key.ts
export async function revokeApiKey(keyId: string) {
  const key = await db.query.ApiKey.findFirst({
    where: eq(ApiKey.id, keyId)
  });
  
  if (!key) return;
  
  // Soft delete
  await db.update(ApiKey)
    .set({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .where(eq(ApiKey.id, keyId));
  
  // Clear cache
  await redis.del(`apikey:${key.key_hash}`);
}
```

**When to revoke**:
- Key compromised or exposed
- Service decommissioned
- Employee left company
- Key rotation schedule
- Security incident

### Deleting Keys (Hard Delete)

**Endpoint**: `DELETE /api/api-keys/{keyId}?permanent=true`

**Behavior**:
- Permanently removes key record from database
- Clears Redis cache
- Cannot be undone
- Loses audit trail

**Implementation**:

```typescript
export async function deleteApiKey(keyId: string) {
  const key = await db.query.ApiKey.findFirst({
    where: eq(ApiKey.id, keyId)
  });
  
  if (!key) return;
  
  // Hard delete
  await db.delete(ApiKey).where(eq(ApiKey.id, keyId));
  
  // Clear cache
  await redis.del(`apikey:${key.key_hash}`);
}
```

**When to delete**:
- Compliance requirements (data retention)
- Database cleanup
- Privacy requests (GDPR right to erasure)

**Recommendation**: Prefer revoking over deleting for audit trail.

---

## Usage Examples

### Example 1: Using a Secret Key (Server-Side)

```bash
# Create a document
curl -X POST https://abc1234567.lupa.build/api/documents \
  -H "Authorization: Bearer lupa_sk_live_7x9Kp2mN4qR8tV3wY6zB1cD5fG0hJ" \
  -H "Content-Type: application/json" \
  -d '{
    "folder": "/docs/",
    "name": "Privacy Policy",
    "url": "https://example.com/privacy"
  }'
```

### Example 2: Using a Public Key (Client-Side)

```javascript
// Browser/React app
const response = await fetch(
  'https://abc1234567.lupa.build/api/search?query=refund',
  {
    headers: {
      'Authorization': 'Bearer lupa_pk_live_Aa9Bb8Cc7Dd6Ee5Ff4Gg3Hh2Ii1Jj',
      'Deployment-Id': 'def4567890', // Optional: override default
    }
  }
);

const results = await response.json();
```

### Example 3: Environment-Based Deployment

```bash
# Live key → automatically uses production deployment
curl https://abc1234567.lupa.build/api/search?query=pricing \
  -H "Authorization: Bearer lupa_sk_live_..."

# Test key → automatically uses staging deployment
curl https://abc1234567.lupa.build/api/search?query=pricing \
  -H "Authorization: Bearer lupa_sk_test_..."
```

### Example 4: Override Default Deployment

```bash
# Use live key but target specific staging deployment
curl https://abc1234567.lupa.build/api/search?query=pricing \
  -H "Authorization: Bearer lupa_sk_live_..." \
  -H "Deployment-Id: stg9876543_123"
```

---

## Best Practices

### Key Management

✅ **Do**:
- Create separate keys for each service/environment
- Use descriptive names (e.g., "Production API Server", "iOS App v2.1")
- Rotate keys every 30-90 days
- Use test keys for development
- Monitor `last_used_at` to identify unused keys
- Revoke keys immediately when no longer needed

❌ **Don't**:
- Share keys across services
- Use production keys in development
- Commit keys to git repositories
- Log full keys in application logs
- Reuse revoked key values

### Security

✅ **Do**:
- Store secret keys in environment variables
- Use secret managers (AWS Secrets Manager, Vault)
- Enable alerting on unusual usage patterns
- Audit key usage regularly
- Use public keys for client-side code when possible

❌ **Don't**:
- Expose secret keys to browser/client
- Include keys in error messages
- Store keys in plain text configuration files
- Use same key for multiple projects

### Environment Strategy

✅ **Recommended Setup**:

| Environment | Key Type | Key Environment | Use Case |
|-------------|----------|-----------------|----------|
| **Development** | Secret | Test | Local development |
| **Staging** | Secret | Test | CI/CD pipelines |
| **Production** | Secret | Live | Production servers |
| **Mobile App** | Public | Live | Client-side app |
| **Demo/Docs** | Public | Test | Public documentation |

---

## Monitoring & Analytics

### Tinybird Integration

Every API key usage is logged to Tinybird for analytics:

```typescript
// src/lib/tinybird.ts
await logApiKeyUsage({
  api_key_id: validatedKey.id,
  project_id: projectId,
  deployment_id: deploymentId,
  endpoint: req.nextUrl.pathname,
  method: req.method,
  status_code: response.status,
  latency_ms: Date.now() - startTime,
  timestamp: Date.now(),
});
```

**Available Metrics**:
- Requests per key
- Error rates by key
- Latency percentiles
- Most used endpoints
- Geographic distribution
- Usage over time

**Dashboard Queries**:
- Top 10 most active keys
- Keys with high error rates
- Unused keys (no activity in 30+ days)
- Keys approaching rate limits

### Last Used Tracking

The `last_used_at` timestamp is updated on every valid request:

```typescript
// Non-blocking update
event.waitUntil(
  db.update(ApiKey)
    .set({ last_used_at: new Date().toISOString() })
    .where(eq(ApiKey.id, keyId))
);
```

**Use cases**:
- Identify stale keys for cleanup
- Detect compromised keys (unusual activity)
- Track service deployment status
- Audit compliance

---

## Error Responses

### Invalid API Key

```json
{
  "error": {
    "code": "INVALID_API_KEY",
    "message": "API Key is not valid"
  }
}
```

Status: `403 Forbidden`

**Causes**:
- Key doesn't exist
- Key is revoked (`is_active = false`)
- Key format is invalid
- Key doesn't belong to project

### Read-Only Key Restriction

```json
{
  "error": {
    "code": "READ_ONLY_KEY",
    "message": "Operation 'POST' requires a secret key (lupa_sk_*). Public keys (lupa_pk_*) are read-only."
  }
}
```

Status: `403 Forbidden`

**Cause**: Public key attempted write operation (POST/PUT/PATCH/DELETE)

---

## Migration Guide

### From Legacy to New Format

**Old key**: `lupa_sk_abc123def456`

**Steps**:
1. Create new key with desired environment/type
2. Update application configuration
3. Test with new key
4. Revoke old key
5. Monitor for any issues

**No breaking changes**: Legacy keys continue to work indefinitely.

---

## FAQ

### Q: Can I change a key's environment or type after creation?

A: No. Keys are immutable. Create a new key with the desired configuration and revoke the old one.

### Q: What happens if I lose an API key?

A: API keys are shown only once during creation. If lost, revoke the key and create a new one.

### Q: How many API keys can I create per project?

A: Unlimited. However, each unique `(environment, key_type, name)` combination can have only one active key.

### Q: Can a single API key access multiple projects?

A: No. Each API key is scoped to a single project. Use separate keys for each project.

### Q: Do public keys count against rate limits?

A: Yes. Public and secret keys share the same rate limits per project.

### Q: Can I rename an API key?

A: Yes, via the web UI or API. This doesn't change the key value, only the display name.

### Q: What's the difference between revoking and deleting a key?

A: Revoking (soft delete) retains the record for audit trails. Deleting (hard delete) permanently removes it.

### Q: How long does Redis cache API keys?

A: Valid keys: 30 days. Invalid keys: 5 minutes.

---

## Related Documentation

- [Authentication](./authentication.md) - Overall authentication system
- [Deployments](./deployments.md) - Environment and deployment resolution
- [Public API Reference](./public-api-reference.md) - API endpoints
- [Utilities](./utilities.md) - API key validation utilities

---

## Changelog

- **2025-10-28**: Initial API keys documentation
- **2025-10-28**: Documented new key formats (sk/pk, live/test)
- **2025-10-28**: Added public key read-only restrictions
- **2025-10-28**: Documented environment-based deployment resolution

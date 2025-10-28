# Deployments

This document describes Lupa's deployment system, including deployment environments, automatic resolution logic, promotion workflows, and Redis caching strategies.

## Overview

A **deployment** in Lupa represents a specific version of your knowledge base that can be queried via the search API. Each project can have multiple deployments, each with its own environment label (`production` or `staging`).

```
┌──────────────────────────────────────────────────────────────┐
│                      Deployment Flow                          │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  1. Create Deployment                                         │
│     └─ Status: processing                                     │
│     └─ Environment: staging (default)                         │
│                                                                │
│  2. Process Documents                                         │
│     └─ Parse, chunk, embed documents                          │
│     └─ Build vector index (Upstash)                           │
│     └─ Status: ready                                          │
│                                                                │
│  3. Test Deployment                                           │
│     └─ Query with test API key                                │
│     └─ Verify search results                                  │
│                                                                │
│  4. Promote to Production                                     │
│     └─ Update environment: production                         │
│     └─ Invalidate caches                                      │
│     └─ Live key → production deployment                       │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

## Deployment Environments

Lupa supports two deployment environments:

### Production Environment

**Purpose**: Serve live production traffic

**Characteristics**:
- Stable, tested knowledge base
- Accessed by `live` API keys by default
- Typically one production deployment per project
- High availability and performance requirements

**Status Requirements**:
- Must be `ready` status to promote to production
- Cannot have failed/processing deployments as production

**Use Cases**:
- Customer-facing applications
- Production websites
- Live chatbots
- Business-critical search

### Staging Environment

**Purpose**: Development, testing, and validation

**Characteristics**:
- Test changes before production
- Accessed by `test` API keys by default
- Can have multiple staging deployments
- Safe to experiment

**Status**:
- Can be any status (processing, ready, failed)
- No promotion restrictions

**Use Cases**:
- Pre-production testing
- A/B testing variations
- Development environments
- QA validation
- Preview deployments

---

## Deployment Resolution

When a request arrives **without** a `Deployment-Id` header, Lupa automatically resolves which deployment to query based on the API key's environment.

### Resolution Algorithm

```typescript
// src/proxy.ts
async function resolveAndValidateDeployment(
  projectId: string,
  requestedDeploymentId: string | null,
  requiresDeployment: boolean,
  targetEnvironment?: "production" | "staging" | null,
): Promise<DeploymentResolutionResult>
```

**Step-by-Step Flow**:

```
1. Check if Deployment-Id header provided
   ├─ Yes → Validate deployment belongs to project
   └─ No → Continue to auto-resolution

2. Determine target environment
   ├─ API key environment = "live" → production
   ├─ API key environment = "test" → staging
   └─ Internal token → use explicit targetEnvironment

3. Check Redis cache
   ├─ Cache hit → Return cached deployment ID
   └─ Cache miss → Query database

4. Query database for deployment
   WHERE project_id = {projectId}
   AND environment = {targetEnvironment}
   AND status = "ready"
   ORDER BY created_at DESC
   LIMIT 1

5. Cache result (TTL: 1 hour)

6. Return deployment ID
```

### Example Flows

**Example 1: Live API Key (No Deployment-Id)**

```bash
curl https://abc1234567.lupa.build/api/search?query=refund \
  -H "Authorization: Bearer lupa_sk_live_..."

# Resolution:
# 1. API key environment = "live"
# 2. Target environment = "production"
# 3. Check Redis: project:abc1234567:production_deployment
# 4. If cache miss, query DB for production deployment
# 5. Return def4567890
```

**Example 2: Test API Key (No Deployment-Id)**

```bash
curl https://abc1234567.lupa.build/api/search?query=refund \
  -H "Authorization: Bearer lupa_sk_test_..."

# Resolution:
# 1. API key environment = "test"
# 2. Target environment = "staging"
# 3. Check Redis: project:abc1234567:staging_deployment
# 4. If cache miss, query DB for staging deployment
# 5. Return stg9876543_456
```

**Example 3: Explicit Deployment-Id**

```bash
curl https://abc1234567.lupa.build/api/search?query=refund \
  -H "Authorization: Bearer lupa_sk_live_..." \
  -H "Deployment-Id: stg9876543_456"

# Resolution:
# 1. Deployment-Id provided explicitly
# 2. Validate deployment belongs to project
# 3. Skip auto-resolution
# 4. Use stg9876543_456
```

### Resolution Implementation

```typescript
// Middleware determines target environment
let targetEnvironment: "production" | "staging" | null = null;

if (apiKeyData) {
  targetEnvironment = apiKeyData.environment === "live" 
    ? "production" 
    : "staging";
}

// Resolve deployment
const deploymentResult = await resolveAndValidateDeployment(
  projectId,
  requestedDeploymentId,
  routeRequiresDeployment,
  targetEnvironment,
);

if (!deploymentResult.valid) {
  return Response.json(
    { error: deploymentResult.error },
    { status: deploymentResult.error?.code === "PROJECT_NOT_FOUND" ? 404 : 400 }
  );
}
```

---

## Redis Caching

Lupa uses Redis to cache deployment resolution and ownership information, reducing database load and improving response times.

### Cache Keys

| Key Pattern | Purpose | TTL |
|-------------|---------|-----|
| `project:{projectId}:exists` | Project existence and org_id | 30 min |
| `project:{projectId}:production_deployment` | Production deployment ID | 1 hour |
| `project:{projectId}:staging_deployment` | Staging deployment ID | 1 hour |
| `deployment:{deploymentId}:project` | Deployment ownership (projectId) | 1 hour |
| `deployment:{deploymentId}:info` | Deployment metadata | 10 min |

### Cache Functions

**Get Production Deployment**:

```typescript
// src/db/redis.ts
export async function getProductionDeploymentId(
  projectId: string
): Promise<string | null> {
  return await redis.get<string>(
    `project:${projectId}:production_deployment`
  );
}
```

**Cache Production Deployment**:

```typescript
export async function setProductionDeploymentId(
  projectId: string,
  deploymentId: string
): Promise<void> {
  await redis.set(
    `project:${projectId}:production_deployment`,
    deploymentId,
    { ex: 3600 } // 1 hour
  );
}
```

**Invalidate Cache (After Promotion)**:

```typescript
export async function invalidateProductionDeployment(
  projectId: string
): Promise<void> {
  await redis.del(`project:${projectId}:production_deployment`);
}
```

**Validate Deployment Ownership**:

```typescript
export async function validateDeploymentOwnership(
  projectId: string,
  deploymentId: string
): Promise<boolean> {
  const cachedProjectId = await redis.get<string>(
    `deployment:${deploymentId}:project`
  );
  
  if (cachedProjectId === null) return false;
  if (cachedProjectId !== projectId) return false;
  
  return true;
}
```

**Cache Deployment Info**:

```typescript
export async function cacheDeploymentInfo(
  deploymentId: string,
  info: DeploymentInfo
): Promise<void> {
  // Cache ownership (long TTL)
  await redis.set(
    `deployment:${deploymentId}:project`,
    info.projectId,
    { ex: 3600 } // 1 hour
  );
  
  // Cache metadata (short TTL)
  if (info.environment && info.status) {
    await redis.set(
      `deployment:${deploymentId}:info`,
      JSON.stringify(info),
      { ex: 600 } // 10 minutes
    );
  }
}
```

### Cache Invalidation Strategy

Caches are invalidated when deployments are modified:

**Promotion**: Invalidate both production and staging caches

```typescript
await invalidateProductionDeployment(projectId);
await invalidateStagingDeployment(projectId);
await invalidateDeploymentInfo(deploymentId);
```

**Deletion**: Invalidate deployment-specific caches

```typescript
await invalidateDeploymentInfo(deploymentId);
```

**Environment Change**: Invalidate relevant environment cache

```typescript
if (newEnvironment === "production") {
  await invalidateProductionDeployment(projectId);
} else {
  await invalidateStagingDeployment(projectId);
}
```

---

## Creating Deployments

Deployments are created from snapshots, which contain the documents and metadata to be indexed.

### Via Public API

**Endpoint**: `POST /api/deployments`

**Request**:
```json
{
  "snapshotId": "snp2345678",
  "environment": "staging"
}
```

**Response**:
```json
{
  "id": "def4567890",
  "project_id": "abc1234567",
  "snapshot_id": "snp2345678",
  "environment": "staging",
  "status": "processing",
  "created_at": "2025-10-28T10:30:00Z"
}
```

**Processing**:
1. Deployment created with `processing` status
2. Trigger.dev task processes snapshot
3. Documents parsed, chunked, embedded
4. Vector index created in Upstash
5. Status updated to `ready` or `failed`

### Via Application Route

**Endpoint**: `POST /api/deployments`

**Request**:
```json
{
  "projectId": "abc1234567",
  "snapshotId": "snp2345678",
  "environment": "staging"
}
```

**Flow**:
1. Validate Clerk session
2. Verify project ownership
3. Generate internal token
4. Proxy to public API `POST /api/deployments`
5. Return response

---

## Promoting Deployments

Promotion allows you to move a staging deployment to production after testing.

### Promotion Endpoint

**Endpoint**: `POST /api/deployments/{deploymentId}/promote`

**Authentication**: Secret key required (`lupa_sk_*`)

**Requirements**:
- Deployment must have `status = "ready"`
- Deployment must exist in the project
- Only staging deployments can be promoted

**Request**:
```bash
curl -X POST https://abc1234567.lupa.build/api/deployments/def4567890/promote \
  -H "Authorization: Bearer lupa_sk_live_..."
```

**Response**:
```json
{
  "success": true,
  "deployment": {
    "id": "def4567890",
    "environment": "production",
    "status": "ready"
  }
}
```

### Promotion Process

```typescript
// src/lib/deployment-promotion.ts
export async function updateDeploymentEnvironment(
  projectId: string,
  deploymentId: string,
  newEnvironment: "production" | "staging"
) {
  // 1. Get current production/staging deployment
  const currentDeployments = await db.query.Deployment.findMany({
    where: and(
      eq(schema.Deployment.project_id, projectId),
      eq(schema.Deployment.environment, newEnvironment)
    )
  });
  
  // 2. Demote current deployments to staging
  for (const deployment of currentDeployments) {
    await db.update(schema.Deployment)
      .set({ environment: "staging" })
      .where(eq(schema.Deployment.id, deployment.id));
  }
  
  // 3. Promote target deployment
  await db.update(schema.Deployment)
    .set({
      environment: newEnvironment,
      updated_at: new Date().toISOString()
    })
    .where(eq(schema.Deployment.id, deploymentId));
  
  // 4. Invalidate caches
  await invalidateProductionDeployment(projectId);
  await invalidateStagingDeployment(projectId);
  await invalidateDeploymentInfo(deploymentId);
}
```

**Atomic Behavior**:
- Only one deployment can be `production` at a time
- Previous production deployment automatically demoted to `staging`
- Cache invalidation ensures immediate effect

### Promotion Errors

**Deployment Not Ready**:
```json
{
  "error": {
    "code": "DEPLOYMENT_NOT_READY",
    "message": "Deployment must be ready to promote to production"
  }
}
```

**Deployment Not Found**:
```json
{
  "error": {
    "code": "DEPLOYMENT_NOT_FOUND",
    "message": "Deployment not found or does not belong to this project"
  }
}
```

---

## Updating Deployment Environment

Alternative to promotion: directly update a deployment's environment without automatic demotion.

### Environment Update Endpoint

**Endpoint**: `PATCH /api/deployments/{deploymentId}/environment`

**Request**:
```json
{
  "environment": "production"
}
```

**Response**:
```json
{
  "success": true
}
```

**Validation**:
- Deployment must belong to project
- If changing to production, deployment must be `ready`
- Updates environment field directly

**Use Cases**:
- Manual environment management
- Batch environment updates
- Rollback scenarios

---

## Deployment Status

### Status Values

| Status | Description | Searchable |
|--------|-------------|------------|
| `processing` | Documents being indexed | ❌ |
| `ready` | Available for queries | ✅ |
| `failed` | Processing error | ❌ |

### Status Transitions

```
processing → ready     (success)
processing → failed    (error)
ready → ready          (no change)
failed → failed        (no change)
```

**Note**: Status cannot be manually changed. It's set by the background processing task.

---

## Querying Deployments

### With Deployment-Id Header

**Explicit targeting**:

```bash
curl https://abc1234567.lupa.build/api/search?query=refund \
  -H "Authorization: Bearer lupa_sk_live_..." \
  -H "Deployment-Id: def4567890"
```

**Behavior**:
- Queries specified deployment directly
- Ignores API key environment
- Must belong to project (validated)

### Without Deployment-Id Header

**Auto-resolution**:

```bash
curl https://abc1234567.lupa.build/api/search?query=refund \
  -H "Authorization: Bearer lupa_sk_live_..."
```

**Behavior**:
- Resolves based on API key environment
- `live` → production deployment
- `test` → staging deployment
- Returns error if no matching deployment

---

## Error Responses

### No Production Deployment

```json
{
  "error": {
    "code": "NO_PRODUCTION_DEPLOYMENT",
    "message": "No production deployment found. Please specify Deployment-Id header."
  }
}
```

**Status**: `400 Bad Request`

**Cause**: Project has no `ready` production deployment

**Solution**: 
- Create and promote a deployment
- Use explicit `Deployment-Id` header
- Use test API key to access staging

### No Staging Deployment

```json
{
  "error": {
    "code": "NO_STAGING_DEPLOYMENT",
    "message": "No staging deployment found. Please specify Deployment-Id header."
  }
}
```

**Status**: `400 Bad Request`

**Cause**: Project has no `ready` staging deployment

**Solution**:
- Create a new deployment
- Use explicit `Deployment-Id` header
- Use live API key to access production

### Deployment Not Found

```json
{
  "error": {
    "code": "DEPLOYMENT_NOT_FOUND",
    "message": "Deployment not found or does not belong to this project"
  }
}
```

**Status**: `404 Not Found`

**Causes**:
- Deployment ID doesn't exist
- Deployment belongs to different project
- Deployment was deleted

### Deployment Not in Project

```json
{
  "error": {
    "code": "DEPLOYMENT_NOT_IN_PROJECT",
    "message": "Deployment does not belong to this project"
  }
}
```

**Status**: `400 Bad Request`

**Cause**: Trying to promote/update deployment from different project

---

## Best Practices

### Deployment Strategy

✅ **Recommended Workflow**:

1. **Create deployment** with staging environment
2. **Wait for processing** (status = ready)
3. **Test thoroughly** with test API key
4. **Promote to production** when validated
5. **Monitor production** for issues
6. **Keep staging deployment** for future updates

### Environment Management

✅ **Do**:
- Always test in staging before production
- Use test API keys for staging
- Use live API keys for production
- Keep at least one production deployment
- Monitor deployment status

❌ **Don't**:
- Promote deployments with `processing` status
- Skip staging testing
- Mix environments (test key with production)
- Delete active production deployments
- Ignore failed deployments

### Caching Considerations

✅ **Do**:
- Understand cache TTLs (1 hour for deployments)
- Invalidate caches after promotion
- Monitor cache hit rates
- Use explicit Deployment-Id for testing

❌ **Don't**:
- Rely on instant cache propagation
- Assume caches are always fresh
- Bypass cache without reason

---

## Monitoring & Analytics

### Deployment Metrics

**Available via Tinybird**:
- Queries per deployment
- Search latency by deployment
- Error rates per deployment
- Document count trends
- Index size growth

**Queries**:
```sql
-- Most queried deployments
SELECT 
  deployment_id,
  count() as query_count,
  avg(latency_ms) as avg_latency
FROM search_api_logs
WHERE timestamp > now() - INTERVAL 7 DAY
GROUP BY deployment_id
ORDER BY query_count DESC
LIMIT 10
```

### Health Checks

Monitor deployment health:
- Processing time (snapshot → ready)
- Error rate during processing
- Search latency percentiles
- Cache hit rates
- Failed deployment reasons

---

## Related Documentation

- [API Keys](./api-keys.md) - API key environments and resolution
- [Authentication](./authentication.md) - Authentication system overview
- [Public API Reference](./public-api-reference.md) - Deployment endpoints
- [Utilities](./utilities.md) - Deployment utilities

---

## FAQ

### Q: Can I have multiple production deployments?

A: No. Only one deployment per project can be `production`. Promoting a new deployment automatically demotes the previous one to `staging`.

### Q: What happens to the old production deployment when I promote?

A: It's automatically demoted to `staging` environment. It remains queryable via explicit `Deployment-Id` header.

### Q: Can I delete a production deployment?

A: Yes, but not recommended. Delete staging deployments first, then promote a new one before deleting the current production.

### Q: How long does deployment processing take?

A: Depends on document count and size. Typically 1-10 minutes for small projects (<1000 docs), longer for larger projects.

### Q: Can I query a deployment while it's processing?

A: No. Deployments must have `status = "ready"` to be queried.

### Q: What if Redis cache is unavailable?

A: The system falls back to PostgreSQL for deployment resolution. Performance degrades slightly but functionality continues.

### Q: How do I rollback a production deployment?

A: Promote the previous staging deployment (which was the old production) back to production.

### Q: Can I skip staging and deploy directly to production?

A: Yes, by creating a deployment with `environment = "production"` directly, but this is not recommended. Always test in staging first.

---

## Changelog

- **2025-10-28**: Initial deployments documentation
- **2025-10-28**: Documented environment-based auto-resolution
- **2025-10-28**: Added Redis caching strategy
- **2025-10-28**: Documented promotion and environment update endpoints

# Proxy Routes - Documents API

This document shows how the proxy routing handles different document endpoints.

## Route Patterns Supported

### 1. Base Documents Route
**Public URL**: `POST https://<projectId>.lupa.build/api/documents?type=website`
**Internal Rewrite**: `/api/projects/<projectId>/documents?type=website`
**Use Case**: Create a new document

### 2. Specific Document by ID
**Public URL**: `PATCH https://<projectId>.lupa.build/api/documents/doc_abc123`
**Internal Rewrite**: `/api/projects/<projectId>/documents/doc_abc123`
**Use Case**: Update a specific document

### 3. Bulk Documents Operation
**Public URL**: `POST https://<projectId>.lupa.build/api/documents/bulk`
**Internal Rewrite**: `/api/projects/<projectId>/documents/bulk`
**Use Case**: Create multiple documents at once

## Implementation Details

The route configuration in `src/lib/proxy-routes.ts` uses smart path detection:

```typescript
{
  pattern: /^\/api\/documents/,
  rewrite: (ctx) => {
    const pathParts = ctx.pathname.split("/").filter(Boolean);
    
    // Match /api/documents/bulk
    if (pathParts.length === 3 && pathParts[2] === "bulk") {
      return `/api/projects/${ctx.projectId}/documents/bulk...`;
    }
    
    // Match /api/documents/[documentId]
    if (pathParts.length === 3) {
      const documentId = pathParts[2];
      return `/api/projects/${ctx.projectId}/documents/${documentId}...`;
    }
    
    // Match /api/documents
    return `/api/projects/${ctx.projectId}/documents...`;
  },
}
```

## Query Parameters

All query parameters are preserved in the rewrite:
- `?type=website` → passed through
- `?validate=true` → passed through
- etc.

## Testing

Run the test suite with:
```bash
bun run labs/test-proxy-routes.ts
```

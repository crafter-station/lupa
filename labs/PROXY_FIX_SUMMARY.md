# Proxy Routes Fix - Document Endpoints

## Problem
The proxy routing in `src/lib/proxy-routes.ts` only handled the base `/api/documents` route, but didn't properly handle:
- `/api/documents/[documentId]` - for specific document operations (GET, PATCH, DELETE)
- `/api/documents/bulk` - for bulk document creation

All three routes were being rewritten to the same base path, causing 404s for document ID and bulk operations.

## Solution
Updated the `/api/documents` route configuration to intelligently detect the path structure:

1. **Check for `/api/documents/bulk`** → rewrite to `/api/projects/{projectId}/documents/bulk`
2. **Check for `/api/documents/[id]`** → rewrite to `/api/projects/{projectId}/documents/{id}`
3. **Default to `/api/documents`** → rewrite to `/api/projects/{projectId}/documents`

All query parameters are preserved in all cases.

## Files Modified
- ✅ `src/lib/proxy-routes.ts` - Updated documents route rewrite logic

## Files Created (for testing/documentation)
- `labs/test-proxy-routes.ts` - Unit tests for route rewrites
- `labs/proxy-routes-examples.md` - Documentation of route patterns
- `labs/test-document-routes.sh` - Integration test script

## Testing
Run the test suite:
```bash
bun run labs/test-proxy-routes.ts
```

All 6 test cases pass:
- ✅ Base documents route
- ✅ Documents with query params
- ✅ Specific document by ID
- ✅ Specific document with query params
- ✅ Bulk documents route
- ✅ Bulk documents with query params

## Implementation Details
The fix uses path segment analysis:
```typescript
const pathParts = ctx.pathname.split("/").filter(Boolean);
// pathParts = ['api', 'documents', ...rest]

if (pathParts.length === 3 && pathParts[2] === "bulk") {
  // Handle bulk route
}
if (pathParts.length === 3) {
  // Handle document ID route
}
// Default: base documents route
```

This approach is:
- Simple and maintainable
- Preserves query parameters
- Handles all three route patterns correctly
- No breaking changes to existing routes

# Agent Guidelines for Lupa

## Commands
- **Dev**: `bun run dev` (Next.js with Turbopack)
- **Build**: `bun run build` (Generates OpenAPI docs + builds)
- **Lint**: `bun run lint` (Biome check - auto-runs on pre-commit)
- **Format**: `bun run format` (Biome format --write)
- **Test**: No test framework configured
- **Generate DB Migration**: `npx drizzle-kit generate` (Always generate migrations with drizzle, you just update typescript schema and generate with the command)
- **Apply DB Migration**: `npx drizzle-kit migrate` (Always apply migrations with drizzle)

## Code Style
- **TypeScript**: Strict mode, ES2017, use `type` imports
- **Formatting**: 2-space indent, auto-organize imports (Biome)
- **Imports**: Use `@/*` for `src/*` paths
- **Naming**: camelCase (functions/vars), PascalCase (components/types)
- **IDs**: `generateId()` from `@/lib/generate-id` (10-char alphanumeric nanoid, no prefixes)
- **Validation**: Always use Zod schemas (drizzle-zod for DB)
- **Errors**: Use `ApiError` from `@/lib/api-error`, handle with `handleApiError()`
- **Styling**: `cn()` from `@/lib/utils`, class-variance-authority for variants
- **API Routes**: Use Response.json(), validate with Zod, typed responses
- **Real-time**: `useLiveQuery` + `dynamic(ssr: false)`, preload data in SSR component
- **NO Server Actions**: Use API routes for mutations
- **NO Comments**: Never add code comments unless explicitly requested

## API Routes Guidelines

Lupa uses a **two-tier API architecture**. See `.opencode/docs/` for complete documentation:

### Documentation Structure
- **[api-routes.md](.opencode/docs/api-routes.md)** - Architecture overview
- **[authentication.md](.opencode/docs/authentication.md)** - Auth system (API keys, internal tokens, Clerk)
- **[api-keys.md](.opencode/docs/api-keys.md)** - Key types (sk/pk), environments (live/test)
- **[deployments.md](.opencode/docs/deployments.md)** - Deployment environments, auto-resolution
- **[public-api-reference.md](.opencode/docs/public-api-reference.md)** - Complete endpoint reference
- **[utilities.md](.opencode/docs/utilities.md)** - Error handling, proxy utilities

### Quick Reference

**Public Route Pattern** (`src/app/api/(public)/projects/[projectId]/...`):
```typescript
import { handleApiError, ErrorCode, createErrorResponse } from "@/lib/api-error";

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const { projectId } = await params;
    const data = Schema.parse(await request.json());
    
    // Business logic here
    
    return Response.json(result, { status: 201 });
  } catch (error) {
    return handleApiError(error);
  }
}
```

**Application Route Pattern** (`src/app/api/...`):
```typescript
import { proxyToPublicAPI, extractSessionOrgId, validateProjectOwnership } from "@/lib/api-proxy";
import { handleApiError } from "@/lib/api-error";

export async function POST(req: NextRequest) {
  try {
    const orgId = await extractSessionOrgId();
    const body = await req.json();
    const { projectId, ...payload } = Schema.parse(body);
    
    await validateProjectOwnership(projectId, orgId);
    
    return await proxyToPublicAPI(projectId, "/endpoint", {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
```

### Key Concepts

**API Key Types**:
- `lupa_sk_live_*` - Secret key, production environment, read/write
- `lupa_sk_test_*` - Secret key, staging environment, read/write
- `lupa_pk_live_*` - Public key, production environment, read-only
- `lupa_pk_test_*` - Public key, staging environment, read-only

**Deployment Auto-Resolution**:
- Live keys → production deployment (default)
- Test keys → staging deployment (default)
- Override with `Deployment-Id` header

**Error Handling**:
- Always use `try-catch` with `handleApiError(error)`
- Throw `ApiError` for known errors with specific codes
- Use error codes from `ErrorCode` constants

### Common Tasks

**Add new public endpoint**:
1. Create route in `src/app/api/(public)/projects/[projectId]/...`
2. Add URL rewrite in `src/lib/proxy-routes.ts`
3. Use `handleApiError()` for errors
4. No auth logic needed (middleware handles it)

**Add new application endpoint**:
1. Create route in `src/app/api/...`
2. Use `extractSessionOrgId()` and `validateProjectOwnership()`
3. Proxy to public API with `proxyToPublicAPI()`
4. Handle errors with `handleApiError()`

See detailed documentation in `.opencode/docs/` for complete patterns and examples.

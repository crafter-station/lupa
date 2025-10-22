# Agent Guidelines for Lupa

## Commands
- **Dev**: `bun run dev` (Next.js with Turbopack)
- **Build**: `bun run build` (Generates OpenAPI docs + builds)
- **Lint**: `bun run lint` (Biome check - auto-runs on pre-commit)
- **Format**: `bun run format` (Biome format --write)
- **Test**: No test framework configured
- **DB Push**: `bunx drizzle-kit push` (Apply schema changes)

## Code Style
- **TypeScript**: Strict mode, ES2017, use `type` imports
- **Formatting**: 2-space indent, auto-organize imports (Biome)
- **Imports**: Use `@/*` for `src/*` paths
- **Naming**: camelCase (functions/vars), PascalCase (components/types)
- **IDs**: `generateId()` from `@/lib/generate-id` (nanoid with prefixes: `proj_`, `doc_`, `snap_`, `dep_`)
- **Validation**: Always use Zod schemas (drizzle-zod for DB)
- **Errors**: Throw Error objects with messages, handle in try-catch
- **Styling**: `cn()` from `@/lib/utils`, class-variance-authority for variants
- **API Routes**: Use Response.json(), validate with Zod, typed responses
- **Real-time**: `useLiveQuery` + `dynamic(ssr: false)`, preload data in SSR component
- **NO Server Actions**: Use API routes for mutations
- **NO Comments**: Never add code comments unless explicitly requested

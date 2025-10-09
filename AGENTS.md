# Agent Guidelines for Lupa

## Commands
- **Dev**: `bun run dev` (Next.js with Turbopack)
- **Build**: `bun run build` (Next.js with Turbopack)
- **Lint**: `bun run lint` (Biome check - runs automatically on pre-commit)
- **Format**: `bun run format` (Biome format --write)
- **Test**: No test framework configured yet

## Code Style
- **TypeScript**: Strict mode enabled, target ES2017, use `type` imports for types
- **Formatting**: 2-space indentation, organize imports automatically (Biome)
- **Path Aliases**: Use `@/*` for `src/*` imports
- **Naming**: camelCase for functions/variables, PascalCase for components/types
- **Validation**: Always use Zod schemas for data validation (drizzle-zod for DB schemas)
- **Error Handling**: Throw Error objects with descriptive messages, handle in try-catch
- **Styling**: Use `cn()` from `@/lib/utils` (clsx + tailwind-merge), class-variance-authority for variants
- **Components**: Follow Radix UI + shadcn/ui patterns, use Slot for asChild pattern
- **API Routes**: Use Response.json() for responses, validate with Zod, return typed success/error objects
- **Real-time Data**: Use `useLiveQuery` from `@tanstack/react-db` with `dynamic()` import (`ssr: false`), provide preloaded data in loading state, separate client/SSR components (index.tsx with dynamic import, client.tsx with useLiveQuery)

## Architecture
- **Frontend**: Next.js 15 App Router, React 19, Server/Client Components, Tailwind CSS 4
- **Backend**: Drizzle ORM (Neon PostgreSQL), TanStack Electric for real-time collections, Clerk auth
- **Database**: Define schemas in `src/db/schema/`, collections in `src/db/collections/`
- **Background Jobs**: Trigger.dev tasks in `src/trigger/`
- **Utilities**: Use `cn()` for classnames, `nanoid` for IDs, `tokenlens` for token counting

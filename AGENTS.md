# Agent Guidelines for Lupa

## Commands
- **Build**: `bun run build` (Next.js with Turbopack)
- **Dev**: `bun run dev` (Next.js with Turbopack)
- **Lint**: `bun run lint` (Biome check)
- **Format**: `bun run format` (Biome format --write)
- **Test**: No test framework configured yet

## Code Style
- **TypeScript**: Strict mode enabled, target ES2017
- **Formatting**: 2-space indentation, Biome formatter
- **Imports**: Named imports, `type` keyword for TypeScript types
- **Path Aliases**: `@/*` for `src/*`
- **Naming**: camelCase for functions/variables, PascalCase for components
- **Validation**: Use Zod schemas for data validation
- **Error Handling**: Throw Error objects for failures
- **Styling**: clsx + tailwind-merge for classes, class-variance-authority for variants
- **Linting**: Biome with recommended rules for general/Next.js/React

## Architecture
- **Frontend**: Next.js 15, React 19, Tailwind CSS
- **Backend**: Drizzle and TanstackDB for database/queries, Clerk for authentication
- **Database**: Drizzle ORM with Neon
- **UI**: Radix UI components, shadcn/ui patterns

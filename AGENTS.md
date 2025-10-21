# Agent Guidelines for Lupa

## Commands
- **Dev**: `bun run dev` (Next.js with Turbopack)
- **Build**: `bun run build` (Generates OpenAPI docs, then builds with Turbopack)
- **Docs**: `bun run docs` (Generate OpenAPI docs with next-openapi-gen)
- **Lint**: `bun run lint` (Biome check - runs automatically on pre-commit)
- **Format**: `bun run format` (Biome format --write)
- **Test**: No test framework configured yet
- **Trigger.dev**: `bunx trigger.dev@latest dev` (Run background jobs locally)
- **Database**: `bunx drizzle-kit push` (Apply schema changes)

## Code Style
- **TypeScript**: Strict mode enabled, target ES2017, use `type` imports for types
- **Formatting**: 2-space indentation, organize imports automatically (Biome)
- **Path Aliases**: Use `@/*` for `src/*` imports
- **Naming**: camelCase for functions/variables, PascalCase for components/types
- **IDs**: Use `generateId()` from `@/lib/generate-id` (nanoid with custom prefixes: `proj_`, `doc_`, `snap_`, `dep_`)
- **Validation**: Always use Zod schemas for data validation (drizzle-zod for DB schemas)
- **Error Handling**: Throw Error objects with descriptive messages, handle in try-catch
- **Styling**: Use `cn()` from `@/lib/utils` (clsx + tailwind-merge), class-variance-authority for variants
- **Components**: Follow Radix UI + shadcn/ui patterns, use Slot for asChild pattern
- **API Routes**: Use Response.json() for responses, validate with Zod, return typed success/error objects
- **Real-time Data**: Use `useLiveQuery` from `@tanstack/react-db` with `dynamic()` import (`ssr: false`), provide preloaded data in loading state, separate client/SSR components (index.tsx with dynamic import, client.tsx with useLiveQuery)
- **Server Actions**: Not used - prefer API routes for mutations

## Architecture
- **Frontend**: Next.js 15 App Router, React 19, Server/Client Components, Tailwind CSS 4
- **Backend**: Drizzle ORM (Neon PostgreSQL with pgvector), TanStack Electric for real-time collections, Clerk auth
- **Database**: Define schemas in `src/db/schema/`, collections in `src/db/collections/`. All tables must be registered in `src/db/collections/` for real-time sync
- **Background Jobs**: Trigger.dev v4 tasks in `src/trigger/` (parse-document, process-snapshot, deploy, refetch-website)
- **Vector Storage**: Upstash Vector indexes (one per deployment), cached configs in Redis with encryption
- **File Storage**: Vercel Blob for document uploads and parsed markdown
- **Utilities**: Use `cn()` for classnames, `generateId()` (nanoid) for IDs, `tokenlens` for token counting

## Key API Routes

### Search API (`/api/search/[projectId]/[deploymentId]/[query]/route.ts`)
- **Method**: GET
- **Purpose**: Semantic vector search within a deployment
- **Auth**: Clerk (in production)
- **Process**: Decode query → Get vector index → Query with topK=5 → Return results
- **Response**: `{ query: string, results: Array<{ id, score, data, metadata }> }`
- **Caching**: Vector configs cached with encryption
- **Error Handling**: Auto-invalidates cache on decryption errors

### Chat API (`/api/chat/[projectId]/[deploymentId]/route.ts`)
- **Method**: POST
- **Purpose**: RAG-enabled chat with knowledge base access
- **Model**: OpenAI GPT-5 Responses with reasoning
- **Tool**: `search-knowledge` - Searches deployment and returns context
- **Input**: `{ messages: UIMessage[], model?: string }`
- **Response**: Streaming UI message response with reasoning
- **Max Steps**: 15 tool calls per conversation

### Documents API (`/api/documents/route.ts` and `/api/documents/[id]/route.ts`)
- **POST /api/documents**: Create document (website or file upload)
  - Website: Creates document → snapshot → triggers `process-snapshot` task
  - File: Creates document → snapshot → uploads to blob → triggers `parse-document` task
- **PATCH /api/documents/[id]**: Update document metadata, folder, or refresh settings
- **DELETE /api/documents/[id]**: Delete document and all snapshots

### Deployments API (`/api/deployments/route.ts`)
- **POST**: Create deployment → triggers `deploy` task with linked snapshots

### Collections API (`/api/collections/*/route.ts`)
- **Purpose**: TanStack Electric endpoints for real-time sync
- **Routes**: `/projects`, `/documents`, `/snapshots`, `/deployments`, `/snapshot-and-deployment-rel`
- **Method**: GET with Electric shape protocol

## OpenAPI Documentation
- **Generation**: Uses `next-openapi-gen` to auto-generate OpenAPI 3.0 docs from JSDoc comments
- **Build Process**: Run `bun run docs` or `bun run build` to regenerate `public/openapi.json`
- **Viewer**: OpenAPI docs rendered at `/docs` using Scalar API Reference
- **Documentation Tags**: Use JSDoc tags above route handlers:
  - `@description` - Endpoint description
  - `@body` - Request body schema (export Zod schema in same file)
  - `@contentType` - Request content type (`application/json`, `multipart/form-data`)
  - `@response` - Response schema with format: `[code:]Schema[:description]`
  - `@pathParams` - Path parameters schema
  - `@params` - Query parameters schema
  - `@openapi` - Mark route for inclusion in docs (required)
- **Schema Export**: Export Zod schemas in route files for auto-detection
- **Example**:
```typescript
export const SearchResponseSchema = z.object({
  query: z.string(),
  results: z.array(z.object({ id: z.string(), score: z.number() }))
});

/**
 * Search within a deployment
 * @description Perform a search query against the specified deployment.
 * @response 200:SearchResponseSchema
 * @openapi
 */
export async function GET(request: Request) {
  // Implementation
}
```

## Core Data Models

### Document Schema (`src/db/schema/document.ts`)
- **Fields**: `id`, `folder`, `name`, `description`, `project_id`, `metadata_schema`, `refresh_enabled`, `refresh_frequency`, `refresh_schedule_id`, `created_at`, `updated_at`
- **Folder Structure**: Starts and ends with `/` (e.g., `/folder/subfolder/`)
- **Metadata Schema**: JSON config with `mode: "infer" | "custom"` and optional `schema` object
- **Refresh Frequency**: `daily`, `weekly`, `monthly` (enum)
- **Trigger Schedule**: Linked via `refresh_schedule_id` to Trigger.dev schedules

### Snapshot Schema (`src/db/schema/snapshot.ts`)
- **Fields**: `id`, `document_id`, `url`, `status`, `type`, `markdown_url`, `chunks_count`, `metadata`, `extracted_metadata`, `changes_detected`, `created_at`, `updated_at`
- **Status**: `queued`, `running`, `success`, `error` (enum)
- **Type**: `website`, `upload` (enum)
- **Metadata Types**: 
  - Website: `{ title?, favicon?, screenshot? }`
  - Upload: `{ file_name?, file_size?, modified_at?, created_at? }`
- **Extracted Metadata**: LLM-extracted custom metadata from content

### Deployment Schema (`src/db/schema/deployment.ts`)
- **Fields**: `id`, `project_id`, `vector_index_id`, `status`, `logs`, `created_at`, `updated_at`
- **Status**: `cancelled`, `queued`, `building`, `error`, `ready` (enum)
- **Vector Index**: Upstash Vector index ID (stored in Redis as `vectorIndexId:{deploymentId}`)
- **Logs**: Array of `{ message, timestamp, level }` objects (level: `info`, `warning`, `error`)

### Snapshot-Deployment Relation (`src/db/schema/snapshot-and-deployment.rel.ts`)
- **Fields**: `snapshot_id`, `deployment_id`
- **Purpose**: Many-to-many relationship between snapshots and deployments
- **Usage**: Track which snapshots are deployed to which deployments

## Document Parsing System
- **Location**: `src/lib/parsers/`
- **Registry Pattern**: Use `ParserRegistry` to register parsers with priority
- **Built-in Parsers**: 
  - `llamaparse` - Uses LlamaParse API for PDF, DOCX, XLSX, PPTX, CSV, HTML
  - `simple-text` - Fallback for plain text files
- **Extension**: Create custom parsers implementing `DocumentParser` interface (see `src/lib/parsers/types.ts`)
- **Selection**: Automatic parser selection based on MIME type and priority
- **File Types**: Comprehensive MIME type mapping in `src/lib/parsers/file-types.ts`
- **Examples**: See `src/lib/parsers/EXAMPLES.md` and `src/lib/parsers/README.md`

## Background Tasks (Trigger.dev)

### parse-document.task.ts (130 lines)
- **Purpose**: Parse uploaded files into markdown chunks
- **Input**: `{ documentId, snapshotId, blobUrl }`
- **Process**: Download blob → Parse with LlamaParse → Split into chunks → Upload markdown → Update snapshot
- **Parser**: Uses LlamaParse for multi-format support

### process-snapshot.task.ts (106 lines)
- **Purpose**: Process website snapshots or uploaded documents
- **Input**: `{ snapshotId }`
- **Process**: Fetch snapshot → Scrape with Firecrawl (websites) or read markdown (uploads) → Split into chunks → Update snapshot
- **Change Detection**: Compares markdown content hashes with previous snapshots

### deploy.task.ts (282 lines)
- **Purpose**: Build and deploy snapshots to vector indexes
- **Input**: `{ deploymentId }`
- **Process**: Create/reset Upstash Vector index → Fetch all linked snapshots → Generate embeddings → Upsert to vector index → Update deployment status
- **Vector Index**: Creates new Upstash Vector index or resets existing one
- **Embeddings**: Uses OpenAI `text-embedding-3-small` (1536 dimensions)
- **Metadata**: Stores `documentId`, `snapshotId`, `chunkIndex` with each embedding

### refetch-website.task.ts (93 lines)
- **Purpose**: Scheduled task to refresh website documents
- **Input**: Triggered by Trigger.dev schedule with `externalId` = `documentId`
- **Process**: Find document → Create new snapshot → Trigger `process-snapshot` task
- **Schedule**: Managed via `src/lib/schedules.ts` (CRON patterns for daily/weekly/monthly)

## Vector Search & Caching
- **Location**: `src/lib/vector.ts`
- **Function**: `getVectorIndex(deploymentId, options?)` returns Upstash Vector client
- **Caching**: Vector configs cached in Redis for 60 minutes with encrypted tokens
- **Encryption**: Uses `encrypt()`/`decrypt()` from `src/lib/crypto.ts` (requires `ENCRYPTION_SECRET`)
- **Cache Key**: `vectorConfig:{deploymentId}`
- **Index ID Storage**: `vectorIndexId:{deploymentId}` in Redis
- **Management API**: Uses `UPSTASH_MANAGEMENT_API_KEY` to fetch vector config
- **Cache Invalidation**: `invalidateVectorCache(deploymentId)` on errors

## Real-time Sync with TanStack Electric
- **Config**: `src/lib/electric.ts` - Electric client singleton
- **Collections**: `src/db/collections/` - Define live query shapes
  - `deployment.ts` - Deployment collection with project relation
  - `document.ts` - Document collection with snapshots relation
  - `project.ts` - Project collection
  - `snapshot.ts` - Snapshot collection with document relation
  - `snapshot-and-deployment-rel.ts` - Many-to-many relation collection
- **Usage Pattern**: 
  1. Server component: Pre-fetch data with Drizzle ORM
  2. Create `index.tsx` with `dynamic(() => import('./client'), { ssr: false })`
  3. `client.tsx`: Use `useLiveQuery` from `@tanstack/react-db` with preloaded data
- **Provider**: `src/app/providers/client.tsx` - ElectricProvider wraps app
- **Important**: All tables used in collections must have Electric replication enabled

## Environment Variables

### Required
- `DATABASE_URL` - PostgreSQL connection string (must support pgvector)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Clerk public key
- `CLERK_SECRET_KEY` - Clerk secret key
- `ELECTRIC_SOURCE_ID` - TanStack Electric source ID
- `ELECTRIC_SECRET` - TanStack Electric secret
- `UPSTASH_MANAGEMENT_API_KEY` - Upstash management API key for vector index creation
- `UPSTASH_REDIS_REST_URL` - Upstash Redis URL for caching
- `UPSTASH_REDIS_REST_TOKEN` - Upstash Redis token
- `OPENAI_API_KEY` - OpenAI API key for embeddings and chat
- `TRIGGER_SECRET_KEY` - Trigger.dev secret key
- `BLOB_READ_WRITE_TOKEN` - Vercel Blob token for file storage
- `LLAMA_CLOUD_API_KEY` - LlamaParse API key for document parsing
- `ENCRYPTION_SECRET` - Secret for encrypting vector tokens (use `openssl rand -base64 32`)

### Optional
- `FIRECRAWL_API_KEY` - Firecrawl API key for web scraping (required for website documents)
- `TINYBIRD_TOKEN` - Tinybird token for analytics (analytics disabled if not set)
- `CLERK_WEBHOOK_SECRET` - Clerk webhook secret for user sync
- `NEXT_PUBLIC_URL` - Application URL (defaults to localhost:3000)

## Common Workflows

### Creating a New Document (Website)
1. User submits URL via `/api/documents` POST
2. API creates `Document` record with `project_id`, `name`, `folder`
3. API creates `Snapshot` record with `type: "website"`, `status: "queued"`, links to `document_id`
4. API triggers `process-snapshot` Trigger.dev task with `snapshotId`
5. Task fetches URL with Firecrawl → converts to markdown → splits into chunks → stores markdown in Blob
6. Task updates snapshot with `status: "success"`, `chunks_count`, `metadata` (title, favicon, screenshot)
7. If `refresh_enabled`, creates Trigger.dev schedule via `src/lib/schedules.ts`

### Creating a New Document (Upload)
1. User uploads file via `/api/documents` POST with multipart/form-data
2. API creates `Document` record
3. API creates `Snapshot` record with `type: "upload"`, `status: "queued"`
4. API uploads file to Vercel Blob
5. API triggers `parse-document` task with `{ documentId, snapshotId, blobUrl }`
6. Task downloads file → parses with LlamaParse → splits into chunks → stores markdown in Blob
7. Task updates snapshot with `status: "success"`, `chunks_count`, `metadata` (file_name, file_size)

### Deploying Snapshots
1. User creates deployment via UI or API
2. API creates `Deployment` record with `status: "queued"`
3. User links snapshots to deployment via snapshot-and-deployment relations
4. User triggers deployment build
5. `deploy` task runs:
   - Creates new Upstash Vector index (or resets existing)
   - Fetches all linked snapshots and their markdown chunks
   - Generates embeddings for all chunks with OpenAI
   - Upserts embeddings to vector index with metadata
   - Updates deployment `status: "ready"`, stores `vector_index_id`
6. Vector index config cached in Redis with encrypted token

### Searching
1. User queries `/api/search/[projectId]/[deploymentId]/[query]`
2. API gets vector index from cache or creates new client
3. API queries vector index with semantic search (topK=5)
4. Returns results with scores, content, and metadata
5. (Optional) Logs request to Tinybird for analytics

### Scheduled Refresh
1. Trigger.dev schedule fires for document (daily/weekly/monthly)
2. `refetch-website` task runs with `externalId: documentId`
3. Task creates new snapshot with `type: "website"`, `status: "queued"`
4. Task triggers `process-snapshot` with new snapshotId
5. Process snapshot compares content hash with previous snapshot
6. Sets `changes_detected: true/false` based on comparison
7. User can manually link new snapshot to deployment and rebuild

## UI Components & Patterns

### Component Structure
- **shadcn/ui**: Base components in `src/components/ui/` (Avatar, Badge, Button, Card, Dialog, Input, Select, Table, Tabs, etc.)
- **Custom Elements**: Domain-specific components in `src/components/elements/`
  - `file-type-badge.tsx` - Badge showing file type icon
  - `folder-path-selector.tsx` - Folder navigation breadcrumb
  - `inline-editable-field.tsx` - Click-to-edit text field
  - `metadata-schema-editor.tsx` - JSON schema editor for document metadata
  - `snapshot-status-badge.tsx` - Status indicator for snapshots
- **AI Elements**: AI-specific UI in `src/components/ai-elements/` (for chat interface)
  - Message rendering, code blocks, citations, reasoning display
  - Built with Vercel AI SDK UI components

### Layout Patterns
- **App Layout**: `src/app/layout.tsx` - Root layout with Clerk provider, theme, fonts
- **Project Layout**: `src/app/projects/layout.tsx` - Sidebar navigation with breadcrumbs
- **Providers**: `src/app/providers/` - Context providers (Electric, Collections, FolderDocumentVersion)

### Real-time Data Pattern
```typescript
// 1. index.tsx (Server Component)
import { db } from '@/db';
import dynamic from 'next/dynamic';

const ClientPage = dynamic(() => import('./client'), { ssr: false });

export default async function Page() {
  const preloadedData = await db.select().from(Table);
  return <ClientPage preloadedData={preloadedData} />;
}

// 2. client.tsx (Client Component)
'use client';
import { useLiveQuery } from '@tanstack/react-db';
import { useCollection } from '@/hooks/use-collections';

export default function ClientPage({ preloadedData }) {
  const collection = useCollection('table');
  const liveData = useLiveQuery(collection, { preloadedData });
  // Use liveData - updates in real-time
}
```

### Form Validation
- Use Zod schemas for validation
- Export schemas for OpenAPI generation
- Use drizzle-zod for database-derived schemas
- Example: `DocumentInsertSchema` from Drizzle schema

### Styling
- Tailwind CSS 4 with `@tailwindcss/postcss`
- Class name merging with `cn()` utility
- Dark mode with `next-themes` (ThemeProvider)
- Animation classes from `tw-animate-css`
- Responsive design with mobile-first approach

## Analytics with Tinybird
- **Overview**: Lupa uses Tinybird to store and analyze search API request logs
- **Token Setup**: Add `TINYBIRD_TOKEN="p.your_token_here"` to `.env`. If not set, analytics are disabled
- **Configuration**: Tinybird resources are in `src/tinybird/` (datasources and pipes)
- **Deploy**: Run `cd src/tinybird && tb --cloud deploy` to deploy analytics infrastructure
- **Data Sources**:
  - `search_api_logs` - High-level request info (timestamp, query, status, response_time_ms, results_count, etc.)
  - `search_results` - Individual search results (document_id, snapshot_id, embedding_id, rank, similarity_score)
- **Available Pipes**: 
  - Deployment: `deployment_overview`, `requests_timeseries`, `top_queries`, `top_documents`, `top_snapshots`, `top_embeddings`, `errors`, `performance_distribution`, `zero_results_queries`, `query_document_mapping`
  - Project: `project_overview`, `project_timeseries`, `project_errors`
- **Client Functions**: Use `src/lib/tinybird-client.ts` for querying analytics
  - Deployment-level: `getDeploymentOverview()`, `getTopQueries()`, `getTopDocuments()`, `getTopSnapshots()`, `getTopEmbeddings()`, `getQueryDocumentMapping()`, `getZeroResultsQueries()`, `getErrors()`, `getPerformanceDistribution()`, `getRequestsTimeseries()`
  - Project-level: `getProjectOverview()`, `getProjectTimeseries()`, `getProjectErrors()`
- **Analytics Endpoints**:
  - Deployment: `/api/analytics/[projectId]/[deploymentId]/[endpoint]`
  - Project: `/api/analytics/[projectId]/[endpoint]`
  - Available endpoints: `/overview`, `/timeseries`, `/queries`, `/errors`, `/documents`, `/snapshots`, `/embeddings`, `/query-document-mapping`, `/zero-results`
- **Logging**: Search API automatically logs requests (fire-and-forget via `src/lib/tinybird.ts`, won't block responses)
- **Data Retention**: 90-day TTL on all data sources

## Security & Authentication

### Clerk Authentication
- **Provider**: Clerk handles all auth (signup, login, session management)
- **Middleware**: `src/middleware.ts` protects routes (requires auth for `/projects/*`)
- **Public Routes**: `/`, `/docs`, `/api/collections/*` (Electric endpoints)
- **Session**: Access via `auth()` in server components/API routes
- **User ID**: Use `userId` from Clerk session for multi-tenancy

### Encryption
- **Location**: `src/lib/crypto.ts`
- **Purpose**: Encrypt vector index tokens before caching in Redis
- **Algorithm**: AES-256-GCM with ENCRYPTION_SECRET
- **Functions**: `encrypt(text)`, `decrypt(encryptedText)`
- **Usage**: Only for sensitive credentials (vector tokens), not for user data

### API Security
- All API routes should validate Clerk session (except public endpoints)
- Use Zod for request validation
- Never expose internal IDs or sensitive data in responses
- CORS configured in `next.config.ts` for docs.lupa.build origin

### Database Security
- Use parameterized queries (Drizzle ORM handles this)
- Never use raw SQL with user input
- Validate all user input with Zod before database operations

## Deployment & Production

### Vercel Deployment
- **Build Command**: `bun run build` (generates OpenAPI docs + Next.js build)
- **Environment Variables**: Set all required env vars in Vercel dashboard
- **Regions**: Prefer `iad1` (us-east) for API routes (set via `export const preferredRegion`)
- **Edge Runtime**: Not used (due to Node.js dependencies like crypto)

### Database Setup
1. Create Neon PostgreSQL database with pgvector extension
2. Run `bunx drizzle-kit push` to create tables
3. Configure Electric source with Neon connection string
4. Test Electric connection with `/api/collections/projects` endpoint

### Trigger.dev Setup
1. Create Trigger.dev project
2. Set `TRIGGER_SECRET_KEY` in environment
3. Deploy tasks: `bunx trigger.dev@latest deploy`
4. Monitor jobs at cloud.trigger.dev

### Upstash Setup
1. Create Redis database for caching
2. Create Vector indexes per deployment (handled automatically by deploy task)
3. Set `UPSTASH_MANAGEMENT_API_KEY` for programmatic index creation

### Monitoring
- Check Trigger.dev dashboard for failed tasks
- Monitor Tinybird for search performance and errors
- Use Vercel Analytics for frontend performance
- Check deployment logs for build errors

## Git Hooks & CI

### Pre-commit Hook (`.husky/pre-commit`)
- Runs Biome check on staged files
- Auto-formats and re-stages files
- Aborts commit if no changes remain after formatting
- Filters: Only checks `.js`, `.jsx`, `.ts`, `.tsx`, `.json`, `.css` files
- Excludes: `convex/_generated/` directory

### Commit Message Hook (`.husky/commit-msg`)
- Validates commit message format (configured separately)

### CI/CD
- No GitHub Actions configured yet
- Vercel handles automatic deployments on push to main
- Consider adding: TypeScript type checking, Biome lint in CI

## Troubleshooting & Common Issues

### "ENCRYPTION_SECRET is not set"
- **Cause**: Missing `ENCRYPTION_SECRET` environment variable
- **Fix**: Generate with `openssl rand -base64 32` and add to `.env`
- **Impact**: Vector index token caching will fail

### "Invalid encrypted data"
- **Cause**: Encryption key changed or corrupted cached data
- **Fix**: API automatically invalidates cache and retries
- **Manual**: Clear Redis key `vectorConfig:{deploymentId}`

### "Deployment {id} does not have a vector index"
- **Cause**: Deployment not built yet or build failed
- **Fix**: Check deployment status, trigger build via deploy task
- **Check**: Redis key `vectorIndexId:{deploymentId}` should exist

### Electric Connection Issues
- **Cause**: Wrong `ELECTRIC_SOURCE_ID` or `ELECTRIC_SECRET`
- **Fix**: Verify credentials, check Electric dashboard
- **Test**: Visit `/api/collections/projects` - should return shape protocol

### Trigger.dev Tasks Failing
- **Cause**: Missing API keys (LlamaParse, Firecrawl, OpenAI)
- **Fix**: Check Trigger.dev logs for specific error
- **Retry**: Tasks automatically retry 3 times with exponential backoff

### Pre-commit Hook Failing
- **Cause**: Biome formatting changes files but commit becomes empty
- **Fix**: Make substantive code changes, not just formatting
- **Skip**: Use `git commit --no-verify` (not recommended)

### Real-time Updates Not Working
- **Cause**: Missing Electric provider or wrong collection shape
- **Fix**: Ensure ElectricProvider wraps app, collection defined in `src/db/collections/`
- **Debug**: Check browser console for Electric connection errors

### OpenAPI Docs Not Generated
- **Cause**: Missing `@openapi` tag or invalid Zod schemas
- **Fix**: Add `@openapi` to route JSDoc, export Zod schemas
- **Regenerate**: Run `bun run docs`

## Performance Optimization

### Caching Strategy
- **Vector Configs**: Cached 60 minutes in Redis (encrypted)
- **Search Results**: Not cached (always fresh)
- **Analytics**: Tinybird handles query caching
- **Static Assets**: Next.js automatic optimization

### Database Indexing
- Add indexes on frequently queried columns (e.g., `project_id`, `document_id`)
- Use `SELECT` with specific columns, not `SELECT *`
- Consider pagination for large result sets

### Vector Search Optimization
- Current topK: 5 results (configurable)
- Consider adjusting based on use case
- Monitor P95 latency in Tinybird analytics

### Trigger.dev Optimization
- Tasks run with max 3600s timeout
- Batch operations where possible
- Use parallel processing for independent operations
- Monitor task duration in dashboard

## Development Tips

### Adding a New Parser
1. Create parser file in `src/lib/parsers/my-parser/`
2. Implement `DocumentParser` interface
3. Register in `src/lib/parsers/index.ts` with priority
4. Test with various file formats
5. Update documentation

### Adding a New API Route
1. Create route file in `src/app/api/[path]/route.ts`
2. Export HTTP method functions (GET, POST, etc.)
3. Add JSDoc with `@openapi` for documentation
4. Export Zod schemas for request/response
5. Run `bun run docs` to regenerate OpenAPI
6. Test with `/docs` viewer

### Adding a New Background Task
1. Create task file in `src/trigger/my-task.task.ts`
2. Use `tasks.create()` or `schedules.task()` from Trigger.dev SDK
3. Add error handling and logging
4. Test locally with `bunx trigger.dev@latest dev`
5. Deploy with `bunx trigger.dev@latest deploy`

### Adding a New Database Table
1. Define schema in `src/db/schema/my-table.ts`
2. Export from `src/db/schema/index.ts`
3. Run `bunx drizzle-kit generate` to create migration
4. Run `bunx drizzle-kit push` to apply migration
5. If real-time needed, create collection in `src/db/collections/`
6. Update Electric configuration

### Debugging Vercel AI SDK
- Check network tab for streaming responses
- Use `onFinish` callback to log completion
- Enable `sendReasoning: true` to see AI reasoning
- Monitor token usage with `tokenlens`

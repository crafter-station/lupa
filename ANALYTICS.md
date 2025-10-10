# Lupa Analytics with Tinybird

This document describes the analytics implementation for Lupa's search API using Tinybird.

## Overview

Lupa uses Tinybird to store and analyze search API request logs, providing insights into:
- API usage patterns
- Search performance metrics
- Content performance (which documents/snapshots/embeddings are most retrieved)
- Query analytics and zero-result detection
- Error tracking

## Architecture

### Data Sources

#### 1. `search_api_logs`
Stores high-level information about each search API request.

**Schema:**
- `timestamp` - When the request was made
- `request_id` - Unique identifier for the request
- `project_id` - Project identifier
- `deployment_id` - Deployment identifier
- `query` - The search query string
- `query_length` - Length of the query
- `status_code` - HTTP response status code
- `response_time_ms` - API response time in milliseconds
- `results_returned` - Number of results returned
- `error_message` - Error message if request failed
- `avg_similarity_score` - Average similarity score of results
- `min_similarity_score` - Minimum similarity score
- `max_similarity_score` - Maximum similarity score

#### 2. `search_results`
Stores detailed information about each individual search result (embedding-level).

**Schema:**
- `timestamp` - When the request was made
- `request_id` - Links to search_api_logs
- `project_id` - Project identifier
- `deployment_id` - Deployment identifier
- `document_id` - Document that contains this result
- `snapshot_id` - Snapshot that contains this result
- `embedding_id` - Unique embedding/chunk identifier
- `rank` - Position in search results (1 = first)
- `similarity_score` - Relevance score

### Analytics Endpoints

All analytics endpoints follow the pattern:
```
GET /api/analytics/[projectId]/[deploymentId]/[endpoint]
```

#### Available Endpoints:

1. **`/overview`** - High-level statistics
   - Query params: `hours` (default: 24)
   - Returns: Total requests, success rate, avg response time, P95 latency, avg results count, avg relevance score

2. **`/timeseries`** - Request metrics over time
   - Query params: `days` (default: 7)
   - Returns: Hourly buckets with request count, avg latency, errors, avg relevance

3. **`/queries`** - Top search queries
   - Query params: `days` (default: 30), `limit` (default: 50)
   - Returns: Most frequent queries with frequency, latency, results count, relevance

4. **`/errors`** - Error breakdown
   - Query params: `days` (default: 30)
   - Returns: Error types, counts, last seen, sample query

5. **`/documents`** - Top performing documents
   - Query params: `days` (default: 30), `limit` (default: 100)
   - Returns: Document IDs with appearance counts, avg score, avg position, times ranked first

6. **`/snapshots`** - Top performing snapshots
   - Query params: `days` (default: 30), `limit` (default: 100)
   - Returns: Snapshot IDs with appearance counts, avg score, avg position

7. **`/embeddings`** - Top performing embeddings/chunks
   - Query params: `days` (default: 30), `limit` (default: 100)
   - Returns: Embedding IDs with appearance counts, avg score, avg position, last retrieved

## Setup

### 1. Configure Tinybird Token

Add your Tinybird token to `.env`:
```bash
TINYBIRD_TOKEN="p.your_token_here"
```

Get this from your Tinybird dashboard at https://www.tinybird.co/

### 2. Deploy Tinybird Resources

The Tinybird configuration is in `src/tinybird/`:
```
src/tinybird/
├── datasources/
│   ├── search_api_logs.datasource
│   └── search_results.datasource
└── pipes/
    ├── deployment_overview.pipe
    ├── requests_timeseries.pipe
    ├── top_queries.pipe
    ├── errors.pipe
    ├── performance_distribution.pipe
    ├── zero_results_queries.pipe
    ├── top_documents.pipe
    ├── top_snapshots.pipe
    ├── top_embeddings.pipe
    └── query_document_mapping.pipe
```

Deploy to Tinybird:
```bash
cd src/tinybird
tb --cloud deploy
```

Verify deployment:
```bash
# Check datasources were created
tb --cloud datasource ls

# Test data ingestion
tb --cloud datasource append search_results --events '{"request_id":"test_123","project_id":"proj_test","deployment_id":"dep_test","document_id":"doc_test","snapshot_id":"snap_test","embedding_id":"emb_test","rank":1,"similarity_score":0.95}'
```

### 3. Search API Integration

The search API (`/api/search/[projectId]/[deploymentId]/[query]`) automatically logs:
- Every search request to `search_api_logs`
- Every search result to `search_results`

Logging is fire-and-forget (doesn't block API responses) and fails silently if Tinybird is unavailable.

## Usage Examples

### Fetch Overview Stats
```typescript
const response = await fetch(
  `/api/analytics/${projectId}/${deploymentId}/overview?hours=24`
);
const { data } = await response.json();
// data[0] = { total_requests, successful_requests, failed_requests, ... }
```

### Fetch Top Queries
```typescript
const response = await fetch(
  `/api/analytics/${projectId}/${deploymentId}/queries?days=30&limit=50`
);
const { data } = await response.json();
// data = [{ query, frequency, avg_latency, avg_results, avg_relevance }, ...]
```

### Fetch Top Documents
```typescript
const response = await fetch(
  `/api/analytics/${projectId}/${deploymentId}/documents?days=30`
);
const { data } = await response.json();
// data = [{ document_id, total_appearances, unique_searches, avg_score, ... }, ...]
```

## Data Retention

All data sources have a 90-day TTL (Time To Live). Data older than 90 days is automatically deleted.

## Tinybird Client Functions

The `src/lib/tinybird-client.ts` module exports functions for querying analytics:

- `getDeploymentOverview(projectId, deploymentId, hours)`
- `getRequestsTimeseries(projectId, deploymentId, days)`
- `getTopQueries(projectId, deploymentId, days, limit)`
- `getErrors(projectId, deploymentId, days)`
- `getPerformanceDistribution(projectId, deploymentId, days)`
- `getZeroResultsQueries(projectId, deploymentId, days, limit)`
- `getTopDocuments(projectId, deploymentId, days, limit)`
- `getTopSnapshots(projectId, deploymentId, days, limit)`
- `getTopEmbeddings(projectId, deploymentId, days, limit)`
- `getQueryDocumentMapping(projectId, deploymentId, days, limit)`

## Dashboard Ideas

Use the analytics endpoints to build dashboards showing:

1. **Usage Overview**
   - Total requests (24h, 7d, 30d)
   - Success rate percentage
   - Average response time + P95
   - Request volume chart over time

2. **Content Performance**
   - Most retrieved documents
   - Most retrieved snapshots
   - Most retrieved embeddings/chunks
   - Content coverage gaps

3. **Query Insights**
   - Top queries by frequency
   - Queries returning zero results (indicates content gaps)
   - Query → Document mapping

4. **Performance & Quality**
   - Response time distribution
   - Average relevance scores over time
   - Error rates and types

## Notes

- Logging is **optional** - if `TINYBIRD_TOKEN` is not set, logging is skipped with a warning
- All logging is **fire-and-forget** - failures don't affect search API performance
- Data is partitioned by month for efficient querying
- Queries are optimized with proper sorting keys for fast retrieval

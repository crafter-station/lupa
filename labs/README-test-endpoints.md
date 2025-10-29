# Public API Endpoint Test Suite

This test suite validates all public API endpoints with different API key types.

## Usage

```bash
bun labs/test-public-api-endpoints.ts
```

## Configuration

Update these values at the top of the file:

```typescript
const API_KEYS = {
  LUPA_SK_LIVE: "lupa_sk_live_...",  // Secret key for live/production
  LUPA_SK_TEST: "lupa_sk_test_...",  // Secret key for test/staging
  LUPA_PK_LIVE: "lupa_pk_live_...",  // Public key for live (read-only)
  LUPA_PK_TEST: "lupa_pk_test_...",  // Public key for test (read-only)
};

const PROJECT_ID = "your_project_id";
const DEPLOYMENT_ID = "your_deployment_id";
```

## How It Works

1. **Define Endpoints**: Each endpoint has expected status codes for all 4 key types
2. **Loop Through Keys**: For each endpoint, test with all 4 API keys
3. **Compare Results**: Shows expected vs actual status codes
4. **Summary**: Final report showing passed/failed tests

## Output Format

For each endpoint:
```
================================================================================
📝 Endpoint Name
   METHOD /endpoint/path
================================================================================

LUPA_SK_LIVE:
  Expected: 200 Success
  ✅ Actual:   200 Success
  Response: {...}

LUPA_PK_LIVE:
  Expected: 403 Forbidden
  ✅ Actual:   403 Forbidden
  Response: {"error": "READ_ONLY_KEY"}
```

## Key Insights

- **Secret Keys (sk)**: Full read/write access
- **Public Keys (pk)**: Read-only, write operations return 403 Forbidden
- **Live Keys**: Default to production deployment
- **Test Keys**: Default to staging deployment

## Tested Endpoints

- Search
- Deployments (create, promote, update)
- Documents (CRUD + bulk)
- Snapshots
- File System Operations (ls, cat, tree)
- MCP Protocol (endpoint, message, sse)

Total: 16 endpoints × 4 key types = 64 test cases

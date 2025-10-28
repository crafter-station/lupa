# Public API Reference

Complete reference for Lupa's public API endpoints available at `https://<projectId>.lupa.build (e.g., abc1234567.lupa.build)/api/*`.

## Base URL

```
https://<projectId>.lupa.build (e.g., abc1234567.lupa.build)/api
```

Replace `<projectId>` with your actual project ID (e.g., `abc1234567`).

## Authentication

All endpoints require authentication via API key in the `Authorization` header:

```bash
Authorization: Bearer lupa_sk_live_...
```

See [API Keys](./api-keys.md) for details on key types and environments.

## Common Headers

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | Yes | API key (Bearer token) |
| `Deployment-Id` | Conditional | Required for deployment-scoped operations if not using default |
| `Content-Type` | For POST/PATCH | `application/json` |

## Error Response Format

All errors return a consistent JSON structure:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {} // Optional, only in development
  }
}
```

Common status codes: `400` (Bad Request), `403` (Forbidden), `404` (Not Found), `500` (Internal Error)

---

## Search

### Search Deployment

Query a deployment's vector index with semantic search.

**Endpoint**: `GET /api/search`

**Query Parameters**:
- `query` (required): Search query string

**Headers**:
- `Deployment-Id`: Deployment to search (optional if using default)

**Example Request**:
```bash
curl "https://abc1234567.lupa.build/api/search?query=refund+policy" \
  -H "Authorization: Bearer lupa_sk_live_..." \
  -H "Deployment-Id: def4567890"
```

**Example Response**:
```json
{
  "results": [
    {
      "id": "doc8901234",
      "name": "Refund Policy",
      "folder": "/policies/",
      "score": 0.95,
      "content": "Our refund policy allows...",
      "metadata": {
        "type": "website",
        "url": "https://example.com/refunds"
      }
    }
  ],
  "query": "refund policy",
  "deployment_id": "def4567890"
}
```

**Permissions**: Read access (works with both `sk` and `pk` keys)

---

## Deployments

### Create Deployment

Create a new deployment from a snapshot.

**Endpoint**: `POST /api/deployments`

**Request Body**:
```json
{
  "snapshotId": "snp2345678",
  "environment": "staging" // or "production"
}
```

**Example Request**:
```bash
curl -X POST https://abc1234567.lupa.build/api/deployments \
  -H "Authorization: Bearer lupa_sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "snapshotId": "snp2345678",
    "environment": "staging"
  }'
```

**Example Response**:
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

**Permissions**: Write access (requires `sk` key)

**Status**: `201 Created`

---

### Promote Deployment

Promote a staging deployment to production.

**Endpoint**: `POST /api/deployments/{deploymentId}/promote`

**Path Parameters**:
- `deploymentId`: ID of deployment to promote

**Example Request**:
```bash
curl -X POST https://abc1234567.lupa.build/api/deployments/def4567890/promote \
  -H "Authorization: Bearer lupa_sk_live_..."
```

**Example Response**:
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

**Requirements**:
- Deployment must have `status = "ready"`
- Deployment must belong to the project

**Permissions**: Write access (requires `sk` key)

**Errors**:
- `DEPLOYMENT_NOT_READY` (400): Deployment not ready
- `DEPLOYMENT_NOT_FOUND` (404): Deployment not found

---

### Update Deployment Environment

Manually update a deployment's environment.

**Endpoint**: `PATCH /api/deployments/{deploymentId}/environment`

**Path Parameters**:
- `deploymentId`: ID of deployment to update

**Request Body**:
```json
{
  "environment": "production" // or "staging"
}
```

**Example Request**:
```bash
curl -X PATCH https://abc1234567.lupa.build/api/deployments/def4567890/environment \
  -H "Authorization: Bearer lupa_sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{"environment": "production"}'
```

**Example Response**:
```json
{
  "success": true
}
```

**Permissions**: Write access (requires `sk` key)

---

## Documents

### Create Document

Add a new document to the project.

**Endpoint**: `POST /api/documents`

**Query Parameters**:
- `type`: Document type (`website`, `file`, etc.)

**Request Body**:
```json
{
  "folder": "/docs/",
  "name": "Privacy Policy",
  "url": "https://example.com/privacy", // For website type
  "enhance": true // Optional: enhance with LLM
}
```

**Example Request**:
```bash
curl -X POST "https://abc1234567.lupa.build/api/documents?type=website" \
  -H "Authorization: Bearer lupa_sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "folder": "/docs/",
    "name": "Privacy Policy",
    "url": "https://example.com/privacy",
    "enhance": true
  }'
```

**Example Response**:
```json
{
  "id": "doc8901234",
  "project_id": "abc1234567",
  "folder": "/docs/",
  "name": "Privacy Policy",
  "type": "website",
  "status": "pending",
  "metadata": {
    "url": "https://example.com/privacy"
  },
  "created_at": "2025-10-28T10:30:00Z"
}
```

**Permissions**: Write access (requires `sk` key)

**Status**: `201 Created`

**Errors**:
- `DUPLICATE_DOCUMENT` (409): Document with same name exists in folder
- `VALIDATION_ERROR` (400): Invalid input

---

### Get Document

Retrieve a specific document.

**Endpoint**: `GET /api/documents/{documentId}`

**Path Parameters**:
- `documentId`: ID of document to retrieve

**Example Request**:
```bash
curl https://abc1234567.lupa.build/api/documents/doc8901234 \
  -H "Authorization: Bearer lupa_sk_live_..."
```

**Example Response**:
```json
{
  "id": "doc8901234",
  "project_id": "abc1234567",
  "folder": "/docs/",
  "name": "Privacy Policy",
  "type": "website",
  "status": "processed",
  "metadata": {
    "url": "https://example.com/privacy",
    "word_count": 1500
  },
  "created_at": "2025-10-28T10:30:00Z",
  "updated_at": "2025-10-28T10:35:00Z"
}
```

**Permissions**: Read access (works with both `sk` and `pk` keys)

---

### Update Document

Update an existing document.

**Endpoint**: `PATCH /api/documents/{documentId}`

**Path Parameters**:
- `documentId`: ID of document to update

**Request Body** (all fields optional):
```json
{
  "name": "New Document Name",
  "folder": "/new-folder/",
  "metadata": {
    "custom_field": "value"
  }
}
```

**Example Request**:
```bash
curl -X PATCH https://abc1234567.lupa.build/api/documents/doc8901234 \
  -H "Authorization: Bearer lupa_sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Privacy Policy",
    "folder": "/legal/"
  }'
```

**Example Response**:
```json
{
  "id": "doc8901234",
  "name": "Updated Privacy Policy",
  "folder": "/legal/",
  "updated_at": "2025-10-28T11:00:00Z"
}
```

**Permissions**: Write access (requires `sk` key)

---

### Delete Document

Delete a document.

**Endpoint**: `DELETE /api/documents/{documentId}`

**Path Parameters**:
- `documentId`: ID of document to delete

**Example Request**:
```bash
curl -X DELETE https://abc1234567.lupa.build/api/documents/doc8901234 \
  -H "Authorization: Bearer lupa_sk_live_..."
```

**Example Response**:
```json
{
  "success": true,
  "deleted_id": "doc8901234"
}
```

**Permissions**: Write access (requires `sk` key)

**Status**: `200 OK`

---

### Bulk Create Documents

Create multiple documents in a single request.

**Endpoint**: `POST /api/documents/bulk`

**Request Body**:
```json
{
  "documents": [
    {
      "folder": "/docs/",
      "name": "Doc 1",
      "url": "https://example.com/doc1"
    },
    {
      "folder": "/docs/",
      "name": "Doc 2",
      "url": "https://example.com/doc2"
    }
  ],
  "type": "website"
}
```

**Example Response**:
```json
{
  "created": [
    {
      "id": "doc8901234",
      "name": "Doc 1",
      "status": "pending"
    },
    {
      "id": "doc5678901",
      "name": "Doc 2",
      "status": "pending"
    }
  ],
  "failed": []
}
```

**Permissions**: Write access (requires `sk` key)

---

## Snapshots

### Create Snapshot

Create a snapshot of current documents for deployment.

**Endpoint**: `POST /api/snapshots`

**Request Body**:
```json
{
  "name": "Release v1.2.0",
  "description": "October 2025 release"
}
```

**Example Request**:
```bash
curl -X POST https://abc1234567.lupa.build/api/snapshots \
  -H "Authorization: Bearer lupa_sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Release v1.2.0",
    "description": "October 2025 release"
  }'
```

**Example Response**:
```json
{
  "id": "snp2345678",
  "project_id": "abc1234567",
  "name": "Release v1.2.0",
  "description": "October 2025 release",
  "document_count": 150,
  "status": "pending",
  "created_at": "2025-10-28T10:30:00Z"
}
```

**Permissions**: Write access (requires `sk` key)

**Status**: `201 Created`

---

## File System Operations (Agent Tools)

These endpoints provide file system-like access to deployment contents for AI agents.

### List Files

List files in a deployment folder.

**Endpoint**: `GET /api/ls`

**Query Parameters**:
- `folder` (required): Folder path to list (e.g., `/docs/`)

**Headers**:
- `Deployment-Id` (required): Deployment to list from

**Example Request**:
```bash
curl "https://abc1234567.lupa.build/api/ls?folder=/docs/" \
  -H "Authorization: Bearer lupa_sk_live_..." \
  -H "Deployment-Id: def4567890"
```

**Example Response**:
```json
{
  "folder": "/docs/",
  "files": [
    {
      "name": "Privacy Policy",
      "path": "/docs/Privacy Policy",
      "type": "document"
    },
    {
      "name": "Terms of Service",
      "path": "/docs/Terms of Service",
      "type": "document"
    }
  ],
  "folders": [
    {
      "name": "legal",
      "path": "/docs/legal/",
      "type": "folder"
    }
  ]
}
```

**Permissions**: Read access (works with both `sk` and `pk` keys)

---

### Read File

Read the content of a file in a deployment.

**Endpoint**: `GET /api/cat`

**Query Parameters**:
- `path` (required): File path to read (e.g., `/docs/Privacy Policy`)

**Headers**:
- `Deployment-Id` (required): Deployment to read from

**Example Request**:
```bash
curl "https://abc1234567.lupa.build/api/cat?path=/docs/Privacy%20Policy" \
  -H "Authorization: Bearer lupa_sk_live_..." \
  -H "Deployment-Id: def4567890"
```

**Example Response**:
```json
{
  "path": "/docs/Privacy Policy",
  "content": "# Privacy Policy\n\nOur privacy policy...",
  "metadata": {
    "type": "website",
    "url": "https://example.com/privacy",
    "word_count": 1500
  }
}
```

**Permissions**: Read access (works with both `sk` and `pk` keys)

---

### Get File Tree

Get a tree view of deployment files with configurable depth.

**Endpoint**: `GET /api/tree`

**Query Parameters**:
- `folder` (optional): Root folder (default: `/`)
- `depth` (optional): Tree depth (default: `0` = unlimited)

**Headers**:
- `Deployment-Id` (required): Deployment to read from

**Example Request**:
```bash
curl "https://abc1234567.lupa.build/api/tree?folder=/&depth=2" \
  -H "Authorization: Bearer lupa_sk_live_..." \
  -H "Deployment-Id: def4567890"
```

**Example Response**:
```json
{
  "root": "/",
  "tree": {
    "name": "/",
    "type": "folder",
    "children": [
      {
        "name": "docs",
        "type": "folder",
        "children": [
          {
            "name": "Privacy Policy",
            "type": "document",
            "path": "/docs/Privacy Policy"
          }
        ]
      }
    ]
  }
}
```

**Permissions**: Read access (works with both `sk` and `pk` keys)

---

## MCP Protocol (Model Context Protocol)

Lupa implements the Model Context Protocol for AI agent integrations.

### MCP Endpoint

**Endpoint**: `POST /api/mcp`

**Headers**:
- `Deployment-Id` (required): Deployment context

**Request Body**: MCP protocol message (JSON-RPC 2.0)

**Permissions**: Read access (works with both `sk` and `pk` keys)

**Note**: See [MCP specification](https://spec.modelcontextprotocol.io/) for protocol details.

---

### SSE Transport

**Endpoint**: `GET /api/sse`

**Headers**:
- `Deployment-Id` (required): Deployment context

**Response**: Server-Sent Events stream

**Permissions**: Read access (works with both `sk` and `pk` keys)

---

### Message Handler

**Endpoint**: `POST /api/message`

**Headers**:
- `Deployment-Id` (required): Deployment context

**Request Body**: MCP message

**Permissions**: Read access (works with both `sk` and `pk` keys)

---

## Rate Limits

**Current Limits** (subject to change):
- 1000 requests per hour per API key
- 100 searches per minute per deployment
- 10 MB max request body size

**Rate Limit Headers** (returned in responses):
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 995
X-RateLimit-Reset: 1698504000
```

**Rate Limit Exceeded Response**:
```json
{
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 60 seconds.",
    "retry_after": 60
  }
}
```

**Status**: `429 Too Many Requests`

---

## Webhooks

Lupa can send webhooks for various events (coming soon).

**Supported Events**:
- `deployment.ready`: Deployment finished processing
- `deployment.failed`: Deployment processing failed
- `document.processed`: Document finished processing
- `document.failed`: Document processing failed

---

## SDKs & Client Libraries

**Official SDKs** (coming soon):
- JavaScript/TypeScript
- Python
- Go

**Community SDKs**:
- See [GitHub](https://github.com/lupa) for community contributions

---

## Changelog

- **2025-10-28**: Initial API reference documentation
- **2025-10-28**: Added deployment promotion endpoints
- **2025-10-28**: Added environment update endpoint
- **2025-10-28**: Added file tree endpoint
- **2025-10-28**: Documented read-only key restrictions

---

## Related Documentation

- [Authentication](./authentication.md) - Authentication methods
- [API Keys](./api-keys.md) - API key management
- [Deployments](./deployments.md) - Deployment system details
- [Utilities](./utilities.md) - Helper utilities
- [API Routes Architecture](./api-routes.md) - System architecture

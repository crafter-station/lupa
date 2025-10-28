# Lupa API Documentation

Welcome to the Lupa API documentation. This guide will help you navigate our comprehensive documentation system.

## 📚 Documentation Overview

Our documentation is organized into focused topics for easier navigation and maintenance:

### **Core Documentation**

| Document | Description |
|----------|-------------|
| **[api-routes.md](./api-routes.md)** | Architecture overview and quick start guide |
| **[authentication.md](./authentication.md)** | Complete authentication system documentation |
| **[api-keys.md](./api-keys.md)** | API key management, types, and environments |
| **[deployments.md](./deployments.md)** | Deployment system, environments, and promotion |
| **[public-api-reference.md](./public-api-reference.md)** | Complete API endpoint reference |
| **[utilities.md](./utilities.md)** | Development utilities and helper functions |

---

## 🚀 Quick Start

### For External Developers

Building an application that uses Lupa's API?

1. Start with **[api-routes.md](./api-routes.md)** for architecture overview
2. Read **[api-keys.md](./api-keys.md)** to understand key types and environments
3. Reference **[public-api-reference.md](./public-api-reference.md)** for specific endpoints
4. See **[deployments.md](./deployments.md)** for environment management

**Quick Example**:
```bash
curl "https://abc1234567.lupa.build/api/search?query=refund" \
  -H "Authorization: Bearer lupa_sk_live_..."
```

### For Lupa Developers

Working on Lupa's codebase?

1. Start with **[api-routes.md](./api-routes.md)** for system architecture
2. Read **[utilities.md](./utilities.md)** for helper functions and patterns
3. Reference **[authentication.md](./authentication.md)** for auth flows
4. Check **[AGENTS.md](../AGENTS.md)** for code style guidelines

**Quick Pattern**:
```typescript
import { proxyToPublicAPI, extractSessionOrgId, validateProjectOwnership } from "@/lib/api-proxy";
import { handleApiError } from "@/lib/api-error";

export async function POST(req: NextRequest) {
  try {
    const orgId = await extractSessionOrgId();
    const { projectId, ...payload } = Schema.parse(await req.json());
    await validateProjectOwnership(projectId, orgId);
    return await proxyToPublicAPI(projectId, "/endpoint", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
```

---

## 📖 Documentation Map

### By Topic

**Authentication & Security**:
- API key authentication → [authentication.md](./authentication.md#1-api-key-authentication-external-users)
- Internal tokens → [authentication.md](./authentication.md#2-internal-token-system-server-to-server)
- Clerk sessions → [authentication.md](./authentication.md#3-clerk-session-authentication-www-users)
- Security best practices → [authentication.md](./authentication.md#security-best-practices)

**API Keys**:
- Key types (sk vs pk) → [api-keys.md](./api-keys.md#key-types)
- Environments (live vs test) → [api-keys.md](./api-keys.md#environments)
- Creating keys → [api-keys.md](./api-keys.md#creating-api-keys)
- Key management → [api-keys.md](./api-keys.md#managing-api-keys)
- Best practices → [api-keys.md](./api-keys.md#best-practices)

**Deployments**:
- Environments → [deployments.md](./deployments.md#deployment-environments)
- Auto-resolution → [deployments.md](./deployments.md#deployment-resolution)
- Promotion → [deployments.md](./deployments.md#promoting-deployments)
- Redis caching → [deployments.md](./deployments.md#redis-caching)

**API Endpoints**:
- Search → [public-api-reference.md](./public-api-reference.md#search)
- Documents → [public-api-reference.md](./public-api-reference.md#documents)
- Deployments → [public-api-reference.md](./public-api-reference.md#deployments)
- File operations → [public-api-reference.md](./public-api-reference.md#file-system-operations-agent-tools)
- MCP protocol → [public-api-reference.md](./public-api-reference.md#mcp-protocol-model-context-protocol)

**Development Utilities**:
- Error handling → [utilities.md](./utilities.md#error-handling-libapiets)
- API proxying → [utilities.md](./utilities.md#api-proxy-utilities-libapi-proxyts)
- URL rewriting → [utilities.md](./utilities.md#url-rewriting-libproxy-routests)
- Best practices → [utilities.md](./utilities.md#best-practices)

### By Use Case

**"I want to search my knowledge base"**:
1. Get API key → [api-keys.md](./api-keys.md#creating-api-keys)
2. Choose environment → [api-keys.md](./api-keys.md#environments)
3. Make search request → [public-api-reference.md](./public-api-reference.md#search-deployment)

**"I want to add documents"**:
1. Use secret key → [api-keys.md](./api-keys.md#secret-keys-sk)
2. Create documents → [public-api-reference.md](./public-api-reference.md#create-document)
3. Create snapshot → [public-api-reference.md](./public-api-reference.md#create-snapshot)
4. Create deployment → [public-api-reference.md](./public-api-reference.md#create-deployment)

**"I want to deploy to production"**:
1. Create staging deployment → [deployments.md](./deployments.md#creating-deployments)
2. Test with test key → [api-keys.md](./api-keys.md#test-environment-test)
3. Promote to production → [deployments.md](./deployments.md#promoting-deployments)

**"I want to build a new API route"**:
1. Choose route type → [api-routes.md](./api-routes.md#core-concepts)
2. Use utilities → [utilities.md](./utilities.md#complete-application-route-pattern)
3. Handle errors → [utilities.md](./utilities.md#error-handling-libapiets)
4. Add URL rewriting (if public) → [utilities.md](./utilities.md#url-rewriting-libproxy-routests)

**"I need to understand authentication"**:
1. System overview → [authentication.md](./authentication.md#overview)
2. Middleware flow → [authentication.md](./authentication.md#middleware-authentication-flow)
3. Security practices → [authentication.md](./authentication.md#security-best-practices)

---

## 🔍 Search by Keyword

Can't find what you're looking for? Try these common keywords:

- **API Key** → [api-keys.md](./api-keys.md)
- **Authentication** → [authentication.md](./authentication.md)
- **Authorization** → [authentication.md](./authentication.md#application-route-authentication-pattern)
- **Deployment** → [deployments.md](./deployments.md)
- **Environment** → [api-keys.md](./api-keys.md#environments) or [deployments.md](./deployments.md#deployment-environments)
- **Error** → [utilities.md](./utilities.md#error-handling-libapiets)
- **Live/Test** → [api-keys.md](./api-keys.md#environments)
- **Production/Staging** → [deployments.md](./deployments.md#deployment-environments)
- **Public/Secret Key** → [api-keys.md](./api-keys.md#key-types)
- **Promotion** → [deployments.md](./deployments.md#promoting-deployments)
- **Proxy** → [utilities.md](./utilities.md#api-proxy-utilities-libapi-proxyts)
- **Redis** → [deployments.md](./deployments.md#redis-caching)
- **Search** → [public-api-reference.md](./public-api-reference.md#search)
- **Security** → [authentication.md](./authentication.md#security-best-practices)
- **Subdomain** → [api-routes.md](./api-routes.md#architecture-principles)
- **Token** → [authentication.md](./authentication.md#2-internal-token-system-server-to-server)
- **Utilities** → [utilities.md](./utilities.md)
- **Validation** → [utilities.md](./utilities.md#validation-utilities)

---

## 📝 Document Changelog

All documentation was created/updated on **2025-10-28** to reflect major architectural improvements:

### Recent Changes
- Split monolithic `api-routes.md` into focused documents
- Documented new API key system (sk/pk, live/test)
- Documented deployment environment auto-resolution
- Added read-only public key restrictions
- Updated all examples with new key formats
- Added comprehensive error handling documentation

See individual files for detailed changelogs.

---

## 🤝 Contributing

When updating documentation:

1. **Keep it focused** - Each file covers one topic
2. **Cross-reference** - Link to related docs when needed
3. **Update changelog** - Add entry to relevant file's changelog
4. **Test examples** - Ensure code examples are accurate
5. **Update this README** - If adding new sections or topics

---

## 📬 Questions?

- **External developers**: See [public-api-reference.md](./public-api-reference.md) or create an issue
- **Internal developers**: Check [AGENTS.md](../../AGENTS.md) or ask in Slack

---

## External Documentation

Related documentation outside this directory:

- [Database Schema](../../drizzle/README.md) - Drizzle schema documentation
- [Document Parsers](../../src/lib/parsers/README.md) - Parser system architecture
- [Background Jobs](./trigger.md) - Trigger.dev task documentation
- [Analytics](./analytics.md) - Tinybird integration

---

**Last Updated**: 2025-10-28

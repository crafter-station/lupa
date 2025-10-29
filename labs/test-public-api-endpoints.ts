import { generateId } from "@/lib/generate-id";

const API_KEYS = {
  LUPA_SK_LIVE: "lupa_sk_live_sPEzo_2W5B2yoPRNA4-x8_itphIdCiv5",
  LUPA_SK_TEST: "lupa_sk_test_I9n782X5djQdsZrTJNjxUuuUdwZJakKG",
  LUPA_PK_LIVE: "lupa_pk_live_YxaHdIotyWm2mLkN-dwe7DlT_iY9smLn",
  LUPA_PK_TEST: "lupa_pk_test_Rml9efMVss3CLxKBtxwdgOw1K1v6hicl",
} as const;

const PROJECT_ID = "vpd5osm963";
const DEPLOYMENT_ID = "c14qqkic7i";

const BASE_URL = `http://${PROJECT_ID}.localhost:3000/api`;

type KeyType = keyof typeof API_KEYS;

interface EndpointTest {
  name: string;
  method: "GET" | "POST" | "PATCH" | "DELETE";
  endpoint: string;
  body?: unknown;
  headers?: Record<string, string>;
  expectedStatusByKey: {
    LUPA_SK_LIVE: number;
    LUPA_SK_TEST: number;
    LUPA_PK_LIVE: number;
    LUPA_PK_TEST: number;
  };
}

const ENDPOINT_TESTS: EndpointTest[] = [
  // {
  //   name: "Search Default",
  //   method: "GET",
  //   endpoint: "/search?query=refund+policy",
  //   expectedStatusByKey: {
  //     LUPA_SK_LIVE: 200,
  //     LUPA_SK_TEST: 200,
  //     LUPA_PK_LIVE: 200,
  //     LUPA_PK_TEST: 200,
  //   },
  // },
  // {
  //   name: "Search",
  //   method: "GET",
  //   endpoint: "/search?query=refund+policy",
  //   headers: { "Deployment-Id": DEPLOYMENT_ID },
  //   expectedStatusByKey: {
  //     LUPA_SK_LIVE: 200,
  //     LUPA_SK_TEST: 200,
  //     LUPA_PK_LIVE: 200,
  //     LUPA_PK_TEST: 200,
  //   },
  // },
  // {
  //   name: "Get File Tree Default",
  //   method: "GET",
  //   endpoint: "/tree?folder=/&depth=2",
  //   expectedStatusByKey: {
  //     LUPA_SK_LIVE: 200,
  //     LUPA_SK_TEST: 200,
  //     LUPA_PK_LIVE: 200,
  //     LUPA_PK_TEST: 200,
  //   },
  // },
  // {
  //   name: "Get File Tree",
  //   method: "GET",
  //   endpoint: "/tree?folder=/&depth=2",
  //   headers: { "Deployment-Id": DEPLOYMENT_ID },
  //   expectedStatusByKey: {
  //     LUPA_SK_LIVE: 200,
  //     LUPA_SK_TEST: 200,
  //     LUPA_PK_LIVE: 200,
  //     LUPA_PK_TEST: 200,
  //   },
  // },

  // {
  //   name: "Read File Default",
  //   method: "GET",
  //   endpoint: `/cat?path=${encodeURIComponent("/abc/abc")}`,
  //   expectedStatusByKey: {
  //     LUPA_SK_LIVE: 200,
  //     LUPA_SK_TEST: 200,
  //     LUPA_PK_LIVE: 200,
  //     LUPA_PK_TEST: 200,
  //   },
  // },
  // {
  //   name: "Read File Default",
  //   method: "GET",
  //   endpoint: `/cat?path=${encodeURIComponent("/abc/abc")}`,
  //   headers: { "Deployment-Id": DEPLOYMENT_ID },
  //   expectedStatusByKey: {
  //     LUPA_SK_LIVE: 200,
  //     LUPA_SK_TEST: 200,
  //     LUPA_PK_LIVE: 200,
  //     LUPA_PK_TEST: 200,
  //   },
  // },

  // {
  //   name: "Create Document",
  //   method: "POST",
  //   endpoint: "/documents?type=website",
  //   body: {
  //     folder: "/test/",
  //     name: generateId(),
  //     url: "https://example.com/test",
  //     enhance: false,
  //   },
  //   expectedStatusByKey: {
  //     LUPA_SK_LIVE: 200,
  //     LUPA_SK_TEST: 200,
  //     LUPA_PK_LIVE: 403,
  //     LUPA_PK_TEST: 403,
  //   },
  // },
  {
    name: "Get Document",
    method: "GET",
    endpoint: "/documents/3aekeooh66",
    expectedStatusByKey: {
      LUPA_SK_LIVE: 200,
      LUPA_SK_TEST: 200,
      LUPA_PK_LIVE: 200,
      LUPA_PK_TEST: 200,
    },
  },
  {
    name: "Update Document",
    method: "PATCH",
    endpoint: "/documents/atd52zukbs",
    body: {
      name: "updated-test-doc",
      folder: "/test-updated/",
    },
    expectedStatusByKey: {
      LUPA_SK_LIVE: 200,
      LUPA_SK_TEST: 200,
      LUPA_PK_LIVE: 403,
      LUPA_PK_TEST: 403,
    },
  },
  {
    name: "Bulk Create Documents",
    method: "POST",
    endpoint: "/documents/bulk",
    body: {
      documents: [
        {
          folder: "/bulk-test/",
          name: `bulk-doc-${generateId()}`,
          url: "https://example.com/doc1",
        },
        {
          folder: "/bulk-test/",
          name: `bulk-doc-${generateId()}`,
          url: "https://example.com/doc2",
        },
      ],
      type: "website",
    },
    expectedStatusByKey: {
      LUPA_SK_LIVE: 200,
      LUPA_SK_TEST: 200,
      LUPA_PK_LIVE: 403,
      LUPA_PK_TEST: 403,
    },
  },
  {
    name: "Create Snapshot",
    method: "POST",
    endpoint: "/snapshots?type=website",
    body: {
      name: "Test Snapshot v1.0.0",
      description: "Test snapshot for API testing",
    },
    expectedStatusByKey: {
      LUPA_SK_LIVE: 201,
      LUPA_SK_TEST: 201,
      LUPA_PK_LIVE: 403,
      LUPA_PK_TEST: 403,
    },
  },

  // {
  //   name: "MCP Endpoint",
  //   method: "POST",
  //   endpoint: "/mcp",
  //   headers: { "Deployment-Id": DEPLOYMENT_ID },
  //   body: {
  //     jsonrpc: "2.0",
  //     method: "tools/list",
  //     id: 1,
  //   },
  //   expectedStatusByKey: {
  //     LUPA_SK_LIVE: 200,
  //     LUPA_SK_TEST: 200,
  //     LUPA_PK_LIVE: 200,
  //     LUPA_PK_TEST: 200,
  //   },
  // },
  // {
  //   name: "MCP Message Handler",
  //   method: "POST",
  //   endpoint: "/message",
  //   headers: { "Deployment-Id": DEPLOYMENT_ID },
  //   body: {
  //     jsonrpc: "2.0",
  //     method: "resources/list",
  //     id: 2,
  //   },
  //   expectedStatusByKey: {
  //     LUPA_SK_LIVE: 200,
  //     LUPA_SK_TEST: 200,
  //     LUPA_PK_LIVE: 200,
  //     LUPA_PK_TEST: 200,
  //   },
  // },
  // {
  //   name: "MCP SSE Transport",
  //   method: "GET",
  //   endpoint: "/sse",
  //   headers: { "Deployment-Id": DEPLOYMENT_ID },
  //   expectedStatusByKey: {
  //     LUPA_SK_LIVE: 200,
  //     LUPA_SK_TEST: 200,
  //     LUPA_PK_LIVE: 200,
  //     LUPA_PK_TEST: 200,
  //   },
  // },
];

interface TestResult {
  endpoint: string;
  keyType: KeyType;
  expected: number;
  actual: number;
  matches: boolean;
  responsePreview: string;
}

const results: TestResult[] = [];

function getStatusDescription(status: number): string {
  if (status >= 200 && status < 300) return "Success";
  if (status === 400) return "Bad Request";
  if (status === 401) return "Unauthorized";
  if (status === 403) return "Forbidden";
  if (status === 404) return "Not Found";
  if (status === 409) return "Conflict";
  if (status === 429) return "Rate Limited";
  if (status >= 500) return "Server Error";
  return "Unknown";
}

async function makeRequest(
  endpoint: string,
  method: string,
  apiKey: string,
  body?: unknown,
  headers?: Record<string, string>,
) {
  const url = `${BASE_URL}${endpoint}`;

  const requestHeaders: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    ...headers,
  };

  if (body) {
    requestHeaders["Content-Type"] = "application/json";
  }

  try {
    const response = await fetch(url, {
      method,
      headers: requestHeaders,
      body: body ? JSON.stringify(body) : undefined,
    });

    const contentType = response.headers.get("content-type");
    let data: unknown;

    if (contentType?.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return { status: response.status, data };
  } catch (error) {
    return {
      status: 0,
      data: { error: error instanceof Error ? error.message : String(error) },
    };
  }
}

function truncateResponse(data: unknown): string {
  if (typeof data === "string") {
    return data.slice(0, 200);
  }
  const jsonStr = JSON.stringify(data, null, 2);
  return jsonStr.slice(0, 600);
}

async function runTests() {
  console.log("🚀 Lupa Public API Endpoint Tests");
  console.log(`📍 Base URL: ${BASE_URL}\n`);

  for (const test of ENDPOINT_TESTS) {
    console.log(`${"=".repeat(80)}`);
    console.log(`📝 ${test.name}`);
    console.log(`   ${test.method} ${test.endpoint}`);
    console.log(`${"=".repeat(80)}\n`);

    for (const keyType of Object.keys(API_KEYS) as KeyType[]) {
      const apiKey = API_KEYS[keyType];
      const expectedStatus = test.expectedStatusByKey[keyType];

      const { status, data } = await makeRequest(
        test.endpoint,
        test.method,
        apiKey,
        test.body,
        test.headers,
      );

      const matches = status === expectedStatus;
      const icon = matches ? "✅" : "❌";
      const statusDesc = getStatusDescription(status);

      console.log(`${keyType}:`);
      console.log(
        `  Expected: ${expectedStatus} ${getStatusDescription(expectedStatus)}`,
      );
      console.log(`  ${icon} Actual:   ${status} ${statusDesc}`);
      console.log(`  Response: ${truncateResponse(data)}`);
      console.log();

      results.push({
        endpoint: `${test.method} ${test.endpoint}`,
        keyType,
        expected: expectedStatus,
        actual: status,
        matches,
        responsePreview: truncateResponse(data),
      });
    }
  }

  console.log(`\n${"=".repeat(80)}`);
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(80));

  const totalTests = results.length;
  const passedTests = results.filter((r) => r.matches).length;
  const failedTests = results.filter((r) => !r.matches).length;

  console.log(`\n✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${failedTests}/${totalTests}`);

  if (failedTests > 0) {
    console.log("\n❌ Failed Tests:");
    results
      .filter((r) => !r.matches)
      .forEach((r) => {
        console.log(`\n  ${r.endpoint}`);
        console.log(`    Key: ${r.keyType}`);
        console.log(`    Expected: ${r.expected}`);
        console.log(`    Actual: ${r.actual}`);
      });
  }

  console.log("\n🎉 Test run completed!\n");

  process.exit(failedTests > 0 ? 1 : 0);
}

runTests().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

import { matchRoute } from "../src/lib/proxy-routes";

const testCases = [
  {
    name: "Base documents route",
    pathname: "/api/documents",
    searchParams: new URLSearchParams(),
    expected: "/api/projects/test_proj/documents",
  },
  {
    name: "Documents with query params",
    pathname: "/api/documents",
    searchParams: new URLSearchParams("type=website"),
    expected: "/api/projects/test_proj/documents?type=website",
  },
  {
    name: "Specific document by ID",
    pathname: "/api/documents/doc_123",
    searchParams: new URLSearchParams(),
    expected: "/api/projects/test_proj/documents/doc_123",
  },
  {
    name: "Specific document with query params",
    pathname: "/api/documents/doc_456",
    searchParams: new URLSearchParams("include=snapshots"),
    expected: "/api/projects/test_proj/documents/doc_456?include=snapshots",
  },
  {
    name: "Bulk documents route",
    pathname: "/api/documents/bulk",
    searchParams: new URLSearchParams(),
    expected: "/api/projects/test_proj/documents/bulk",
  },
  {
    name: "Bulk documents with query params",
    pathname: "/api/documents/bulk",
    searchParams: new URLSearchParams("validate=true"),
    expected: "/api/projects/test_proj/documents/bulk?validate=true",
  },
];

console.log("Testing proxy route rewrites...\n");

let passed = 0;
let failed = 0;

for (const test of testCases) {
  const result = matchRoute({
    projectId: "test_proj",
    deploymentId: null,
    pathname: test.pathname,
    searchParams: test.searchParams,
  });

  const success = result === test.expected;

  if (success) {
    passed++;
    console.log(`✅ ${test.name}`);
  } else {
    failed++;
    console.log(`❌ ${test.name}`);
    console.log(`   Expected: ${test.expected}`);
    console.log(`   Got:      ${result}`);
  }
}

console.log(`\nResults: ${passed} passed, ${failed} failed`);

process.exit(failed > 0 ? 1 : 0);

// Quick test script to check if vector search is working
const { Index } = require("@upstash/vector");

async function testVectorSearch() {
  try {
    console.log("Testing Upstash Vector connection...");

    const index = new Index({
      url: process.env.UPSTASH_VECTOR_REST_URL,
      token: process.env.UPSTASH_VECTOR_REST_TOKEN,
    });

    // Test a simple query
    const results = await index.query({
      data: "test query",
      topK: 5,
      includeMetadata: true,
      includeData: true,
    });

    console.log("✅ Vector search connection successful!");
    console.log(`Found ${results.length} results for test query`);

    if (results.length === 0) {
      console.log("⚠️  No documents found in vector store. You need to upload documents first.");
    } else {
      console.log("Sample result:", {
        id: results[0].id,
        score: results[0].score,
        content: results[0].data?.substring(0, 100) + "...",
        metadata: results[0].metadata,
      });
    }

  } catch (error) {
    console.error("❌ Vector search test failed:", error.message);
    console.log("Please check your UPSTASH_VECTOR_REST_URL and UPSTASH_VECTOR_REST_TOKEN");
  }
}

testVectorSearch();

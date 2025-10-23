const TINYBIRD_API_URL = "https://api.us-east.aws.tinybird.co/v0/events";
const TINYBIRD_TOKEN = process.env.TINYBIRD_TOKEN;

export async function logSearchRequest(data: {
  requestId: string;
  projectId: string;
  deploymentId: string;
  query: string;
  statusCode: number;
  responseTimeMs: number;
  resultsReturned: number;
  errorMessage?: string;
  avgSimilarityScore?: number;
  minSimilarityScore?: number;
  maxSimilarityScore?: number;
}) {
  if (!TINYBIRD_TOKEN) {
    console.warn("TINYBIRD_TOKEN not configured, skipping logging");
    return;
  }

  try {
    await fetch(`${TINYBIRD_API_URL}?name=search_api_logs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TINYBIRD_TOKEN}`,
      },
      body: JSON.stringify({
        request_id: data.requestId,
        project_id: data.projectId,
        deployment_id: data.deploymentId,
        query: data.query,
        query_length: data.query.length,
        status_code: data.statusCode,
        response_time_ms: data.responseTimeMs,
        results_returned: data.resultsReturned,
        error_message: data.errorMessage || "",
        avg_similarity_score: data.avgSimilarityScore || 0,
        min_similarity_score: data.minSimilarityScore || 0,
        max_similarity_score: data.maxSimilarityScore || 0,
      }),
    });
  } catch (error) {
    console.error("Failed to log search request to Tinybird:", error);
  }
}

export async function logSearchResult(data: {
  requestId: string;
  projectId: string;
  deploymentId: string;
  documentId: string;
  snapshotId: string;
  embeddingId: string;
  rank: number;
  similarityScore: number;
}) {
  if (!TINYBIRD_TOKEN) {
    return;
  }

  try {
    await fetch(`${TINYBIRD_API_URL}?name=search_results`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TINYBIRD_TOKEN}`,
      },
      body: JSON.stringify({
        request_id: data.requestId,
        project_id: data.projectId,
        deployment_id: data.deploymentId,
        document_id: data.documentId,
        snapshot_id: data.snapshotId,
        embedding_id: data.embeddingId,
        rank: data.rank,
        similarity_score: data.similarityScore,
      }),
    });
  } catch (error) {
    console.error("Failed to log search result to Tinybird:", error);
  }
}

export async function logSearchResults(
  requestId: string,
  projectId: string,
  deploymentId: string,
  results: Array<{
    id: string | number;
    score: number;
    metadata?: unknown;
  }>,
) {
  const promises = results.map((result, index) => {
    const metadata = result.metadata as
      | { documentId?: string; snapshotId?: string }
      | undefined;
    return logSearchResult({
      requestId,
      projectId,
      deploymentId,
      documentId: metadata?.documentId || "",
      snapshotId: metadata?.snapshotId || "",
      embeddingId: String(result.id),
      rank: index + 1,
      similarityScore: result.score,
    });
  });

  await Promise.all(promises);
}

export async function logApiKeyUsage(data: {
  timestamp: Date;
  projectId: string;
  apiKeyId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
}) {
  if (!TINYBIRD_TOKEN) {
    return;
  }

  try {
    await fetch(`${TINYBIRD_API_URL}?name=api_key_usage`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TINYBIRD_TOKEN}`,
      },
      body: JSON.stringify({
        timestamp: data.timestamp.toISOString(),
        project_id: data.projectId,
        api_key_id: data.apiKeyId,
        endpoint: data.endpoint,
        method: data.method,
        status_code: data.statusCode,
        response_time_ms: data.responseTimeMs,
      }),
    });
  } catch (error) {
    console.error("Failed to log API key usage to Tinybird:", error);
  }
}

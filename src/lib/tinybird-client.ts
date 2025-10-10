const TINYBIRD_API_URL = "https://api.us-east.aws.tinybird.co/v0/pipes";
const TINYBIRD_TOKEN = process.env.TINYBIRD_TOKEN;

type TinybirdParams = Record<string, string | number | boolean>;

async function queryTinybird<T>(
  pipeName: string,
  params: TinybirdParams = {},
): Promise<T> {
  if (!TINYBIRD_TOKEN) {
    throw new Error("TINYBIRD_TOKEN not configured");
  }

  const queryString = new URLSearchParams(
    Object.entries(params).reduce(
      (acc, [key, value]) => {
        acc[key] = String(value);
        return acc;
      },
      {} as Record<string, string>,
    ),
  ).toString();

  const url = `${TINYBIRD_API_URL}/${pipeName}.json?${queryString}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TINYBIRD_TOKEN}`,
    },
  });

  if (!response.ok) {
    throw new Error(
      `Tinybird query failed: ${response.status} ${response.statusText}`,
    );
  }

  const data = await response.json();
  return data.data as T;
}

export async function getDeploymentOverview(
  projectId: string,
  deploymentId: string,
  hours = 24,
) {
  return queryTinybird<
    Array<{
      total_requests: number;
      successful_requests: number;
      failed_requests: number;
      avg_response_time: number;
      p95_response_time: number;
      avg_results_count: number;
      avg_relevance_score: number;
    }>
  >("deployment_overview", {
    project_id: projectId,
    deployment_id: deploymentId,
    hours,
  });
}

export async function getRequestsTimeseries(
  projectId: string,
  deploymentId: string,
  hours = 168,
  granularity: "5m" | "1h" | "1d" = "1h",
) {
  return queryTinybird<
    Array<{
      time_bucket: string;
      requests: number;
      avg_latency: number;
      errors: number;
      avg_relevance: number;
    }>
  >("requests_timeseries", {
    project_id: projectId,
    deployment_id: deploymentId,
    hours,
    granularity,
  });
}

export async function getTopQueries(
  projectId: string,
  deploymentId: string,
  days = 30,
  limit = 50,
) {
  return queryTinybird<
    Array<{
      query: string;
      frequency: number;
      avg_latency: number;
      avg_results: number;
      avg_relevance: number;
    }>
  >("top_queries", {
    project_id: projectId,
    deployment_id: deploymentId,
    days,
    limit,
  });
}

export async function getErrors(
  projectId: string,
  deploymentId: string,
  days = 30,
) {
  return queryTinybird<
    Array<{
      status_code: number;
      error_message: string;
      occurrences: number;
      last_seen: string;
      sample_query: string;
    }>
  >("errors", { project_id: projectId, deployment_id: deploymentId, days });
}

export async function getPerformanceDistribution(
  projectId: string,
  deploymentId: string,
  days = 7,
) {
  return queryTinybird<
    Array<{
      latency_bucket: string;
      requests: number;
    }>
  >("performance_distribution", {
    project_id: projectId,
    deployment_id: deploymentId,
    days,
  });
}

export async function getZeroResultsQueries(
  projectId: string,
  deploymentId: string,
  days = 30,
  limit = 100,
) {
  return queryTinybird<
    Array<{
      query: string;
      occurrences: number;
      avg_latency: number;
    }>
  >("zero_results_queries", {
    project_id: projectId,
    deployment_id: deploymentId,
    days,
    limit,
  });
}

export async function getTopDocuments(
  projectId: string,
  deploymentId: string,
  days = 30,
  limit = 100,
) {
  return queryTinybird<
    Array<{
      document_id: string;
      total_appearances: number;
      unique_searches: number;
      avg_score: number;
      avg_position: number;
      times_ranked_first: number;
    }>
  >("top_documents", {
    project_id: projectId,
    deployment_id: deploymentId,
    days,
    limit,
  });
}

export async function getTopSnapshots(
  projectId: string,
  deploymentId: string,
  days = 30,
  limit = 100,
) {
  return queryTinybird<
    Array<{
      snapshot_id: string;
      document_id: string;
      total_appearances: number;
      unique_searches: number;
      avg_score: number;
      avg_position: number;
      times_ranked_first: number;
    }>
  >("top_snapshots", {
    project_id: projectId,
    deployment_id: deploymentId,
    days,
    limit,
  });
}

export async function getTopEmbeddings(
  projectId: string,
  deploymentId: string,
  days = 30,
  limit = 100,
) {
  return queryTinybird<
    Array<{
      embedding_id: string;
      snapshot_id: string;
      document_id: string;
      total_appearances: number;
      avg_score: number;
      avg_position: number;
      times_ranked_first: number;
      last_retrieved: string;
    }>
  >("top_embeddings", {
    project_id: projectId,
    deployment_id: deploymentId,
    days,
    limit,
  });
}

export async function getQueryDocumentMapping(
  projectId: string,
  deploymentId: string,
  days = 30,
  limit = 200,
) {
  return queryTinybird<
    Array<{
      query: string;
      document_id: string;
      frequency: number;
      avg_score: number;
      avg_position: number;
    }>
  >("query_document_mapping", {
    project_id: projectId,
    deployment_id: deploymentId,
    days,
    limit,
  });
}

export async function getProjectOverview(projectId: string, hours = 24) {
  return queryTinybird<
    Array<{
      total_requests: number;
      successful_requests: number;
      failed_requests: number;
      avg_response_time: number;
      p95_response_time: number;
      avg_results_count: number;
      avg_relevance_score: number;
    }>
  >("project_overview", {
    project_id: projectId,
    hours,
  });
}

export async function getProjectTimeseries(
  projectId: string,
  hours = 168,
  granularity: "5m" | "1h" | "1d" = "1h",
) {
  return queryTinybird<
    Array<{
      time_bucket: string;
      requests: number;
      avg_latency: number;
      errors: number;
      avg_relevance: number;
    }>
  >("project_timeseries", {
    project_id: projectId,
    hours,
    granularity,
  });
}

export async function getProjectErrors(projectId: string, days = 30) {
  return queryTinybird<
    Array<{
      status_code: number;
      error_message: string;
      occurrences: number;
      last_seen: string;
      sample_query: string;
    }>
  >("project_errors", { project_id: projectId, days });
}

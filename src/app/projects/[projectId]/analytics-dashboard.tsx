"use client";

import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { ProjectSelect } from "@/db";

interface AnalyticsDashboardProps {
  preloadedProject: ProjectSelect;
  preloadedDeployments: Array<{
    id: string;
    project_id: string;
    status: string;
    created_at: string;
  }>;
}

interface OverviewData {
  total_requests: number;
  successful_requests: number;
  failed_requests: number;
  avg_response_time: number;
  p95_response_time: number;
  avg_results_count: number;
  avg_relevance_score: number;
}

interface TimeseriesData {
  time_bucket: string;
  requests: number;
  avg_latency: number;
  errors: number;
  avg_relevance: number;
}

interface ErrorData {
  status_code: number;
  error_message: string;
  occurrences: number;
  last_seen: string;
  sample_query: string;
}

export function AnalyticsDashboard({
  preloadedProject,
  preloadedDeployments,
}: AnalyticsDashboardProps) {
  const [selectedDeployment, setSelectedDeployment] = React.useState<string>(
    () => {
      if (typeof window !== "undefined") {
        const stored = localStorage.getItem(
          `lupa-analytics-deployment-${preloadedProject.id}`,
        );
        return stored || "all";
      }
      return "all";
    },
  );
  const [timeRange, setTimeRange] = React.useState<"1h" | "24h" | "7d" | "30d">(
    "24h",
  );

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(
        `lupa-analytics-deployment-${preloadedProject.id}`,
        selectedDeployment,
      );
    }
  }, [selectedDeployment, preloadedProject.id]);

  const selectedDeploymentData = React.useMemo(() => {
    if (!selectedDeployment || selectedDeployment === "all") return null;
    const deployment = preloadedDeployments.find(
      (d) => d.id === selectedDeployment,
    );
    if (!deployment) return null;
    return { deployment, project: preloadedProject };
  }, [selectedDeployment, preloadedDeployments, preloadedProject]);

  const hours =
    timeRange === "1h"
      ? 1
      : timeRange === "24h"
        ? 24
        : timeRange === "7d"
          ? 168
          : 720;
  const granularity =
    timeRange === "1h" ? "5m" : timeRange === "24h" ? "1h" : "1d";

  const { data: overviewData, isLoading: overviewLoading } = useQuery<
    OverviewData[]
  >({
    queryKey: [
      "analytics",
      "overview",
      preloadedProject.id,
      selectedDeployment,
      hours,
    ],
    queryFn: async () => {
      if (selectedDeployment === "all") {
        const response = await fetch(
          `/api/analytics/${preloadedProject.id}/overview?hours=${hours}`,
        );
        const json = await response.json();
        return json.data || [];
      }
      if (!selectedDeploymentData?.project) return [];
      const response = await fetch(
        `/api/analytics/${selectedDeploymentData.project.id}/${selectedDeploymentData.deployment.id}/overview?hours=${hours}`,
      );
      const json = await response.json();
      return json.data || [];
    },
    enabled: selectedDeployment === "all" || !!selectedDeploymentData?.project,
  });

  const { data: timeseriesData, isLoading: timeseriesLoading } = useQuery<
    TimeseriesData[]
  >({
    queryKey: [
      "analytics",
      "timeseries",
      preloadedProject.id,
      selectedDeployment,
      hours,
      granularity,
    ],
    queryFn: async () => {
      if (selectedDeployment === "all") {
        const response = await fetch(
          `/api/analytics/${preloadedProject.id}/timeseries?hours=${hours}&granularity=${granularity}`,
        );
        const json = await response.json();
        return json.data || [];
      }
      if (!selectedDeploymentData?.project) return [];
      const response = await fetch(
        `/api/analytics/${selectedDeploymentData.project.id}/${selectedDeploymentData.deployment.id}/timeseries?hours=${hours}&granularity=${granularity}`,
      );
      const json = await response.json();
      return json.data || [];
    },
    enabled: selectedDeployment === "all" || !!selectedDeploymentData?.project,
  });

  const { data: errorsData, isLoading: errorsLoading } = useQuery<ErrorData[]>({
    queryKey: [
      "analytics",
      "errors",
      preloadedProject.id,
      selectedDeployment,
      hours,
    ],
    queryFn: async () => {
      const days = Math.ceil(hours / 24);
      if (selectedDeployment === "all") {
        const response = await fetch(
          `/api/analytics/${preloadedProject.id}/errors?days=${days}`,
        );
        const json = await response.json();
        return json.data || [];
      }
      if (!selectedDeploymentData?.project) return [];
      const response = await fetch(
        `/api/analytics/${selectedDeploymentData.project.id}/${selectedDeploymentData.deployment.id}/errors?days=${days}`,
      );
      const json = await response.json();
      return json.data || [];
    },
    enabled: selectedDeployment === "all" || !!selectedDeploymentData?.project,
  });

  const overview = overviewData?.[0];

  const successRate = overview
    ? ((overview.successful_requests / overview.total_requests) * 100).toFixed(
        1,
      )
    : "0.0";

  const failureRate = overview
    ? ((overview.failed_requests / overview.total_requests) * 100).toFixed(1)
    : "0.0";

  const timeseriesChartConfig = {
    successful: {
      label: "Successful",
      color: "hsl(142.1 76.2% 36.3%)",
    },
    failed: {
      label: "Failed",
      color: "hsl(0 84.2% 60.2%)",
    },
  } satisfies ChartConfig;

  const timeseriesChartData = React.useMemo(() => {
    if (!timeseriesData || timeseriesData.length === 0) return [];

    const now = new Date();
    const dataPoints: Array<{
      time: string;
      successful: number;
      failed: number;
      total: number;
    }> = [];

    const intervalMs =
      granularity === "5m"
        ? 5 * 60 * 1000
        : granularity === "1h"
          ? 60 * 60 * 1000
          : 24 * 60 * 60 * 1000;

    const dataMap = new Map(
      timeseriesData.map((item) => [item.time_bucket, item]),
    );

    for (
      let i = 0;
      i <
      (granularity === "5m"
        ? 12
        : granularity === "1h"
          ? 24
          : timeRange === "7d"
            ? 7
            : 30);
      i++
    ) {
      const timestamp = new Date(now.getTime() - i * intervalMs);

      let bucketTime: Date;
      if (granularity === "5m") {
        const minutes = Math.floor(timestamp.getUTCMinutes() / 5) * 5;
        bucketTime = new Date(timestamp);
        bucketTime.setUTCMinutes(minutes, 0, 0);
      } else if (granularity === "1h") {
        bucketTime = new Date(timestamp);
        bucketTime.setUTCMinutes(0, 0, 0);
      } else {
        bucketTime = new Date(timestamp);
        bucketTime.setUTCHours(0, 0, 0, 0);
      }

      const bucketString =
        granularity === "5m"
          ? `${bucketTime.getUTCFullYear()}-${String(bucketTime.getUTCMonth() + 1).padStart(2, "0")}-${String(bucketTime.getUTCDate()).padStart(2, "0")} ${String(bucketTime.getUTCHours()).padStart(2, "0")}:${String(bucketTime.getUTCMinutes()).padStart(2, "0")}:00`
          : granularity === "1h"
            ? `${bucketTime.getUTCFullYear()}-${String(bucketTime.getUTCMonth() + 1).padStart(2, "0")}-${String(bucketTime.getUTCDate()).padStart(2, "0")} ${String(bucketTime.getUTCHours()).padStart(2, "0")}:00:00`
            : `${bucketTime.getUTCFullYear()}-${String(bucketTime.getUTCMonth() + 1).padStart(2, "0")}-${String(bucketTime.getUTCDate()).padStart(2, "0")} 00:00:00`;
      const item = dataMap.get(bucketString);

      const timeLabel =
        granularity === "5m"
          ? bucketTime.toLocaleString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
              hour12: false,
            })
          : granularity === "1h"
            ? bucketTime.toLocaleString("en-US", {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                hour12: false,
              })
            : bucketTime.toLocaleString("en-US", {
                month: "short",
                day: "numeric",
              });

      dataPoints.push({
        time: timeLabel,
        successful: item ? item.requests - item.errors : 0,
        failed: item ? item.errors : 0,
        total: item ? item.requests : 0,
      });
    }

    return dataPoints.reverse();
  }, [timeseriesData, granularity, timeRange]);

  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <Select
          value={selectedDeployment}
          onValueChange={setSelectedDeployment}
        >
          <SelectTrigger className="w-[400px]">
            <SelectValue placeholder="Select a deployment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Deployments</SelectItem>
            {preloadedDeployments
              .filter((d) => d.status === "ready")
              .map((deployment) => (
                <SelectItem key={deployment.id} value={deployment.id}>
                  {deployment.id} (
                  {new Date(deployment.created_at).toLocaleDateString()})
                </SelectItem>
              ))}
          </SelectContent>
        </Select>

        <Select
          value={timeRange}
          onValueChange={(v) => setTimeRange(v as typeof timeRange)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1h">Last hour</SelectItem>
            <SelectItem value="24h">Last 24 hours</SelectItem>
            <SelectItem value="7d">Last 7 days</SelectItem>
            <SelectItem value="30d">Last 30 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {selectedDeployment && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Requests</CardDescription>
                <CardTitle className="text-3xl">
                  {overviewLoading
                    ? "..."
                    : overview?.total_requests.toLocaleString() || "0"}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Successful</CardDescription>
                <CardTitle className="text-3xl text-green-600">
                  {overviewLoading
                    ? "..."
                    : overview?.successful_requests.toLocaleString() || "0"}
                </CardTitle>
                <CardDescription className="text-xs">
                  {successRate}% success rate
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Failed</CardDescription>
                <CardTitle className="text-3xl text-red-600">
                  {overviewLoading
                    ? "..."
                    : overview?.failed_requests.toLocaleString() || "0"}
                </CardTitle>
                <CardDescription className="text-xs">
                  {failureRate}% failure rate
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Avg Response Time</CardDescription>
                <CardTitle className="text-3xl">
                  {overviewLoading
                    ? "..."
                    : `${overview?.avg_response_time.toFixed(0) || "0"}ms`}
                </CardTitle>
                <CardDescription className="text-xs">
                  P95: {overview?.p95_response_time.toFixed(0) || "0"}ms
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Avg Results Count</CardDescription>
                <CardTitle className="text-3xl">
                  {overviewLoading
                    ? "..."
                    : overview?.avg_results_count.toFixed(1) || "0"}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Avg Relevance Score</CardDescription>
                <CardTitle className="text-3xl">
                  {overviewLoading
                    ? "..."
                    : overview?.avg_relevance_score.toFixed(3) || "0"}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Request Volume Over Time</CardTitle>
              <CardDescription>Successful vs failed requests</CardDescription>
            </CardHeader>
            <CardContent>
              {timeseriesLoading ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Loading...
                </div>
              ) : timeseriesChartData.length === 0 ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              ) : (
                <ChartContainer
                  config={timeseriesChartConfig}
                  className="h-[300px] w-full"
                >
                  <AreaChart data={timeseriesChartData}>
                    <defs>
                      <linearGradient
                        id="fillSuccessful"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="var(--color-successful)"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--color-successful)"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                      <linearGradient
                        id="fillFailed"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="var(--color-failed)"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--color-failed)"
                          stopOpacity={0.1}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="time"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={32}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={ChartTooltipContent}
                    />
                    <Area
                      dataKey="successful"
                      type="monotone"
                      fill="url(#fillSuccessful)"
                      stroke="var(--color-successful)"
                      stackId="a"
                    />
                    <Area
                      dataKey="failed"
                      type="monotone"
                      fill="url(#fillFailed)"
                      stroke="var(--color-failed)"
                      stackId="a"
                    />
                  </AreaChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Error Breakdown</CardTitle>
              <CardDescription>
                Errors by status code and message
              </CardDescription>
            </CardHeader>
            <CardContent>
              {errorsLoading ? (
                <div className="text-muted-foreground">Loading...</div>
              ) : !errorsData || errorsData.length === 0 ? (
                <div className="text-muted-foreground">No errors found</div>
              ) : (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Status Code</TableHead>
                        <TableHead>Error Message</TableHead>
                        <TableHead className="text-right">
                          Occurrences
                        </TableHead>
                        <TableHead>Last Seen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {errorsData.map((error) => (
                        <TableRow
                          key={`${error.status_code}-${error.error_message}-${error.last_seen}`}
                        >
                          <TableCell className="font-medium">
                            {error.status_code}
                          </TableCell>
                          <TableCell className="max-w-md truncate">
                            {error.error_message || "N/A"}
                          </TableCell>
                          <TableCell className="text-right">
                            {error.occurrences}
                          </TableCell>
                          <TableCell>
                            {new Date(error.last_seen).toLocaleString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
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

  const overview = overviewData?.[0];

  const timeseriesChartConfig = {
    requests: {
      label: "Requests",
      color: "hsl(217 91% 60%)",
    },
  } satisfies ChartConfig;

  const timeseriesChartData = React.useMemo(() => {
    if (!timeseriesData || timeseriesData.length === 0) return [];

    const now = new Date();
    const dataPoints: Array<{
      time: string;
      requests: number;
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
        requests: item ? item.requests : 0,
      });
    }

    return dataPoints.reverse();
  }, [timeseriesData, granularity, timeRange]);

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <Select
          value={selectedDeployment}
          onValueChange={setSelectedDeployment}
        >
          <SelectTrigger className="w-[280px]">
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
          <SelectTrigger className="w-[140px]">
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
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overviewLoading
                    ? "..."
                    : overview?.total_requests.toLocaleString() || "0"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg Response Time
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overviewLoading
                    ? "..."
                    : `${overview?.avg_response_time.toFixed(0) || "0"}ms`}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  P95: {overview?.p95_response_time.toFixed(0) || "0"}ms
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg Results Count
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overviewLoading
                    ? "..."
                    : overview?.avg_results_count.toFixed(1) || "0"}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg Relevance Score
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {overviewLoading
                    ? "..."
                    : overview?.avg_relevance_score.toFixed(3) || "0"}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Requests</CardTitle>
              <CardDescription>Request volume over time</CardDescription>
            </CardHeader>
            <CardContent className="pl-2">
              {timeseriesLoading ? (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                  Loading...
                </div>
              ) : timeseriesChartData.length === 0 ? (
                <div className="h-[350px] flex items-center justify-center text-muted-foreground">
                  No data available
                </div>
              ) : (
                <ChartContainer
                  config={timeseriesChartConfig}
                  className="h-[350px] w-full"
                >
                  <AreaChart
                    data={timeseriesChartData}
                    margin={{ left: 12, right: 12 }}
                  >
                    <defs>
                      <linearGradient
                        id="fillRequests"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="var(--color-requests)"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="var(--color-requests)"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      className="stroke-muted"
                    />
                    <XAxis
                      dataKey="time"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      minTickGap={32}
                      className="text-xs"
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      className="text-xs"
                    />
                    <ChartTooltip
                      cursor={false}
                      content={
                        // @ts-expect-error shadcn error
                        <ChartTooltipContent indicator="line" />
                      }
                    />
                    <Area
                      dataKey="requests"
                      type="monotone"
                      fill="url(#fillRequests)"
                      stroke="var(--color-requests)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

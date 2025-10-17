import { auth } from "@clerk/nextjs/server";
import { ELECTRIC_PROTOCOL_QUERY_PARAMS } from "@electric-sql/client";
import { z } from "zod";

import { PROJECT_TABLE } from "@/db";
import { ELECTRIC_URL } from "@/lib/electric";

export const preferredRegion = "iad1";

const WhereParamsSchema = z.object({
  where: z.string().optional(),
  params: z.record(z.string(), z.string()).optional(),
});

export async function GET(request: Request) {
  const url = new URL(request.url);

  const whereValue = url.searchParams.get("where");
  const paramsEntries: Record<string, string> = {};

  url.searchParams.forEach((value, key) => {
    if (key.startsWith("params[")) {
      paramsEntries[key] = value;
    }
  });

  const validation = WhereParamsSchema.safeParse({
    where: whereValue ?? undefined,
    params: Object.keys(paramsEntries).length > 0 ? paramsEntries : undefined,
  });

  if (!validation.success) {
    return Response.json(
      { success: false, error: "Invalid query parameters" },
      { status: 400 },
    );
  }

  const originUrl = new URL(ELECTRIC_URL);

  url.searchParams.forEach((value, key) => {
    if (
      ELECTRIC_PROTOCOL_QUERY_PARAMS.includes(key) ||
      key.startsWith("params[")
    ) {
      originUrl.searchParams.set(key, value);
    }
  });

  originUrl.searchParams.set("table", PROJECT_TABLE);

  const session = await auth();
  const org_id = session.orgId;

  if (whereValue) {
    originUrl.searchParams.set(
      "where",
      `org_id = '${org_id}' AND ${whereValue}`,
    );
  } else {
    originUrl.searchParams.set("where", `org_id = '${org_id}'`);
  }

  const response = await fetch(originUrl);

  const headers = new Headers(response.headers);
  headers.delete("content-encoding");
  headers.delete("content-length");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

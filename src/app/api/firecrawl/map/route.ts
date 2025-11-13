import { auth } from "@clerk/nextjs/server";
import { z } from "zod/v3";
import { firecrawl } from "@/clients/firecrawl";

export const preferredRegion = ["iad1"];

const MapRequestSchema = z.object({
  url: z.string().min(1, "URL is required"),
  limit: z.number().optional().default(50),
});

export async function POST(request: Request) {
  try {
    const { orgId } = await auth();

    if (!orgId) {
      return Response.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    const body = await request.json();
    const { url, limit } = MapRequestSchema.parse(body);

    if (!process.env.FIRECRAWL_API_KEY) {
      return Response.json(
        { success: false, error: "FIRECRAWL_API_KEY is not configured" },
        { status: 500 },
      );
    }

    const result = await firecrawl.map(url, {
      limit,
      includeSubdomains: false,
    });

    return Response.json({
      success: true,
      links: result.links.map((link) => {
        let folder = link.url
          .replace(url, "")
          .split("/")
          .slice(0, -1)
          .join("/");

        if (folder[0] !== "/") {
          folder = `/${folder}`;
        }

        if (folder[folder.length - 1] !== "/") {
          folder += "/";
        }

        return {
          ...link,
          folder,
        };
      }),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json(
        { success: false, error: error.issues[0].message },
        { status: 400 },
      );
    }

    return Response.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}

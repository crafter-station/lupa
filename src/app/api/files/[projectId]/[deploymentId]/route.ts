import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import * as schema from "@/db/schema";
import type { FileListItem } from "@/lib/types/search";

const querySchema = z.object({
  allSnapshots: z
    .string()
    .nullish()
    .transform((val) => val === "true"),
});

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ projectId: string; deploymentId: string }>;
  },
) {
  try {
    const { projectId, deploymentId } = await params;
    const { searchParams } = new URL(request.url);
    const { allSnapshots } = querySchema.parse({
      allSnapshots: searchParams.get("allSnapshots"),
    });

    const deployment = await db
      .select()
      .from(schema.Deployment)
      .where(eq(schema.Deployment.id, deploymentId))
      .limit(1);

    if (!deployment.length) {
      return new Response(JSON.stringify({ error: "Deployment not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    if (deployment[0].project_id !== projectId) {
      return new Response(
        JSON.stringify({ error: "Deployment does not belong to project" }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }

    const results = await db
      .select({
        documentId: schema.Document.id,
        documentName: schema.Document.name,
        documentPath: schema.Document.folder,
        snapshotId: schema.Snapshot.id,
        snapshotUrl: schema.Snapshot.url,
        snapshotType: schema.Snapshot.type,
        snapshotMarkdownUrl: schema.Snapshot.markdown_url,
        metadata: schema.Snapshot.metadata,
        extractedMetadata: schema.Snapshot.extracted_metadata,
        chunksCount: schema.Snapshot.chunks_count,
        createdAt: schema.Snapshot.created_at,
      })
      .from(schema.Document)
      .innerJoin(
        schema.Snapshot,
        eq(schema.Snapshot.document_id, schema.Document.id),
      )
      .innerJoin(
        schema.SnapshotDeploymentRel,
        and(
          eq(schema.SnapshotDeploymentRel.snapshot_id, schema.Snapshot.id),
          eq(schema.SnapshotDeploymentRel.deployment_id, deploymentId),
        ),
      )
      .where(
        and(
          eq(schema.Document.project_id, projectId),
          eq(schema.Snapshot.status, "success"),
        ),
      )
      .orderBy(desc(schema.Snapshot.created_at));

    if (allSnapshots) {
      const files: FileListItem[] = results.map((row) => ({
        documentId: row.documentId,
        documentName: row.documentName,
        documentPath: row.documentPath,
        snapshotId: row.snapshotId,
        snapshotUrl: row.snapshotMarkdownUrl || row.snapshotUrl,
        snapshotType: row.snapshotType,
        metadata: row.metadata,
        extractedMetadata: row.extractedMetadata,
        chunksCount: row.chunksCount || 0,
        createdAt: row.createdAt,
      }));

      return new Response(JSON.stringify({ files }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const seenDocuments = new Set<string>();
    const files: FileListItem[] = [];

    for (const row of results) {
      if (!seenDocuments.has(row.documentId)) {
        seenDocuments.add(row.documentId);
        files.push({
          documentId: row.documentId,
          documentName: row.documentName,
          documentPath: row.documentPath,
          snapshotId: row.snapshotId,
          snapshotUrl: row.snapshotMarkdownUrl || row.snapshotUrl,
          snapshotType: row.snapshotType,
          metadata: row.metadata,
          extractedMetadata: row.extractedMetadata,
          chunksCount: row.chunksCount || 0,
          createdAt: row.createdAt,
        });
      }
    }

    return new Response(JSON.stringify({ files }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("File listing API error:", error);

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: "Invalid query parameters",
          issues: error.issues,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Internal server error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}

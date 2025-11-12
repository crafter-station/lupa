import { logger, schedules } from "@trigger.dev/sdk/v3";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { generateId } from "@/lib/generate-id";
import { processSnapshotTask } from "./process-snapshot.task";

export const refetchWebsiteTask = schedules.task({
  id: "refetch-website",
  run: async (payload) => {
    const documentId = payload.externalId;

    if (!documentId) {
      logger.error("No externalId (documentId) provided in payload");
      throw new Error("No documentId provided");
    }

    logger.log("Starting website refetch", {
      documentId,
      scheduleId: payload.scheduleId,
      timestamp: payload.timestamp,
      timezone: payload.timezone,
    });

    const documents = await db
      .select()
      .from(schema.Document)
      .where(eq(schema.Document.id, documentId))
      .limit(1);

    if (!documents.length) {
      logger.error("Document not found", { documentId });
      throw new Error(`Document with id ${documentId} not found`);
    }

    const document = documents[0];

    if (!document.refresh_frequency) {
      logger.warn("Document refresh is disabled, skipping", { documentId });
      return { skipped: true, reason: "refresh_disabled" };
    }

    const snapshots = await db
      .select()
      .from(schema.Snapshot)
      .where(eq(schema.Snapshot.document_id, documentId))
      .orderBy(schema.Snapshot.created_at)
      .limit(1);

    if (!snapshots.length) {
      logger.error("No snapshots found for document", { documentId });
      throw new Error(`No snapshots found for document ${documentId}`);
    }

    const originalSnapshot = snapshots[0];
    const snapshotId = generateId();

    await db.insert(schema.Snapshot).values({
      id: snapshotId,
      org_id: originalSnapshot.org_id,
      document_id: documentId,
      url: originalSnapshot.url,
      status: "queued",
      type: "website",
      metadata: null,
      changes_detected: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      enhance: originalSnapshot.enhance,
    });

    logger.log("Created new snapshot for refetch", {
      documentId,
      snapshotId,
      url: originalSnapshot.url,
    });

    await processSnapshotTask.trigger({
      snapshotId,
    });

    logger.log("Triggered snapshot processing", {
      documentId,
      snapshotId,
    });

    return {
      documentId,
      snapshotId,
      url: originalSnapshot.url,
      nextRun: payload.upcoming[0],
    };
  },
});

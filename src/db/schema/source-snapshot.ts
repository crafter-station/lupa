import { z } from "zod";

export const SOURCE_SNAPSHOT_TABLE = "source_snapshot";

const BaseSourceSnapshotSchema = {
  id: z.string(),
  sourceId: z.string(),
  url: z.url(),
  createdAt: z.number(), // milliseconds since epoch
};

// Zod schema that matches the Snapshot type structure
export const SourceSnapshotSchema = z.union([
  // For queued, error, running statuses - type is optional
  z.object({
    ...BaseSourceSnapshotSchema,
    status: z.enum(["queued", "error", "running"]),
    type: z.enum(["website", "upload"]),
  }),
  // For success status with website type
  z.object({
    ...BaseSourceSnapshotSchema,
    status: z.literal("success"),
    chunksCount: z.number(),
    type: z.literal("website"),
    metadata: z.object({
      title: z.string().optional(),
      favicon: z.string().optional(),
      screenshot: z.string().optional(),
    }),
  }),
  // For success status with upload type
  z.object({
    ...BaseSourceSnapshotSchema,
    status: z.literal("success"),
    chunksCount: z.number(),
    type: z.literal("upload"),
    metadata: z.object({
      fileName: z.string().optional(),
      fileSize: z.number().optional(),
      modifiedAt: z.date().optional(),
      createdAt: z.date().optional(),
    }),
  }),
]);

export type SourceSnapshot = z.infer<typeof SourceSnapshotSchema>;

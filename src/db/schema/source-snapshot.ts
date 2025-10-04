import {
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import z from "zod";

export const SOURCE_SNAPSHOT_TABLE = "source_snapshot";

// Enums for snapshot status and type
export const SourceSnapshotStatus = pgEnum("source_snapshot_status_enum", [
  "queued",
  "error",
  "running",
  "success",
]);
export type SourceSnapshotStatus =
  (typeof SourceSnapshotStatus.enumValues)[number];

export const SourceSnapshotType = pgEnum("source_snapshot_type_enum", [
  "website",
  "upload",
]);
export type SourceSnapshotType = (typeof SourceSnapshotType.enumValues)[number];

// JSONB metadata types
export type WebsiteMetadata = {
  title?: string;
  favicon?: string;
  screenshot?: string;
};

export type UploadMetadata = {
  file_name?: string;
  file_size?: number;
  modified_at?: Date;
  created_at?: Date;
};

// Drizzle table
export const SourceSnapshot = pgTable(SOURCE_SNAPSHOT_TABLE, {
  id: text("id").primaryKey(),

  source_id: text("source_id").notNull(),
  url: text("url").notNull(),

  status: SourceSnapshotStatus("status").notNull(),
  type: SourceSnapshotType("type").notNull(),

  // Only present when status = "success"
  chunks_count: integer("chunks_count"),

  // Varies by type; may be null for non-success states
  metadata: jsonb("metadata").$type<WebsiteMetadata | UploadMetadata | null>(),

  created_at: timestamp("created_at", {
    withTimezone: true,
    mode: "string",
  }).defaultNow(),
  updated_at: timestamp("updated_at", {
    withTimezone: true,
    mode: "string",
  }).defaultNow(),
});

export const SourceSnapshotInsertSchema = createInsertSchema(SourceSnapshot);
export const SourceSnapshotSelectSchema = createSelectSchema(SourceSnapshot);

export type SourceSnapshotSelect = typeof SourceSnapshot.$inferSelect;
export type SourceSnapshotInsert = typeof SourceSnapshot.$inferInsert;

// Compatibility Zod schema used elsewhere (e.g., Convex runtime validation)
const BaseSourceSnapshotSchema = {
  id: z.string(),
  source_id: z.string(),
  url: z.url(),
  created_at: z.number(), // milliseconds since epoch (legacy shape)
};

export const SourceSnapshotSchema = z.union([
  // queued, error, running
  z.object({
    ...BaseSourceSnapshotSchema,
    status: z.enum(["queued", "error", "running"]),
    type: z.enum(["website", "upload"]),
  }),
  // success + website metadata
  z.object({
    ...BaseSourceSnapshotSchema,
    status: z.literal("success"),
    chunks_count: z.number(),
    type: z.literal("website"),
    metadata: z.object({
      title: z.string().optional(),
      favicon: z.string().optional(),
      screenshot: z.string().optional(),
    }),
  }),
  // success + upload metadata
  z.object({
    ...BaseSourceSnapshotSchema,
    status: z.literal("success"),
    chunks_count: z.number(),
    type: z.literal("upload"),
    metadata: z.object({
      file_name: z.string().optional(),
      file_size: z.number().optional(),
      modified_at: z.date().optional(),
      created_at: z.date().optional(),
    }),
  }),
]);

export type SourceSnapshot = z.infer<typeof SourceSnapshotSchema>;

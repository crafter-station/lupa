import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import z from "zod";

export const SNAPSHOT_TABLE = "snapshot";

// Enums for snapshot status and type
export const SnapshotStatus = pgEnum("snapshot_status_enum", [
  "queued",
  "error",
  "running",
  "success",
]);
export type SnapshotStatus = (typeof SnapshotStatus.enumValues)[number];

export const SnapshotType = pgEnum("snapshot_type_enum", ["website", "upload"]);
export type SnapshotType = (typeof SnapshotType.enumValues)[number];

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

export type ExtractedMetadata = Record<string, unknown>;

// Drizzle table
export const Snapshot = pgTable(SNAPSHOT_TABLE, {
  id: text("id").primaryKey(),

  org_id: text("org_id").notNull(),

  document_id: text("document_id").notNull(),
  url: text("url").notNull(),

  status: SnapshotStatus("status").notNull(),
  type: SnapshotType("type").notNull(),

  markdown_url: text("markdown_url"),

  // Only present when status = "success"
  chunks_count: integer("chunks_count"),

  enhance: boolean("enhance").notNull().default(false),

  // Varies by type; may be null for non-success states
  metadata: jsonb("metadata").$type<WebsiteMetadata | UploadMetadata | null>(),

  // LLM-extracted metadata from document content
  extracted_metadata: jsonb(
    "extracted_metadata",
  ).$type<ExtractedMetadata | null>(),

  changes_detected: boolean("changes_detected"),

  created_at: timestamp("created_at", {
    withTimezone: true,
    mode: "string",
  })
    .notNull()
    .defaultNow(),
  updated_at: timestamp("updated_at", {
    withTimezone: true,
    mode: "string",
  })
    .notNull()
    .defaultNow(),
});

export const SnapshotInsertSchema = createInsertSchema(Snapshot);
export const SnapshotSelectSchema = createSelectSchema(Snapshot);

export type SnapshotSelect = typeof Snapshot.$inferSelect;
export type SnapshotInsert = typeof Snapshot.$inferInsert;

// Compatibility Zod schema used elsewhere (e.g., Convex runtime validation)
const BaseSnapshotSchema = {
  id: z.string(),
  document_id: z.string(),
  url: z.url(),
  created_at: z.number(), // milliseconds since epoch (legacy shape)
};

export const SnapshotSchema = z.union([
  // queued, error, running
  z.object({
    ...BaseSnapshotSchema,
    status: z.enum(["queued", "error", "running"]),
    type: z.enum(["website", "upload"]),
  }),
  // success + website metadata
  z.object({
    ...BaseSnapshotSchema,
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
    ...BaseSnapshotSchema,
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

export type Snapshot = z.infer<typeof SnapshotSchema>;

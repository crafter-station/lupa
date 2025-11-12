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
  tokens_count: integer("tokens_count"),

  enhance: boolean("enhance").notNull().default(false),

  metadata: jsonb("metadata").$type<Record<string, unknown>>(),

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

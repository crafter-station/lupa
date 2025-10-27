import { sql } from "drizzle-orm";
import {
  boolean,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { Project } from "./project";

export const API_KEY_TABLE = "api_key";

export const ApiKeyEnvironment = pgEnum("api_key_environment_enum", [
  "live",
  "test",
]);

export const ApiKeyType = pgEnum("api_key_type_enum", ["sk", "pk"]);

export type ApiKeyEnvironment = (typeof ApiKeyEnvironment.enumValues)[number];
export type ApiKeyType = (typeof ApiKeyType.enumValues)[number];

export const ApiKey = pgTable(
  API_KEY_TABLE,
  {
    id: text("id").primaryKey(),

    org_id: text("org_id").notNull(),

    project_id: text("project_id")
      .notNull()
      .references(() => Project.id, { onDelete: "cascade" }),

    name: text("name").notNull(),

    key_hash: text("key_hash").notNull().unique(),

    key_preview: text("key_preview").notNull(),

    environment: ApiKeyEnvironment("environment").notNull().default("live"),

    key_type: ApiKeyType("key_type").notNull().default("sk"),

    is_active: boolean("is_active").notNull().default(true),

    last_used_at: timestamp("last_used_at", {
      withTimezone: true,
      mode: "string",
    }),

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
  },
  (table) => [
    uniqueIndex("api_key_project_env_type_name_unique")
      .on(table.project_id, table.environment, table.key_type, table.name)
      .where(sql`${table.is_active} = true`),
  ],
);

export const ApiKeyInsertSchema = createInsertSchema(ApiKey);
export const ApiKeySelectSchema = createSelectSchema(ApiKey);

export type ApiKeySelect = typeof ApiKey.$inferSelect;
export type ApiKeyInsert = typeof ApiKey.$inferInsert;

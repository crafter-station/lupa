import { v } from "convex/values";
import z from "zod";
import {
  SOURCE_SNAPSHOT_TABLE,
  SOURCE_TABLE,
  type SourceInsert,
  SourceInsertSchema,
  SourceSelectSchema,
  type SourceSnapshot,
  SourceSnapshotSchema,
} from "@/db";
import { generateId } from "@/lib/generate-id";
import { mutation, query } from "./_generated/server";

export const list = query({
  args: {
    bucketId: v.string(),
  },
  handler: async (ctx, args) => {
    const _sources = await ctx.db
      .query(SOURCE_TABLE)
      .filter((q) => q.eq(q.field("bucketId"), args.bucketId))
      .collect();

    const sources = z.array(SourceSelectSchema).parse(_sources);

    const _snapshots = await Promise.all(
      sources.map(async (source) => {
        return await ctx.db
          .query(SOURCE_SNAPSHOT_TABLE)
          .filter((q) => q.eq(q.field("sourceId"), source.id))
          .order("desc") // will sort by _creationTime in descending order
          .first();
      }),
    );

    const snapshots = z.array(SourceSnapshotSchema).parse(_snapshots);

    return sources.map((source) => {
      return {
        ...source,
        snapshot: snapshots.find((s) => s.sourceId === source.id),
      };
    });
  },
});

export const get = query({
  args: {
    id: v.string(),
  },

  handler: async (ctx, args) => {
    const source = await ctx.db
      .query(SOURCE_TABLE)
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();
    return SourceSelectSchema.parse(source);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    url: v.string(),
    type: v.union(v.literal("website"), v.literal("upload")),
    bucketId: v.string(),
  },
  handler: async (ctx, args) => {
    const auth = await ctx.auth.getUserIdentity();

    if (!auth) {
      throw new Error("Unauthorized");
    }

    const source = SourceInsertSchema.parse({
      id: generateId(),
      name: args.name,
      description: args.description,
      bucketId: args.bucketId,
      createdAt: Date.now(),
    } satisfies SourceInsert);

    await ctx.db.insert(SOURCE_TABLE, source);

    const sourceSnapshot = SourceSnapshotSchema.parse({
      id: generateId(),
      sourceId: source.id,
      url: args.url,
      type: args.type,
      status: "queued",
      createdAt: Date.now(),
    } satisfies SourceSnapshot);

    await ctx.db.insert(SOURCE_SNAPSHOT_TABLE, sourceSnapshot);
  },
});

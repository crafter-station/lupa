import { v } from "convex/values";
import z from "zod";
import { BUCKET_TABLE, BucketInsertSchema, BucketSelectSchema } from "@/db";
import { mutation, query } from "./_generated/server";

export const list = query({
  handler: async (ctx) => {
    const buckets = await ctx.db.query(BUCKET_TABLE).collect();
    return z.array(BucketSelectSchema).parse(buckets);
  },
});

export const get = query({
  args: {
    id: v.string(),
  },
  handler: async (ctx, args) => {
    const bucket = await ctx.db
      .query(BUCKET_TABLE)
      .filter((q) => q.eq(q.field("id"), args.id))
      .first();

    if (!bucket) {
      throw new Error("Bucket not found");
    }

    return BucketSelectSchema.parse(bucket);
  },
});

export const create = mutation({
  handler: async (ctx, args) => {
    const auth = await ctx.auth.getUserIdentity();

    if (!auth) {
      throw new Error("Unauthorized");
    }

    const bucket = BucketInsertSchema.parse({
      ...args,
    });

    return await ctx.db.insert(BUCKET_TABLE, bucket);
  },
});

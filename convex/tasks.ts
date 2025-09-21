import z from "zod";
import { mutation, query } from "./_generated/server";

export const TaskSchemaSelect = z.object({
  _id: z.string(),
  text: z.string(),
  isCompleted: z.boolean().optional().default(false),
  userId: z.string().optional(),
  _creationTime: z.number(),
});

export const TaskSchemaInsert = z.object({
  text: z.string(),
  userId: z.string(),
});

export const get = query({
  handler: async (ctx) => {
    const tasks = await ctx.db.query("tasks").collect();
    return z.array(TaskSchemaSelect).parse(tasks);
  },
});

export const create = mutation({
  handler: async (ctx, args) => {
    const auth = await ctx.auth.getUserIdentity();

    if (!auth) {
      throw new Error("Unauthorized");
    }

    const task = TaskSchemaInsert.parse({
      ...args,
      userId: auth?.subject,
    });

    return await ctx.db.insert("tasks", task);
  },
});

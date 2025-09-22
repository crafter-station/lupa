import z from "zod";
import { BaseConvexSchema } from "./_convex";

export const SOURCE_TABLE = "source";

export const SourceSelectSchema = z.object({
  ...BaseConvexSchema,
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  bucketId: z.string(),
  createdAt: z.number(), // milliseconds since epoch
});

export const SourceInsertSchema = SourceSelectSchema.omit({
  _id: true,
  _creationTime: true,
});

export type SourceSelect = z.infer<typeof SourceSelectSchema>;
export type SourceInsert = z.infer<typeof SourceInsertSchema>;

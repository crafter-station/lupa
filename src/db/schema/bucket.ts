import z from "zod";
import { BaseConvexSchema } from "./_convex";

export const BUCKET_TABLE = "bucket";

export const BucketSelectSchema = z.object({
  ...BaseConvexSchema,
  id: z.string(),
  name: z.string(),
  description: z.string(),
});

export const BucketInsertSchema = BucketSelectSchema.omit({
  _id: true,
  _creationTime: true,
});

export type BucketSelect = z.infer<typeof BucketSelectSchema>;
export type BucketInsert = z.infer<typeof BucketInsertSchema>;

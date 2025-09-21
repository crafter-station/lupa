import z from "zod";
import { BaseConvexSchema } from "./convex";

export const BucketSchemaSelect = z.object({
  ...BaseConvexSchema,

  id: z.string(),
  name: z.string(),
  description: z.string(),
});

export const BucketSchemaInsert = BucketSchemaSelect.omit({
  _id: true,
  _creationTime: true,
});

export type BucketSelect = z.infer<typeof BucketSchemaSelect>;
export type BucketInsert = z.infer<typeof BucketSchemaInsert>;

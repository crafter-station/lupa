import z from "zod";

// https://docs.convex.dev/database/types#system-fields
export const BaseConvexSchema = {
  _id: z.string(),
  _creationTime: z.number(),
};

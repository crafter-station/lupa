import { customAlphabet } from "nanoid";
import { z } from "zod/v3";

export const generateId = customAlphabet(
  "0123456789abcdefghijklmnopqrstuvwxyz",
  10,
);

const regex = /^[0-9a-z]+$/;
export const IdSchema = z.string().length(10).regex(regex);

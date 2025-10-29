import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const rootDomain =
  process.env.NEXT_PUBLIC_ROOT_DOMAIN?.replace(/\/+$/, "") || "localhost:3000";

export const protocol = rootDomain.includes("localhost") ? "http" : "https";

export const appBaseURL = `${protocol}://${rootDomain}`;
export const docsBaseURL = `${protocol}://docs.${rootDomain}`;

export const getAPIBaseURL = (projectId: string) =>
  `${protocol}://${projectId}.${rootDomain}/api`;

import { useQuery } from "@tanstack/react-query";

export async function fetchMarkdown(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch markdown");
  }
  return response.text();
}

export function useMarkdown(url: string | null | undefined) {
  return useQuery({
    queryKey: ["markdown", url],
    queryFn: () => {
      if (!url) throw new Error("URL is required");
      return fetchMarkdown(url);
    },
    enabled: !!url,
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });
}

export function normalizeFolderPath(folder: string | null | undefined): string {
  if (!folder) return "/";
  let path = folder.trim();
  if (path === "") return "/";
  path = path.replace(/\\+/g, "/");
  path = path.replace(/\/+/g, "/");
  if (!path.startsWith("/")) path = `/${path}`;
  path = path.replace(/\/+/g, "/");
  if (!path.endsWith("/")) path = `${path}/`;
  path = path.replace(/\/+/g, "/");
  return path;
}

export function folderFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;

    if (!pathname || pathname === "/") {
      return "/";
    }

    const segments = pathname.split("/").filter(Boolean);

    if (segments.length === 0) {
      return "/";
    }

    segments.pop();

    if (segments.length === 0) {
      return "/";
    }

    return normalizeFolderPath(`/${segments.join("/")}/`);
  } catch {
    return "/";
  }
}

export function parseFolderSegments(folder: string | undefined): string[] {
  const normalized = normalizeFolderPath(folder);
  if (normalized === "/") return [];
  return normalized.split("/").filter(Boolean);
}

export function buildPathFromSegments(segments: string[]): string {
  if (segments.length === 0) return "/";
  return normalizeFolderPath(`/${segments.join("/")}/`);
}

export function sanitizeSegment(value: string): string {
  return value.trim().replace(/\//g, "");
}

export function getFolderAndDocument(path?: string[]) {
  let folder: string | null = null;
  let document: string | null = null;

  if (path?.[path.length - 1]?.endsWith(".md")) {
    folder = path.slice(0, path.length - 1).join("/");
    document = path[path.length - 1].split(".").slice(0, -1).join(".");
  } else if (
    path?.[path.length - 2]?.endsWith(".md") &&
    path?.[path.length - 1]?.startsWith("v")
  ) {
    folder = path.slice(0, path.length - 2).join("/");
    document = path[path.length - 2];
  } else {
    folder = path?.join("/") ?? null;
  }

  if (!folder) {
    folder = "/";
  } else {
    folder = `/${folder}/`;
  }

  return {
    folder,
    document,
  };
}

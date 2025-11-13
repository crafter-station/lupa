export type ServerProps = {
  projectId: string;
  folder: string;
  orgSlug: string;
};

export type ListItem = {
  type: "folder" | "document";
  name: string;
  path: string;
  updated_at: string;
};

export type ContentProps = {
  items: ListItem[];
  folder: string;
};

export type LiveProps = {
  projectId: string;
  folder: string;
  preloadedItems: ListItem[];
  orgSlug: string;
};

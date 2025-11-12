import type { DocumentSelect } from "@/db";
import type { ListItem } from "./props";

export function getItems({
  folder,
  documents,
  orgSlug,
  projectId,
}: {
  folder: string;
  documents: DocumentSelect[];
  orgSlug: string;
  projectId: string;
}) {
  const folders = new Map<string, string>();
  const documentsInPath: DocumentSelect[] = [];

  for (const doc of documents.toSorted((a, b) => {
    const dateA = new Date(a.created_at).getTime();
    const dateB = new Date(b.created_at).getTime();
    return dateA - dateB;
  })) {
    const docFolder = doc.folder;

    if (docFolder === folder) {
      documentsInPath.push(doc);
    } else {
      const relativePath = docFolder.slice(folder.length);
      const nextSegment = relativePath.split("/")[0];
      if (nextSegment) {
        folders.set(nextSegment, doc.updated_at);
      }
    }
  }

  const result: ListItem[] = [];

  for (const [folderName, updated_at] of Array.from(folders).sort()) {
    result.push({
      type: "folder",
      name: folderName,
      path: `/orgs/${orgSlug}/projects/${projectId}/documents${folder}${folderName}/`,
      updated_at: updated_at,
    });
  }

  for (const doc of documentsInPath.sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  )) {
    result.push({
      type: "document",
      name: doc.name,
      path: `/orgs/${orgSlug}/projects/${projectId}/documents${doc.folder}${doc.name}.md`,
      updated_at: doc.updated_at,
    });
  }

  return result;
}

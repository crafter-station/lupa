import { FolderIcon } from "lucide-react";
import Link from "next/link";
import { TableCell, TableRow } from "../ui/table";
import type { ContentProps } from "./props";

export const DocumentListContent = ({ items, folder }: ContentProps) => {
  const parentFolder =
    folder !== "/" ? folder.split("/").slice(0, -2).join("/") || "/" : null;

  return (
    <>
      {parentFolder && (
        <TableRow key="parent">
          <TableCell>
            <Link
              href={
                items[0]?.path?.split("/documents/")[0] +
                "/documents" +
                parentFolder
              }
              className="flex gap-1 items-center"
            >
              <FolderIcon className="size-4" />
              ..
            </Link>
          </TableCell>
          <TableCell />
        </TableRow>
      )}
      {items.map((item) => (
        <TableRow key={item.path}>
          <TableCell>
            <Link href={item.path} className="flex gap-1 items-center">
              {item.type === "folder" && <FolderIcon className="size-4" />}
              {item.name}
            </Link>
          </TableCell>
          <TableCell>
            {item.type === "document" && (
              <time dateTime={item.updated_at}>
                {new Date(item.updated_at).toLocaleString()}
              </time>
            )}
          </TableCell>
        </TableRow>
      ))}
    </>
  );
};

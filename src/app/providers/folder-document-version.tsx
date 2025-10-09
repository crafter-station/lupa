import { useParams } from "next/navigation";
import * as React from "react";

export const FolderDocumentVersionContext = React.createContext<{
  folder: string;
  documentId: string | null;
  version: string | null;
} | null>(null);

export const FolderDocumentVersionProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const { path: rawPath = [] } = useParams<{
    path?: string[];
  }>();

  const path = React.useMemo(() => rawPath.map(decodeURIComponent), [rawPath]);

  const [currentFolder, documentId, version] = React.useMemo(() => {
    if (!path.length) {
      return ["/", null, null];
    }

    if (path.some((item) => item.startsWith("doc:"))) {
      const folder = `/${path.join("/").split("doc:")[0]}`;
      // biome-ignore lint/style/noNonNullAssertion: exists
      const documentId = path
        .find((item) => item.startsWith("doc:"))!
        .split(":")[1];

      const versionSplit = path.join("/").split(`doc:${documentId}`)[1];
      const version = versionSplit ? versionSplit.replace(/\//g, "") : null;

      return [folder, documentId, version];
    }

    const folder = `/${path.join("/")}/`;
    return [folder, null, null];
  }, [path]);

  return (
    <FolderDocumentVersionContext.Provider
      value={{
        folder: currentFolder,
        documentId,
        version,
      }}
    >
      {children}
    </FolderDocumentVersionContext.Provider>
  );
};

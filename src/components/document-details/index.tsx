"use client";

import type { DocumentSelect } from "@/db";

import { DocumentDescription } from "./document-description";
import { DocumentFolder } from "./document-folder";
import { DocumentName } from "./document-name";
import { DocumentRefreshSettings } from "./document-refresh-settings";
import { DocumentUpdatedAt } from "./document-updated-at";

export function DocumentDetails({
  projectId,
  selectedDocument,
  documents,
}: {
  projectId: string;
  selectedDocument: DocumentSelect | null;
  documents: DocumentSelect[];
}) {
  if (!selectedDocument) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
        <p className="text-sm">Select a document to view details</p>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <DocumentName
          documentId={selectedDocument.id}
          projectId={projectId}
          name={selectedDocument.name}
          folder={selectedDocument.folder}
        />

        <DocumentDescription
          documentId={selectedDocument.id}
          projectId={projectId}
          description={selectedDocument.description}
        />

        <DocumentFolder
          documentId={selectedDocument.id}
          projectId={projectId}
          folder={selectedDocument.folder}
          documentName={selectedDocument.name}
          documents={documents}
        />

        <DocumentRefreshSettings
          documentId={selectedDocument.id}
          projectId={projectId}
          refreshFrequency={selectedDocument.refresh_frequency}
        />

        <DocumentUpdatedAt updatedAt={selectedDocument.updated_at} />
      </div>
    </div>
  );
}

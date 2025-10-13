import { ApiReferenceReact } from "@scalar/api-reference-react";

import "@scalar/api-reference-react/style.css";

import content from "./openapi.json";

export const revalidate = false;
export const dynamic = "force-static";

export default async function ApiDocsPage() {
  return (
    <ApiReferenceReact
      configuration={{
        _integration: "nextjs",
        hideModels: true,
        hideClientButton: true,
        content,
      }}
    />
  );
}

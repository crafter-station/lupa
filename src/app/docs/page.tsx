"use client";

import { ApiReferenceReact } from "@scalar/api-reference-react";

import "@scalar/api-reference-react/style.css";

export default function ApiDocsPage() {
  return (
    <ApiReferenceReact
      configuration={{
        _integration: "nextjs",
        url: `${process.env.NEXT_PUBLIC_URL}/openapi.json`,
        hideModels: true,
        hideClientButton: true,
      }}
    />
  );
}

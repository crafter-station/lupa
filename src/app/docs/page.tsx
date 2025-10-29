"use client";

import dynamic from "next/dynamic";

const ApiReferenceReact = dynamic(
  () =>
    import("@scalar/api-reference-react").then((mod) => mod.ApiReferenceReact),
  { ssr: false },
);

import "@scalar/api-reference-react/style.css";

import content from "./openapi.json";

export default function ApiDocsPage() {
  return (
    <ApiReferenceReact
      configuration={{
        _integration: "nextjs",
        content,
        hideModels: true,
        hideClientButton: true,
      }}
    />
  );
}

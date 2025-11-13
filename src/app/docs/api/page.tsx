"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Import dynamique de SwaggerUI pour éviter les problèmes SSR
const SwaggerUI = dynamic(
  () => import("swagger-ui-react").then((mod) => mod.default),
  { ssr: false }
);

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    // Charger la spécification OpenAPI
    fetch("/api/docs")
      .then((res) => res.json())
      .then((data) => setSpec(data))
      .catch((err) => console.error("Failed to load API spec:", err));
  }, []);

  if (!spec) {
    return (
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-display font-bold mb-4">
            API Documentation
          </h1>
          <p>Loading API documentation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-display font-bold mb-4">
          API Documentation
        </h1>
        <div className="swagger-ui-wrapper">
          {/* @ts-expect-error - SwaggerUI types are not fully compatible */}
          <SwaggerUI spec={spec} />
        </div>
      </div>
    </div>
  );
}

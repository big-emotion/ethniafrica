"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";

// Charger SwaggerUI dynamiquement pour éviter les problèmes SSR
const SwaggerUI = dynamic(
  () => import("swagger-ui-react").then((mod) => mod.default),
  { ssr: false }
);
import "swagger-ui-react/swagger-ui.css";

export default function ApiDocsPage() {
  const [spec, setSpec] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    // Charger la spec OpenAPI
    fetch("/api/docs")
      .then((res) => res.json())
      .then((data) => setSpec(data))
      .catch((error) => {
        console.error("Error loading OpenAPI spec:", error);
      });
  }, []);

  if (!spec) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">
            Chargement de la documentation...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* @ts-expect-error - SwaggerUI types are not fully compatible */}
      <SwaggerUI spec={spec} />
    </div>
  );
}

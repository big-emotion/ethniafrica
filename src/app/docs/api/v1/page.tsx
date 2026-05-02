import { redirect } from "next/navigation";

/**
 * API v1 documentation is deprecated.
 * Redirect to API v2 documentation.
 */
export default function ApiDocsV1Page() {
  redirect("/docs/api/v2");
}

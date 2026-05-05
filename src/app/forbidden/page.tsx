import { forbidden } from "next/navigation";

/**
 * Calling forbidden() throws a Next.js interruption that causes the runtime
 * to serve the app/forbidden.tsx UI template with an HTTP 403 status code.
 * This ensures any navigation to /forbidden (e.g. from middleware) returns
 * the correct HTTP 403 rather than a 200 OK.
 */
export default function ForbiddenPage() {
  forbidden();
}

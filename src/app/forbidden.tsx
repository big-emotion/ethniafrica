import ForbiddenPageComponent from "@/app/forbidden/page-component";

/**
 * Custom 403 Forbidden page rendered by Next.js when forbidden() is called.
 * Requires experimental.authInterrupts = true in next.config.ts.
 */
export default function Forbidden() {
  return <ForbiddenPageComponent />;
}

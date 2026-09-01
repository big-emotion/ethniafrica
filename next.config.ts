import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  experimental: {
    authInterrupts: true,
  },
  // ETNI-1622 — without this, the doctrine detail route 500s in a built
  // server with "A React Element from an older version of React was
  // rendered." `npm ls react` shows a single react@18.3.1: there is no
  // duplicate package. The real mismatch is that Next's app-router bundler
  // treats node_modules packages as externals for the RSC ("react-server")
  // graph by default, so next-mdx-remote's own `import React from "react"`
  // resolves via plain Node resolution to the project's react package,
  // while every first-party page is built against Next's internally
  // vendored `react-builtin` (next/dist/compiled/react) for that same
  // graph — two structurally different element shapes meeting at render
  // time. transpilePackages forces next-mdx-remote through the same
  // react-server aliasing as first-party code, unifying which copy creates
  // its elements.
  transpilePackages: ["next-mdx-remote"],
  turbopack: {
    root: __dirname,
  },
};

export default withSentryConfig(nextConfig, {
  // Suppress source map upload logs during dev
  silent: !process.env.CI,

  // Upload source maps for debugging in Sentry
  // Requires SENTRY_AUTH_TOKEN environment variable
  widenClientFileUpload: true,

  // Disable instrumenting webpack - use turbopack instead
  disableLogger: true,

  // Tunnel route for bypassing ad-blockers
  tunnelRoute: "/monitoring",

  // Source maps configuration - hide source code in browser (recommended for security)
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
});

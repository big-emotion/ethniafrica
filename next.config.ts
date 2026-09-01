import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  // Production is self-hosted on the OVH VPS in a Docker image that carries no
  // node_modules: the runner stage copies `.next/standalone` and nothing else.
  // Removing this makes the image start and then fail on the first require of a
  // dependency that was never copied.
  //
  // Vercel is the one target that must not get it. Its builder runs its own
  // output tracing in `onBuildComplete` and reads `.next/next-server.js.nft.json`;
  // a standalone build does not leave that file where it looks, so every recette
  // preview build has died on `ENOENT … next-server.js.nft.json` since standalone
  // landed in 77eb1f0a. The same commit is why recette then froze on a build
  // predating it — and froze with a Supabase anon key that was disabled hours
  // later, which is what took the atlas surface down. `VERCEL` is set by the
  // platform itself, so nothing has to be configured for this to hold.
  output: process.env.VERCEL ? undefined : "standalone",
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
  // A patronyme fiche used to be addressed as a detail of the appellations
  // index it was never linked from (DEC-038 separates the two objects; the
  // routes did not). Permanent, because the old path was the canonical URL
  // `ficheCanonical` emitted, so it is what a crawler holds.
  async redirects() {
    return [
      {
        source: "/:lang/atlas/appellations/:slug",
        destination: "/:lang/atlas/noms/:slug",
        permanent: true,
      },
    ];
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

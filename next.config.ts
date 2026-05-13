import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";
import createMDX from "@next/mdx";
import remarkGfm from "remark-gfm";

const nextConfig: NextConfig = {
  experimental: {
    authInterrupts: true,
  },
  turbopack: {
    root: __dirname,
  },
  // Recognize .md / .mdx alongside default page extensions
  pageExtensions: ["ts", "tsx", "md", "mdx"],
};

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [],
  },
});

export default withSentryConfig(withMDX(nextConfig), {
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

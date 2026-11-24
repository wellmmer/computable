import createMDX from "@next/mdx";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  /* config options here */
  // The account tests build a second copy of the site with fake Supabase values (playwright.config.ts).
  // That copy goes to its own folder, so it never replaces the normal build.
  distDir: process.env.COMPUTABLE_DIST_DIR ?? ".next",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
      // `import text from "./file.txt?raw"` gives the file's text (the 2016 example machine).
      "*.txt": {
        condition: { query: "?raw" },
        type: "raw",
      },
    },
  },
};

// Compiles the lesson files (.mdx). They are imported by name, so pageExtensions stays as it is.
// remark-gfm adds markdown tables (spec R2b 2). Turbopack takes plugins by name, not as functions.
const withMDX = createMDX({ options: { remarkPlugins: ['remark-gfm'] } });
// Reads src/i18n/request.ts, so every page gets its language and messages.
const withNextIntl = createNextIntlPlugin();
export default withNextIntl(withMDX(nextConfig));

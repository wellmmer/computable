import createMDX from "@next/mdx";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  /* config options here */
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
const withMDX = createMDX({});
// Reads src/i18n/request.ts, so every page gets its language and messages.
const withNextIntl = createNextIntlPlugin();
export default withNextIntl(withMDX(nextConfig));

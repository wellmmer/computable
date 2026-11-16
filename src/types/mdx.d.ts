/** A lesson file also exports `meta` (spec 3). Its shape is unknown here: src/learn/lessons.ts checks it. */
declare module '*.mdx' {
  export const meta: unknown;
}

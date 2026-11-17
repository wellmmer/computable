import type { MDXComponents } from 'mdx/types';
import { sectionTitle, textLink } from '@/shell/page-styles';

/**
 * How the lesson files (MDX) draw their markdown (spec 3). Next.js needs this file for MDX in the
 * App Router. Lessons hold only headings, paragraphs, quotes, lists and links, so only those get a style.
 */
const components: MDXComponents = {
  h2: (props) => <h2 {...props} className={`mt-12 ${sectionTitle}`} />,
  h3: (props) => <h3 {...props} className="mt-8 font-display text-xl/tight font-semibold" />,
  p: (props) => <p {...props} className="mt-4 text-[17px]/relaxed" />,
  ul: (props) => <ul {...props} className="mt-4 list-disc space-y-2 pl-6 text-[17px]/relaxed" />,
  ol: (props) => <ol {...props} className="mt-4 list-decimal space-y-2 pl-6 text-[17px]/relaxed" />,
  a: (props) => <a {...props} className={textLink} />,
  strong: (props) => <strong {...props} className="font-semibold" />,
  blockquote: (props) => <blockquote {...props} className="mt-6 border-l-4 border-pencil pl-4 font-display text-lg/snug italic" />,
};

export function useMDXComponents(): MDXComponents {
  return components;
}

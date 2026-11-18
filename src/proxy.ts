import createMiddleware from 'next-intl/middleware';
import { NextResponse, type NextRequest } from 'next/server';
import { routing } from './i18n/routing';
import { isLearnSlug } from './learn/lesson-slugs';

/** Sends a visitor without a language in the URL to one, for example "/" to "/en". */
const handleLocale = createMiddleware(routing);

/**
 * No page answers this address. With cacheComponents, `notFound()` on a lesson page that streams
 * still sends status 200, so the proxy sends an unknown lesson here and the server answers 404.
 * Folders that start with "_" are private in the app router, so no page can ever match it.
 */
const UNKNOWN_LESSON = '_unknown-lesson';

/** A page under /learn after the language step: /en/learn/intuition, /pt-BR/learn/intuition or /en/learn/paper. */
const LESSON_PATH = /^\/([^/]+)\/learn\/([^/]+)\/?$/;

export default function proxy(request: NextRequest) {
  const response = handleLocale(request);
  // A redirect, for example /pt-BR/learn/nope to /pt-br/learn/nope: the next visit ends here again.
  if (response.headers.has('location')) return response;

  const rewrite = response.headers.get('x-middleware-rewrite');
  const path = rewrite === null ? request.nextUrl.pathname : new URL(rewrite).pathname;
  const lesson = LESSON_PATH.exec(path);
  if (lesson === null || isLearnSlug(lesson[2])) return response;

  // Keep the language cookie and headers, but send the request to the address no page answers.
  const headers = new Headers(response.headers);
  headers.delete('x-middleware-next');
  headers.delete('x-middleware-rewrite');
  return NextResponse.rewrite(new URL(`/${lesson[1]}/${UNKNOWN_LESSON}`, request.url), { headers });
}

export const config = {
  // Every path except API routes, Next.js internals and files with a dot (favicon.ico).
  matcher: '/((?!api|_next|_vercel|.*\\..*).*)',
};

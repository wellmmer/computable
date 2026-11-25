import { timingSafeEqual } from 'node:crypto';
import { accountConfig } from '@/account/config';

/**
 * True when the header holds the secret. timingSafeEqual takes the same time for every wrong
 * guess of the same length, so the time of the answer does not leak the secret.
 */
function holdsSecret(authorization: string | null, secret: string): boolean {
  if (authorization === null || secret === '') return false;
  const given = Buffer.from(authorization);
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * The daily keep-alive (spec R5b 5). A free Supabase project pauses after a week with too little
 * database activity. A Vercel cron job (vercel.json) calls this route once a day, and the route calls
 * the keep_alive() database function with the public key.
 *
 * Vercel sends `Authorization: Bearer <CRON_SECRET>` when the project has CRON_SECRET
 * (https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs). Without CRON_SECRET the
 * route refuses every call, so nobody else can make it call Supabase. A refusal is a 401 with no
 * body, so it tells a caller nothing about the setup.
 *
 * With cacheComponents, `export const dynamic` is not allowed. The route reads the request headers
 * first, so Next.js never prerenders it.
 */
export async function GET(request: Request): Promise<Response> {
  const authorization = request.headers.get('authorization');
  const config = accountConfig();
  // No accounts on this site: there is nothing to keep alive.
  if (config === null) return new Response(null, { status: 204 });
  if (!holdsSecret(authorization, process.env.CRON_SECRET?.trim() ?? '')) return new Response(null, { status: 401 });

  try {
    const answer = await fetch(`${config.url}/rest/v1/rpc/keep_alive`, {
      method: 'POST',
      headers: { apikey: config.anonKey, Authorization: `Bearer ${config.anonKey}`, 'Content-Type': 'application/json' },
      body: '{}',
    });
    if (answer.ok) return Response.json({ ok: true });
  } catch {
    // The request failed. The answer below says so.
  }
  return new Response('Supabase did not answer.', { status: 502 });
}

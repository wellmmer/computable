import { accountConfig } from '@/account/config';

/**
 * The daily keep-alive (spec R5b 5). A free Supabase project pauses after a week with too little
 * database activity. A Vercel cron job (vercel.json) calls this route once a day, and the route calls
 * the keep_alive() database function with the public key.
 *
 * Vercel sends `Authorization: Bearer <CRON_SECRET>` when the project has CRON_SECRET
 * (https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs). Without CRON_SECRET the
 * route refuses every call, so nobody else can make it call Supabase.
 *
 * With cacheComponents, `export const dynamic` is not allowed. The route reads the request headers
 * first, so Next.js never prerenders it.
 */
export async function GET(request: Request): Promise<Response> {
  const authorization = request.headers.get('authorization');
  const config = accountConfig();
  // No accounts on this site: there is nothing to keep alive.
  if (config === null) return new Response(null, { status: 204 });
  const secret = process.env.CRON_SECRET?.trim() ?? '';
  if (secret === '') return new Response('CRON_SECRET is not set.', { status: 503 });
  if (authorization !== `Bearer ${secret}`) return new Response('Unauthorized', { status: 401 });

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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GET } from './route';

const URL_VALUE = 'https://example.supabase.co';
const KEY = 'public-key';
const SECRET = 'a-long-random-cron-secret';

const request = (authorization?: string) =>
  new Request('https://computable.example/api/keep-alive', { headers: authorization === undefined ? {} : { authorization } });

const fetchMock = vi.fn(async (): Promise<Response> => new Response('1', { status: 200 }));

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', URL_VALUE);
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', KEY);
  vi.stubEnv('CRON_SECRET', SECRET);
  vi.stubGlobal('fetch', fetchMock);
  fetchMock.mockClear();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('GET /api/keep-alive (spec R5b 5)', () => {
  it('answers 204 and calls nothing when the 2 Supabase values are not set', async () => {
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
    const response = await GET(request(`Bearer ${SECRET}`));
    expect(response.status).toBe(204);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('answers 401 with no body when CRON_SECRET is not set, so nobody can call it without a secret', async () => {
    vi.stubEnv('CRON_SECRET', '');
    const response = await GET(request('Bearer '));
    expect(response.status).toBe(401);
    expect(await response.text()).toBe('');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('answers 401 with no body to a wrong, shorter, longer or missing secret', async () => {
    for (const authorization of ['Bearer wrong-secret-of-same-size!', 'Bearer wrong', `Bearer ${SECRET}x`, undefined]) {
      const response = await GET(request(authorization));
      expect(response.status, authorization).toBe(401);
      expect(await response.text()).toBe('');
    }
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('calls keep_alive() with the public key, and answers 200', async () => {
    const response = await GET(request(`Bearer ${SECRET}`));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(`${URL_VALUE}/rest/v1/rpc/keep_alive`, {
      method: 'POST',
      headers: { apikey: KEY, Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
      body: '{}',
    });
  });

  it('answers 502 when Supabase answers with an error', async () => {
    fetchMock.mockResolvedValueOnce(new Response('paused', { status: 503 }));
    expect((await GET(request(`Bearer ${SECRET}`))).status).toBe(502);
  });

  it('answers 502 when the request to Supabase fails', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));
    expect((await GET(request(`Bearer ${SECRET}`))).status).toBe(502);
  });
});

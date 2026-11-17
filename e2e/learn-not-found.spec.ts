import { expect, test } from '@playwright/test';

/** A lesson address that does not exist answers 404, in every language prefix (spec R2a 3). */
for (const path of ['/en/learn/nope', '/pt-br/learn/nope']) {
  test(`${path} answers 404`, async ({ request }) => {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(404);
  });
}

for (const path of ['/en/learn/intuition', '/en/learn/formal-definition', '/pt-br/learn/formal-definition']) {
  test(`${path} answers 200`, async ({ request }) => {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(200);
  });
}

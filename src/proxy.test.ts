import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import proxy from './proxy';

function visit(path: string, headers: Record<string, string> = {}) {
  return proxy(new NextRequest(`http://localhost${path}`, { headers }));
}

describe('the language in the URL (spec 3, "Language on first visit")', () => {
  it('sends "/" to the browser language', () => {
    expect(visit('/', { 'accept-language': 'pt-BR,pt;q=0.9,en;q=0.8' }).headers.get('location')).toBe('http://localhost/pt-br');
    expect(visit('/', { 'accept-language': 'en-US,en;q=0.9' }).headers.get('location')).toBe('http://localhost/en');
  });

  it('sends a Spanish browser from Mexico to /es', () => {
    expect(visit('/', { 'accept-language': 'es-MX,es;q=0.9' }).headers.get('location')).toBe('http://localhost/es');
  });

  it('sends a French browser from Canada to /fr', () => {
    expect(visit('/', { 'accept-language': 'fr-CA,fr;q=0.9' }).headers.get('location')).toBe('http://localhost/fr');
  });

  it('sends a German browser from Austria to /de', () => {
    expect(visit('/', { 'accept-language': 'de-AT,de;q=0.9' }).headers.get('location')).toBe('http://localhost/de');
  });

  it('sends a browser language the site does not have to English', () => {
    expect(visit('/', { 'accept-language': 'ja-JP' }).headers.get('location')).toBe('http://localhost/en');
  });

  it('writes Brazilian Portuguese in lower case in the URL, and sends /pt-BR there', () => {
    expect(visit('/pt-BR/simulator').headers.get('location')).toBe('http://localhost/pt-br/simulator');
    expect(visit('/pt-br/simulator').headers.get('x-middleware-rewrite')).toBe('http://localhost/pt-BR/simulator');
  });

  it('opens "/" in the language the NEXT_LOCALE cookie remembers, before the browser language', () => {
    const request = { 'accept-language': 'pt-BR', cookie: 'NEXT_LOCALE=en' };
    expect(visit('/', request).headers.get('location')).toBe('http://localhost/en');
  });

  it('remembers for a year a language that is not the browser language', () => {
    const cookie = visit('/pt-br', { 'accept-language': 'en-US' }).headers.get('set-cookie');
    expect(cookie).toContain('NEXT_LOCALE=pt-BR');
    expect(cookie).toContain('Max-Age=31536000');
  });
});

describe('a lesson address that does not exist (spec R2a 3)', () => {
  const NOT_FOUND = /^http:\/\/localhost\/[^/]+\/_unknown-lesson$/;

  it('rewrites an unknown lesson to an address no page answers, so the server sends 404', () => {
    expect(visit('/en/learn/nope').headers.get('x-middleware-rewrite')).toMatch(NOT_FOUND);
    expect(visit('/pt-br/learn/nope').headers.get('x-middleware-rewrite')).toBe('http://localhost/pt-BR/_unknown-lesson');
    expect(visit('/de/learn/nope/').headers.get('x-middleware-rewrite')).toBe('http://localhost/de/_unknown-lesson');
  });

  it('keeps the language cookie on that answer', () => {
    expect(visit('/pt-br/learn/nope', { 'accept-language': 'en-US' }).headers.get('set-cookie')).toContain('NEXT_LOCALE=pt-BR');
  });

  it('leaves a lesson that exists, and the Learn page, as they are', () => {
    expect(visit('/en/learn/intuition').headers.get('x-middleware-rewrite')).toBeNull();
    expect(visit('/pt-br/learn/intuition').headers.get('x-middleware-rewrite')).toBe('http://localhost/pt-BR/learn/intuition');
    expect(visit('/en/learn/formal-definition').headers.get('x-middleware-rewrite')).toBeNull();
    expect(visit('/pt-br/learn/formal-definition').headers.get('x-middleware-rewrite')).toBe('http://localhost/pt-BR/learn/formal-definition');
    expect(visit('/en/learn/church-turing').headers.get('x-middleware-rewrite')).toBeNull();
    expect(visit('/pt-br/learn/entscheidungsproblem').headers.get('x-middleware-rewrite')).toBe('http://localhost/pt-BR/learn/entscheidungsproblem');
    expect(visit('/en/learn').headers.get('x-middleware-rewrite')).toBeNull();
  });

  it('leaves the reading guide to Turing’s paper as it is (spec R2c 3)', () => {
    expect(visit('/en/learn/paper').headers.get('x-middleware-rewrite')).toBeNull();
    expect(visit('/pt-br/learn/paper').headers.get('x-middleware-rewrite')).toBe('http://localhost/pt-BR/learn/paper');
  });

  it('leaves the Enigma lab as it is (spec R3 3)', () => {
    expect(visit('/en/enigma').headers.get('x-middleware-rewrite')).toBeNull();
    expect(visit('/pt-br/enigma').headers.get('x-middleware-rewrite')).toBe('http://localhost/pt-BR/enigma');
  });

  it('still sends /pt-BR to /pt-br first', () => {
    expect(visit('/pt-BR/learn/nope').headers.get('location')).toBe('http://localhost/pt-br/learn/nope');
  });
});

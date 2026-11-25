/** The Supabase project that keeps the accounts (spec R5b 2). Both values are public by design. */
export interface AccountConfig {
  readonly url: string;
  readonly anonKey: string;
}

/** Returns both values, or null when one is missing or empty. Null hides every account button. */
export function toAccountConfig(url: string | undefined, anonKey: string | undefined): AccountConfig | null {
  const cleanUrl = url?.trim() ?? '';
  const cleanKey = anonKey?.trim() ?? '';
  return cleanUrl === '' || cleanKey === '' ? null : { url: cleanUrl, anonKey: cleanKey };
}

/**
 * Reads the 2 values that Vercel sets. Next.js writes them into the browser code at build time.
 * It finds them only by their full names, so this function names them in full.
 */
export function accountConfig(): AccountConfig | null {
  return toAccountConfig(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

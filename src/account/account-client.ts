/** The 2 sign-in services (spec R5b 1). There is no email login. */
export type Provider = 'google' | 'github';

/** The signed-in person, as Google or GitHub gave them. Either value may be missing. */
export interface AccountUser {
  readonly name: string | null;
  readonly email: string | null;
}

/**
 * What the site needs from an account service. The UI talks only to this, so tests use a fake.
 * The Supabase version is in supabase-account.ts. R5b2 adds the sync to it.
 */
export interface AccountClient {
  /** Calls `listener` with the person now, and again after each sign-in or sign-out. Returns the function that stops it. */
  onUserChange(listener: (user: AccountUser | null) => void): () => void;
  /** True when the browser came back from Google or GitHub, and the sign-in did not finish. */
  signInFailedOnReturn(): Promise<boolean>;
  /** Opens the sign-in page of the service. False when it could not open it. */
  signInWith(provider: Provider): Promise<boolean>;
  /** Signs out in this browser only. The browser keeps its machine and quiz scores. */
  signOut(): Promise<void>;
  /** Deletes the account and its row, then signs out. False when the deletion failed; then nothing changed. */
  deleteAccount(): Promise<boolean>;
}

/** The text the menu shows for the person: the name, or else the email. */
export function userLabel(user: AccountUser): string | null {
  return user.name ?? user.email;
}

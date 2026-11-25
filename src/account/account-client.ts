/** The 2 sign-in services (spec R5b 1). There is no email login. */
export type Provider = 'google' | 'github';

/** The signed-in person, as Google or GitHub gave them. The name or the email may be missing. */
export interface AccountUser {
  /** The Supabase user ID. The row of the person has it as its key. */
  readonly id: string;
  readonly name: string | null;
  readonly email: string | null;
}

/** The synced columns of the person's row (spec R5b 3 and 5). */
export interface SavedProfile {
  /** The machine as JSON, or null. The database does not check its shape, so the sync parses it. */
  readonly machine: unknown;
  /** When the saved machine last changed in a browser, or null when nobody knows. */
  readonly machineChangedAt: string | null;
  /** The quiz scores as JSON. The sync parses them too. */
  readonly progress: unknown;
}

/** The columns that one write changes. A missing column stays as it is in the row. */
export interface ProfilePatch {
  readonly machine?: unknown;
  readonly machineChangedAt?: string | null;
  readonly progress?: unknown;
}

/** What readProfile throws when the login is not valid any more. Trying again does not help. */
export class AccountSignedOutError extends Error {
  constructor() {
    super('The login is not valid any more.');
    this.name = 'AccountSignedOutError';
  }
}

/**
 * How a write ended. `offline`: no connection, or Supabase failed; try again later. `too-big`: the
 * row's size limit refused it. `signed-out`: the login is not valid any more.
 */
export type WriteResult = 'ok' | 'offline' | 'too-big' | 'signed-out';

/**
 * What the site needs from an account service. The UI talks only to this, so tests use a fake.
 * The Supabase version is in supabase-account.ts.
 */
export interface AccountClient {
  /**
   * Calls `listener` with the person now, and again after each sign-in or sign-out. Returns the
   * function that stops it. `lost` is true when the person was signed out, but not by "Sign out" or
   * "Delete my account": for example, when the session could not be renewed.
   */
  onUserChange(listener: (user: AccountUser | null, lost: boolean) => void): () => void;
  /** True when the browser came back from Google or GitHub, and the sign-in did not finish. */
  signInFailedOnReturn(): Promise<boolean>;
  /** Opens the sign-in page of the service. False when it could not open it. */
  signInWith(provider: Provider): Promise<boolean>;
  /** Signs out in this browser only. The browser keeps its machine and quiz scores. */
  signOut(): Promise<void>;
  /** Deletes the account and its row, then signs out. False when the deletion failed; then nothing changed. */
  deleteAccount(): Promise<boolean>;
  /**
   * Reads the person's row. Null when the person has no row yet. Throws when the read fails:
   * AccountSignedOutError when the login is not valid any more.
   */
  readProfile(userId: string): Promise<SavedProfile | null>;
  /** Writes the columns in `patch` to the person's row, and adds the row when it is missing. */
  writeProfile(userId: string, patch: ProfilePatch): Promise<WriteResult>;
}

/** The text the menu shows for the person: the name, or else the email. */
export function userLabel(user: AccountUser): string | null {
  return user.name ?? user.email;
}

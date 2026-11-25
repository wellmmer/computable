import type { AccountClient, AccountUser, ProfilePatch, Provider, SavedProfile, WriteResult } from '@/account/account-client';

interface FakeAccountOptions {
  /** The person at the start. Null means signed out. */
  user?: AccountUser | null;
  /** True when the page opens after a failed sign-in. */
  failedOnReturn?: boolean;
  /** False when the sign-in page cannot open. */
  signInResult?: boolean;
  /** False when the deletion fails. */
  deleteResult?: boolean;
  /** The person's row. Null, the default, means the person has no row yet. */
  profile?: SavedProfile | null;
  /** How each write ends. The default is 'ok'. */
  writeResult?: WriteResult;
}

/** An account client with no network, for screen tests. It records each call. */
export function createFakeAccount(options: FakeAccountOptions = {}) {
  let user = options.user ?? null;
  const listeners = new Set<(user: AccountUser | null, lost: boolean) => void>();
  const calls = { signInWith: [] as Provider[], signOut: 0, deleteAccount: 0, readProfile: 0, writeProfile: [] as ProfilePatch[] };

  const setUser = (next: AccountUser | null, lost = false) => {
    user = next;
    for (const listener of listeners) listener(next, lost);
  };

  const client: AccountClient = {
    onUserChange(listener) {
      listeners.add(listener);
      listener(user, false);
      return () => {
        listeners.delete(listener);
      };
    },
    signInFailedOnReturn: async () => options.failedOnReturn ?? false,
    async signInWith(provider) {
      calls.signInWith.push(provider);
      return options.signInResult ?? true;
    },
    async signOut() {
      calls.signOut += 1;
      setUser(null);
    },
    async deleteAccount() {
      calls.deleteAccount += 1;
      const deleted = options.deleteResult ?? true;
      if (deleted) setUser(null);
      return deleted;
    },
    async readProfile() {
      calls.readProfile += 1;
      return options.profile ?? null;
    },
    async writeProfile(_userId, patch) {
      calls.writeProfile.push(patch);
      return options.writeResult ?? 'ok';
    },
  };

  /** Signs the person out as if the session could not be renewed. */
  const loseSession = () => setUser(null, true);

  return { client, calls, setUser, loseSession };
}

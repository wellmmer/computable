import type { AccountClient, AccountUser, Provider } from '@/account/account-client';

interface FakeAccountOptions {
  /** The person at the start. Null means signed out. */
  user?: AccountUser | null;
  /** True when the page opens after a failed sign-in. */
  failedOnReturn?: boolean;
  /** False when the sign-in page cannot open. */
  signInResult?: boolean;
  /** False when the deletion fails. */
  deleteResult?: boolean;
}

/** An account client with no network, for screen tests. It records each call. */
export function createFakeAccount(options: FakeAccountOptions = {}) {
  let user = options.user ?? null;
  const listeners = new Set<(user: AccountUser | null) => void>();
  const calls = { signInWith: [] as Provider[], signOut: 0, deleteAccount: 0 };

  const setUser = (next: AccountUser | null) => {
    user = next;
    for (const listener of listeners) listener(next);
  };

  const client: AccountClient = {
    onUserChange(listener) {
      listeners.add(listener);
      listener(user);
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
  };

  return { client, calls, setUser };
}

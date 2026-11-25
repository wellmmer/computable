# Computable R5b: optional accounts

Date: 2026-11-24. Status: Wellmmer approved the design in chat on 2026-11-24. He has not reviewed this file yet.
Open to other ideas.

R5b adds optional accounts with Supabase on the free tier. An account keeps the current machine and
the quiz scores on all of a person's devices. Everything keeps working without an account. R5b
builds on the storage code in `src/storage/key-value.ts`, `src/storage/machine-storage.ts` and
`src/learn/progress-storage.ts`, which the R1 spec planned for accounts.

## 1. Decisions

| Topic | Decision |
| --- | --- |
| What an account gives | Sync only: the current machine and the quiz scores follow the person. No list of saved machines, no classes. |
| Sign-in | Google and GitHub, through Supabase Auth. No email login. |
| Machine conflict | Ask once, only when both the browser's machine and the saved machine changed. |
| Quiz scores | Merge with no question. The best score per lesson wins, with the rule that exists today. |
| Build | The browser talks to Supabase directly with `@supabase/supabase-js`. Row rules protect the data. No server code, except one keep-alive route. |
| Not synced | The theme, the language, the tour and the Home secret stay per device. |
| How R5b ships | 2 PRs. R5b1: setup, sign in and out, the account menu, "Delete my account", the privacy page. R5b2: sync, the machine dialog, the keep-alive. |
| Languages | All 5. Wellmmer reviews EN and PT-BR on the preview link. |

## 2. Setup

Wellmmer does these steps once. The PR gives the exact steps in the README.

1. Create a Supabase project on the free tier. Pick São Paulo (`sa-east-1`) if the free tier offers
   it, or else the nearest free region.
2. Run the migration in `supabase/migrations/` (section 3).
3. Create a Google OAuth app and a GitHub OAuth app. Add each to Supabase Auth.
4. In Supabase Auth, allow the redirect URLs of the live site, the Vercel previews and `localhost`.
5. In Vercel, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Both are public
   by design. The row rules protect the data.

Without these 2 values, the site hides "Sign in" and works as it does today. Tests, forks and local
development need no Supabase.

## 3. Data

One table, `profiles`, with one row per person:

| Column | Type | Meaning |
| --- | --- | --- |
| `user_id` | `uuid`, primary key | The login. It references `auth.users(id)` and is deleted with it. |
| `machine` | `jsonb`, may be null | The current machine, in the same JSON as the file download. |
| `progress` | `jsonb` | The quiz scores, in the same JSON as `computable.progress`. |
| `updated_at` | `timestamptz` | When the row last changed. |

- Row rules: a person can select, insert and update only the row whose `user_id` is their own.
  No one can read another person's row.
- `delete_my_account()` is a database function. It deletes the login of the person who calls it,
  and the row goes with it. A person cannot delete anyone else.
- The SQL lives in `supabase/migrations/`, so the setup can be repeated.

## 4. R5b1: sign in, sign out, delete

- **Sign in.** The site menu in `src/shell/SiteHeader.tsx` gets "Sign in", right after Tour. Next to
  the theme switch, the menu bar was 52 px too wide at 320 px. It shows only when the 2 Vercel values
  are set. It opens a dialog:
  - "Sign in to keep your machine and quiz scores on all your devices."
  - "Continue with Google" and "Continue with GitHub".
  - "Optional. Everything works without an account."
- After the login, the browser comes back to the same page.
- The session lives in localStorage, which is what supabase-js does by default. There is no new
  cookie, so the privacy line "The only cookie keeps your language" stays true.
- **Signed in,** the menu shows the person's name or email, and:
  - "Sign out". The browser keeps everything and stops syncing.
  - "Delete my account". It asks first: "This deletes your account and the copy saved in it. This
    browser keeps its own copy." The buttons are "Delete my account" and "Cancel".
- **Privacy page.** A new section says what is stored, where (Supabase, and the region), and how to
  delete it. It shows only when the 2 Vercel values are set. It says:
  - Supabase keeps what Google or GitHub sends when you sign in. That is your name, your email, your
    profile picture link and your user ID there.
  - Supabase also keeps sign-in records, such as the IP address and the browser.
  - A later update will also keep your machine and your quiz scores.
- **README.** "No accounts, no ads" becomes "Optional accounts, no ads". The R5 row and a "What R5b
  brings" section are updated.

## 5. R5b2: sync

- A new `SyncedKeyValue` wraps today's `KeyValue`. The simulator and the quiz code do not change.
- **Size limit.** A `check` constraint limits the JSON size of `machine` and of `progress`. Without
  it, a person could write JSON of any size into their own row.
- **Writes.** The browser writes to localStorage first, as today. While the person is signed in, each
  change goes to Supabase about 2 seconds later, in 1 write.
- **Page load while signed in.** The browser reads the row once.
  - Quiz scores merge. The best score per lesson wins.
  - The browser remembers the last machine it synced. If the browser's machine has not changed
    since then, the saved machine replaces it with no question. If both changed, the machine dialog
    opens.
- **The machine dialog.** Title: "Which machine do you want to keep?" It shows both machine names
  and when each changed. Buttons: "Keep this browser's machine" and "Use your saved machine". Below
  them: "Download this browser's machine first", with the JSON download that exists today.
- **Status line** in the account menu: "Saved to your account", "Saving…", or "Not saved: no
  connection. Your work is safe in this browser."
- **Keep-alive.** Free Supabase projects pause after some days without use (section 8). A daily
  Vercel cron job calls one route that calls a database function.

### Decisions made while planning R5b2 (2026-11-25)

1. **What "changed" means.** The browser keeps `computable.sync` = `{ userId, machine }`: the
   canonical text of the last machine synced for that login. A machine changed when its canonical
   text differs from it. A record of another login, or no record, means nothing was synced yet.
2. **Page load while signed in,** once per login and page. No readable saved machine: upload the
   browser machine, unless it did not change since the last sync. Both the same: record it. Browser machine unchanged, or none: the saved machine
   replaces it. Saved machine unchanged: upload the browser machine. Both changed: the dialog. jsonb
   does not keep the key order, so the sync compares canonical texts.
3. **Score merge.** Per lesson, with the same number of questions, the higher best wins with the
   later time. With another number of questions, the later result wins. Each side gets the merge
   when it lacks something.
4. **Writes.** Each write reads the row first, because another device may have written it since
   the page loaded. A saved machine that changed since the last sync is never written over: the
   machine dialog asks. The scores merge with the saved ones, and the browser gets the merge. One
   upsert on `user_id` sends only the changed columns, plus `user_id`, `updated_at` and, for the
   machine, `machine_changed_at`.
5. **When each machine changed.** The browser keeps `computable.machine.changedAt`. A page change to
   the machine sets it, signed in or not. Writing the same text again is not a change. The row keeps
   `machine_changed_at`. The dialog shows both with `Intl.DateTimeFormat`, in the page language.
6. **Size limit.** `check` constraints: 256 KB for the machine and 64 KB for the quiz scores, as
   JSON text. The sync checks the same limits before it writes.
7. **Session lost.** When the person is signed out without "Sign out" or "Delete my account", the
   sign-in dialog opens with "You were signed out. Sign in again to keep saving."
8. **Keep-alive.** `GET /api/keep-alive` calls `keep_alive()` with the public key. It needs
   `Authorization: Bearer <CRON_SECRET>`, compared in constant time. A missing or wrong secret: 401
   with no body. Without the Supabase values: 204 and no call. `vercel.json` runs it once a day.
9. **Support page.** The lead says "no ads and no accounts" only without the Supabase values.
   With them, it says accounts are optional.
10. **Privacy page.** It says the account keeps the current machine and the quiz scores, so they
    follow the person to other devices. With accounts, the texts that said "this browser only" say
    that the account of a signed-in person keeps a copy.
11. **Another login synced in this browser before.** The sync record names that login. Its machine
    and scores are in its own account, so none of them go into this one. The saved scores replace
    the browser scores. The browser machine is never uploaded without a question. When it differs
    from a saved machine, the dialog asks. Without a saved machine, it goes up only after the person
    changes it. No sync record at all is a first sign-in in this browser: the scores merge and the
    machine goes up, as above.
12. **"Reset my progress" while signed in.** The row keeps `progress_reset_at`, and the sync record
    keeps the reset time of this browser. A reset writes empty scores and the reset time to the
    account. Every merge drops the results that ended before the newest reset known. With accounts,
    the question says it also clears the account copy.

## 6. Errors

No error blocks a page. The browser copy is always safe.

| What happens | What the person sees |
| --- | --- |
| No connection, or Supabase is down or paused | "Not saved: no connection. Your work is safe in this browser." It tries again when the browser is back online, and every 30 seconds. |
| The machine or the quiz scores are over the size limit | "Not saved: this machine is too big for your account. Your work is safe in this browser." No retry until the next change. The status stays until a write of that machine works. |
| Another device saved a new machine since this page loaded | The next machine write does not go out. The machine dialog asks which machine to keep. |
| The login is not valid any more when the sync reads or writes | The sync stops trying. The account menu then signs the person out. |
| "Sign out" in another tab | That tab signs out. This tab follows, with no "You were signed out" message. |
| The login is cancelled or refused | "Sign-in did not finish. Try again, or keep working without an account." |
| The session cannot be renewed | The person is signed out: "You were signed out. Sign in again to keep saving." |
| The saved row has bad data | The parsers that exist today read it. Bad data reads as empty, and the browser copy wins. |
| 2 tabs are open | The newest write wins in Supabase. The tabs already follow each other through localStorage. |
| Deleting fails | "Your account was not deleted. Try again." Nothing changes. |

## 7. Tests

- **Vitest, with a fake Supabase client and no network:**
  - an unchanged browser machine takes the saved machine; 2 changed machines open the dialog;
  - the score merge;
  - the 2-second batching;
  - the retry when offline;
  - sign out stops syncing;
  - no Vercel values means no "Sign in".
- **Row rules:** an SQL test file runs against a local Supabase (`supabase start`, with Docker).
  Person A cannot read or change person B's row. Run it by hand when the SQL changes. It is not in
  CI.
- **Playwright:** the menu and the dialogs, with the Supabase calls faked at the network level. axe
  in light and dark mode.
- **By hand, before each PR:** a real Google and a real GitHub sign-in on the preview link. For
  R5b2, sync between 2 browsers.

## 8. Open checks

| Claim | Source |
| --- | --- |
| Free Supabase projects pause after about 7 days without activity. | Checked on 2026-11-25: free projects pause after 1 week of too little database activity (https://supabase.com/docs/guides/platform/free-project-pausing). |
| The built-in Supabase email sender allows only a few emails per hour, which is why R5b has no email login. | From my own knowledge. Not needed, because R5b uses no email. |
| The free tier offers the São Paulo region. | From my own knowledge, not checked. Wellmmer sees it when he creates the project. |
| supabase-js keeps the session in localStorage by default, with no cookie. | Checked on 2026-11-24: the Supabase docs say "The default behavior if you're not using SSR is to store this information in local storage" (https://supabase.com/docs/guides/auth/server-side/advanced-guide). The installed auth-js 2.119.0 uses `globalThis.localStorage` when no storage is given. |
| A Vercel Hobby project can run 1 cron job per day. | Checked on 2026-11-25: Hobby cron jobs run at most once a day, at any minute of the chosen hour (https://vercel.com/docs/cron-jobs/usage-and-pricing). Vercel now calls Cron Jobs a legacy feature, to be moved to "Schedules". |
| Vercel sends `CRON_SECRET` to the cron route. | Checked on 2026-11-25: Vercel sends the value as `Authorization: Bearer <CRON_SECRET>` (https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs). |
| Privacy laws such as LGPD and GDPR expect a way to delete an account. | From my own knowledge. "Delete my account" covers it. This is not legal advice. |
| The exact fields Supabase Auth keeps. | From my own knowledge. Check in the dashboard after setup. |

## 9. Not in R5b

- A list of saved machines.
- Classes for teachers.
- Email login.
- Syncing the theme, the language and the tour.

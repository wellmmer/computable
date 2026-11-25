'use client';

import { ChevronDown, LogIn, LogOut, Trash2, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';
import { SYNC_KEY } from '@/storage/keys';
import { sharedBrowserValues } from '@/storage/synced-key-value';
import { userLabel, type AccountClient, type AccountUser, type Provider } from './account-client';
import { DeleteAccountDialog } from './DeleteAccountDialog';
import { SignInDialog } from './SignInDialog';
import type { SyncStatus } from './sync/sync-engine';

/**
 * The look of the language switcher's button, so the menu bar stays one family. The label never
 * wraps: a 2-line label does not fit in the 36px button. The menu bar makes room for it instead.
 */
const menuButton = 'press inline-flex h-9 items-center gap-1.5 whitespace-nowrap border-2 border-ink bg-cell px-2.5 font-semibold text-ink';
const listItem = 'flex w-full items-center gap-2 px-3 py-2 text-left text-ink hover:bg-soft';

/** The text key of each sync status. */
const statusText = { saved: 'saved', saving: 'saving', offline: 'offline', 'too-big': 'tooBig' } as const;

/**
 * The account part of the menu bar (spec R5b 4). Signed out, it shows "Sign in", which opens the
 * sign-in dialog. Signed in, it shows the name or the email, with a list: the sync status, "Sign
 * out" and "Delete my account". On phones the buttons show only their icon, and screen readers still
 * hear the text.
 */
export function AccountMenu({ client, status }: { client: AccountClient; status: SyncStatus }) {
  const t = useTranslations('shell.account');
  /** Undefined until the client knows if someone is signed in. */
  const [user, setUser] = useState<AccountUser | null | undefined>(undefined);
  const [dialog, setDialog] = useState<'sign-in' | 'delete' | null>(null);
  /** The message of the sign-in dialog, when something went wrong. */
  const [notice, setNotice] = useState<'failed' | 'lost' | null>(null);
  const [open, setOpen] = useState(false);
  /** Each increase moves the focus to the menu button, after the button changed or a dialog closed. */
  const [focusRequest, setFocusRequest] = useState(0);
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  // When the session is lost, the sign-in dialog opens with the message (spec R5b 6).
  useEffect(
    () =>
      client.onUserChange((next, lost) => {
        setUser(next);
        if (!lost) return;
        setOpen(false);
        setNotice('lost');
        setDialog('sign-in');
      }),
    [client],
  );

  // After a cancelled or refused sign-in, the dialog opens again with the message (spec R5b 6).
  useEffect(() => {
    let current = true;
    void client.signInFailedOnReturn().then((failed) => {
      if (!current || !failed) return;
      setNotice('failed');
      setDialog('sign-in');
    });
    return () => {
      current = false;
    };
  }, [client]);

  useEffect(() => {
    if (focusRequest > 0) trigger.current?.focus();
  }, [focusRequest]);

  // A click or a tap outside the menu closes the list.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape' || !open) return;
    // The Esc is used here, so the tour stays open.
    event.preventDefault();
    setOpen(false);
    trigger.current?.focus();
  };

  // Tab out of the list closes it.
  const onBlur = (event: FocusEvent) => {
    if (!(event.relatedTarget instanceof Node && root.current?.contains(event.relatedTarget))) setOpen(false);
  };

  const signIn = async (provider: Provider) => {
    setNotice(null);
    if (!(await client.signInWith(provider))) setNotice('failed');
  };

  const signOut = async () => {
    setOpen(false);
    await client.signOut();
    setFocusRequest((n) => n + 1);
  };

  const askToDelete = () => {
    setOpen(false);
    setDialog('delete');
  };

  // A later account starts with no sync record, as on a new browser.
  const deleteAccount = async () => {
    const deleted = await client.deleteAccount();
    if (deleted) sharedBrowserValues().remove(SYNC_KEY);
    return deleted;
  };

  const label = user === undefined || user === null ? null : (userLabel(user) ?? t('account'));

  // One wrapper in every state, so an open dialog stays mounted when the person signs in or out.
  // `flex min-w-0` here and `min-w-0` on the button let the name shrink and end in "…" when the
  // menu bar is short of room. The list and the dialogs sit outside the flex row.
  return (
    <div ref={root} className="relative flex min-w-0" onKeyDown={onKeyDown} onBlur={onBlur}>
      {user === null && (
        <button ref={trigger} type="button" onClick={() => setDialog('sign-in')} className={menuButton}>
          <LogIn aria-hidden className="size-[18px] shrink-0" strokeWidth={1.8} />
          <span className="sr-only sm:not-sr-only">{t('signIn')}</span>
        </button>
      )}
      {label !== null && (
        <>
          <button
            ref={trigger}
            type="button"
            // "Account: Ada" holds the visible name, as WCAG 2.5.3 asks.
            aria-label={t('menuLabel', { name: label })}
            aria-expanded={open}
            aria-controls={listId}
            onClick={() => setOpen(!open)}
            className={`${menuButton} min-w-0`}
          >
            <UserRound aria-hidden className="size-[18px] shrink-0" strokeWidth={1.8} />
            {/* The aria-label gives the name to screen readers, so phones can show the icon alone. */}
            <span className="hidden max-w-40 truncate sm:block">{label}</span>
            <ChevronDown aria-hidden className={`size-4 shrink-0 motion-safe:transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          <ul id={listId} hidden={!open} className="absolute right-0 z-30 mt-1 min-w-52 border-2 border-ink bg-cell py-1">
            <li className="border-b-2 border-ink/20">
              <p role="status" className={`max-w-72 px-3 py-2 text-sm ${status === 'offline' || status === 'too-big' ? 'font-medium text-pencil' : 'text-muted'}`}>
                {t(`status.${statusText[status]}`)}
              </p>
            </li>
            <li>
              <button type="button" onClick={signOut} className={listItem}>
                <LogOut aria-hidden className="size-4 shrink-0" />
                {t('signOut')}
              </button>
            </li>
            <li>
              <button type="button" onClick={askToDelete} className={listItem}>
                <Trash2 aria-hidden className="size-4 shrink-0 text-pencil" />
                {t('delete')}
              </button>
            </li>
          </ul>
        </>
      )}
      {dialog === 'sign-in' && (
        <SignInDialog
          notice={notice}
          onSignIn={signIn}
          onClose={() => {
            setDialog(null);
            setNotice(null);
          }}
        />
      )}
      {dialog === 'delete' && (
        <DeleteAccountDialog
          onDelete={deleteAccount}
          onClose={() => {
            setDialog(null);
            // The list item that opened the dialog is hidden now, so the browser cannot return the focus to it.
            setFocusRequest((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}

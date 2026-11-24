'use client';

import { ChevronDown, LogIn, LogOut, Trash2, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';
import { userLabel, type AccountClient, type AccountUser, type Provider } from './account-client';
import { DeleteAccountDialog } from './DeleteAccountDialog';
import { SignInDialog } from './SignInDialog';

/** The look of the language switcher's button, so the menu bar stays one family. */
const menuButton = 'press inline-flex h-9 items-center gap-1.5 border-2 border-ink bg-cell px-2.5 font-semibold text-ink';
const listItem = 'flex w-full items-center gap-2 px-3 py-2 text-left text-ink hover:bg-soft';

/**
 * The account part of the menu bar (spec R5b 4). Signed out, it shows "Sign in", which opens the
 * sign-in dialog. Signed in, it shows the name or the email, with a list: "Sign out" and "Delete my
 * account". On phones the buttons show only their icon, and screen readers still hear the text.
 */
export function AccountMenu({ client }: { client: AccountClient }) {
  const t = useTranslations('shell.account');
  /** Undefined until the client knows if someone is signed in. */
  const [user, setUser] = useState<AccountUser | null | undefined>(undefined);
  const [dialog, setDialog] = useState<'sign-in' | 'delete' | null>(null);
  const [signInFailed, setSignInFailed] = useState(false);
  const [open, setOpen] = useState(false);
  /** Each increase moves the focus to the menu button, after the button changed or a dialog closed. */
  const [focusRequest, setFocusRequest] = useState(0);
  const listId = useId();
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => client.onUserChange(setUser), [client]);

  // After a cancelled or refused sign-in, the dialog opens again with the message (spec R5b 6).
  useEffect(() => {
    let current = true;
    void client.signInFailedOnReturn().then((failed) => {
      if (!current || !failed) return;
      setSignInFailed(true);
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
    setSignInFailed(false);
    if (!(await client.signInWith(provider))) setSignInFailed(true);
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

  const label = user === undefined || user === null ? null : (userLabel(user) ?? t('account'));

  // One wrapper in every state, so an open dialog stays mounted when the person signs in or out.
  return (
    <div ref={root} className="relative" onKeyDown={onKeyDown} onBlur={onBlur}>
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
            className={menuButton}
          >
            <UserRound aria-hidden className="size-[18px] shrink-0" strokeWidth={1.8} />
            <span className="sr-only max-w-40 truncate sm:not-sr-only">{label}</span>
            <ChevronDown aria-hidden className={`size-4 shrink-0 motion-safe:transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          <ul id={listId} hidden={!open} className="absolute right-0 z-30 mt-1 min-w-52 border-2 border-ink bg-cell py-1">
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
          failed={signInFailed}
          onSignIn={signIn}
          onClose={() => {
            setDialog(null);
            setSignInFailed(false);
          }}
        />
      )}
      {dialog === 'delete' && (
        <DeleteAccountDialog
          onDelete={() => client.deleteAccount()}
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

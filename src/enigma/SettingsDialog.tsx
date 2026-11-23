'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';
import {
  ALPHABET,
  checkSettings,
  isLetter,
  isM4,
  REFLECTOR_NAMES,
  ROTOR_NAMES,
  THIN_REFLECTOR_NAMES,
  THIN_ROTOR_NAMES,
  type MachineSettings,
  type Letter,
  type SettingsError,
} from '@/engines/enigma';

const SIDES = [
  { slot: 0, rotor: 'rotorLeft', ring: 'ringLeft' },
  { slot: 1, rotor: 'rotorMiddle', ring: 'ringMiddle' },
  { slot: 2, rotor: 'rotorRight', ring: 'ringRight' },
] as const;

const PROBLEM_TEXT = {
  'same-rotor': 'sameRotor',
  'letter-twice': 'letterTwice',
  'too-many-pairs': 'tooManyPairs',
  'not-a-pair': 'notAPair',
} as const satisfies Record<SettingsError['problem'], string>;

const select = 'border-2 border-ink bg-cell px-2 py-1 font-mono text-ink';
const button = 'press border-2 border-ink px-3 py-1.5 font-semibold';
const legend = 'font-semibold';

/** The partner of `letter` in the plug pairs, or null. */
function partnerOf(plugs: readonly string[], letter: Letter): Letter | null {
  const pair = plugs.find((p) => p.includes(letter));
  const other = pair?.replace(letter, '');
  return other !== undefined && isLetter(other) ? other : null;
}

/** Copies a tuple of three with one item changed. */
function withItem<T>([a, b, c]: readonly [T, T, T], slot: 0 | 1 | 2, value: T): readonly [T, T, T] {
  return [slot === 0 ? value : a, slot === 1 ? value : b, slot === 2 ? value : c];
}

interface SettingsDialogProps {
  settings: MachineSettings;
  onSave: (settings: MachineSettings) => void;
  /** Called when the dialog has closed: after Save, Cancel or Esc. */
  onClose: () => void;
}

/**
 * "Change settings" (spec R3 3): rotors, rings, reflector and plug pairs. For the M4 it adds the thin
 * rotor, its ring and its start, and offers the thin reflectors only (spec R5a 3). The lab mounts it to open
 * it. To add a plug pair, the visitor taps 2 letters; tapping a joined letter removes its pair.
 * Errors show next to their field, and screen readers say them when they show. Save keeps the dialog
 * open until there are none, and moves focus to the first error.
 */
export function SettingsDialog({ settings, onSave, onClose }: SettingsDialogProps) {
  const t = useTranslations('enigma.settings');
  const dialog = useRef<HTMLDialogElement>(null);
  const [draft, setDraft] = useState(settings);
  /** The first letter of a new plug pair, waiting for the second tap. */
  const [waiting, setWaiting] = useState<Letter | null>(null);

  useEffect(() => {
    if (dialog.current?.open === false) dialog.current.showModal();
  }, []);

  const m4 = isM4(draft) ? draft : null;
  const errors = checkSettings(draft);
  const errorText = (field: SettingsError['field']) =>
    errors.filter((error) => error.field === field).map((error) => t(PROBLEM_TEXT[error.problem], { letters: error.letters }));

  const tap = (letter: Letter) => {
    if (partnerOf(draft.plugs, letter) !== null) {
      setDraft({ ...draft, plugs: draft.plugs.filter((pair) => !pair.includes(letter)) });
    } else if (waiting === null) {
      setWaiting(letter);
    } else {
      if (waiting !== letter) setDraft({ ...draft, plugs: [...draft.plugs, waiting + letter] });
      setWaiting(null);
    }
  };

  const save = () => {
    if (errors.length > 0) {
      // Focus on the first error, so a screen reader says why Save did nothing.
      dialog.current?.querySelector<HTMLElement>('[role="alert"]')?.focus();
      return;
    }
    onSave(draft);
    dialog.current?.close();
  };

  const fieldErrors = (field: SettingsError['field']) => {
    const texts = errorText(field);
    return texts.length === 0 ? null : (
      <p id={`settings-${field}-error`} role="alert" tabIndex={-1} className="mt-1 text-sm font-medium text-pencil">
        {texts.join(' ')}
      </p>
    );
  };

  return (
    <dialog
      ref={dialog}
      aria-labelledby="settings-title"
      onClose={onClose}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(36rem,calc(100vw-2rem))] overflow-y-auto border-2 border-ink bg-cell p-5 text-ink backdrop:bg-ink/50"
    >
      <h2 id="settings-title" className="font-display text-xl font-semibold">
        {t('title')}
      </h2>

      <fieldset className="mt-4" aria-describedby={errorText('rotors').length > 0 ? 'settings-rotors-error' : undefined}>
        <legend className={legend}>{t('rotors')}</legend>
        <div className="mt-1 flex flex-wrap gap-3">
          {m4 !== null && (
            <label className="flex flex-col text-sm text-muted">
              {t('thinRotor')}
              <select
                value={m4.thinRotor}
                onChange={(event) => {
                  const name = THIN_ROTOR_NAMES.find((n) => n === event.target.value);
                  if (name !== undefined) setDraft({ ...m4, thinRotor: name });
                }}
                className={select}
              >
                {THIN_ROTOR_NAMES.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
          )}
          {SIDES.map(({ slot, rotor }) => (
            <label key={rotor} className="flex flex-col text-sm text-muted">
              {t(rotor)}
              <select
                value={draft.rotors[slot]}
                onChange={(event) => {
                  const name = ROTOR_NAMES.find((n) => n === event.target.value);
                  if (name !== undefined) setDraft({ ...draft, rotors: withItem(draft.rotors, slot, name) });
                }}
                className={select}
              >
                {ROTOR_NAMES.map((name) => (
                  <option key={name}>{name}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
        {fieldErrors('rotors')}
      </fieldset>

      <fieldset className="mt-4">
        <legend className={legend}>{t('rings')}</legend>
        <div className="mt-1 flex flex-wrap gap-3">
          {m4 !== null && (
            <label className="flex flex-col text-sm text-muted">
              {t('thinRing')}
              <select
                value={m4.thinRing}
                onChange={(event) => {
                  const letter = event.target.value;
                  if (isLetter(letter)) setDraft({ ...m4, thinRing: letter });
                }}
                className={select}
              >
                {ALPHABET.map((letter) => (
                  <option key={letter}>{letter}</option>
                ))}
              </select>
            </label>
          )}
          {SIDES.map(({ slot, ring }) => (
            <label key={ring} className="flex flex-col text-sm text-muted">
              {t(ring)}
              <select
                value={draft.rings[slot]}
                onChange={(event) => {
                  const letter = event.target.value;
                  if (isLetter(letter)) setDraft({ ...draft, rings: withItem(draft.rings, slot, letter) });
                }}
                className={select}
              >
                {ALPHABET.map((letter) => (
                  <option key={letter}>{letter}</option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </fieldset>

      {m4 !== null && (
        <div className="mt-4">
          {/* The thin rotor never turns, so its start is a setting, like a ring. */}
          <label className="flex w-fit flex-col text-sm text-muted">
            {t('thinStart')}
            <select
              value={m4.thinPosition}
              onChange={(event) => {
                const letter = event.target.value;
                if (isLetter(letter)) setDraft({ ...m4, thinPosition: letter });
              }}
              className={select}
            >
              {ALPHABET.map((letter) => (
                <option key={letter}>{letter}</option>
              ))}
            </select>
          </label>
        </div>
      )}

      <fieldset className="mt-4">
        <legend className={legend}>{t('reflector')}</legend>
        <div className="mt-1 flex gap-5">
          {(m4 === null ? REFLECTOR_NAMES : THIN_REFLECTOR_NAMES).map((name) => (
            <label key={name} className="flex items-center gap-2 font-mono">
              <input
                type="radio"
                name="reflector"
                checked={draft.reflector === name}
                onChange={() => setDraft({ ...draft, reflector: name })}
                className="size-4 accent-ink"
              />
              {m4 === null ? name : t('thinReflector', { name })}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-4" aria-describedby={`settings-plugs-help${errorText('plugs').length > 0 ? ' settings-plugs-error' : ''}`}>
        <legend className={legend}>{t('plugs')}</legend>
        <p id="settings-plugs-help" className="text-sm text-muted">
          {t('plugsHelp')}
        </p>
        <p className="mt-1 min-h-6 font-mono">{draft.plugs.length === 0 ? t('noPlugs') : draft.plugs.join(' ')}</p>
        <div className="mt-2 grid grid-cols-7 gap-1.5 sm:grid-cols-9">
          {ALPHABET.map((letter) => {
            const partner = partnerOf(draft.plugs, letter);
            return (
              <button
                key={letter}
                type="button"
                aria-pressed={waiting === letter}
                onClick={() => tap(letter)}
                className={`press h-10 border-2 font-mono font-bold ${
                  waiting === letter ? 'border-ink bg-ink text-paper' : partner === null ? 'border-ink bg-cell' : 'border-pencil bg-row-now'
                }`}
              >
                {/* The name starts with the letter the button shows, so voice control finds it by that letter. */}
                {partner === null ? (
                  letter
                ) : (
                  <>
                    <span aria-hidden>{letter}</span>
                    <span className="sr-only">{t('plugJoined', { letter, other: partner })}</span>
                  </>
                )}
              </button>
            );
          })}
        </div>
        {fieldErrors('plugs')}
      </fieldset>

      <p className="mt-4 text-sm text-muted">{t('clears')}</p>
      <div className="mt-3 flex flex-wrap justify-end gap-3">
        <button type="button" onClick={() => dialog.current?.close()} className={`${button} bg-cell text-ink`}>
          {t('cancel')}
        </button>
        <button type="button" onClick={save} className={`${button} bg-ink text-paper`}>
          {t('save')}
        </button>
      </div>
    </dialog>
  );
}

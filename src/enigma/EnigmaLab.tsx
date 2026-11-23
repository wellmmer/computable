'use client';

import { useTranslations } from 'next-intl';
import { useEffect, useReducer, useRef, useState, useSyncExternalStore } from 'react';
import { checkSettings, isLetter, isM4, modelOf, type MachineModel } from '@/engines/enigma';
import { toEnigmaLetters } from '@/home/secret';
import { MY_SECRET_HASH } from '@/home/secret-link';
import { readSecret } from '@/home/use-secret';
import { CurrentPath } from './CurrentPath';
import { DecryptBox } from './DecryptBox';
import { lettersOf } from './key-sheet';
import { groupsOf5, initialLab, labReducer, litLetters, typedLetters } from './lab-state';
import { ringsText, rotorsText, startText } from './machine-facts';
import { MachinePanel } from './MachinePanel';
import { MessageList, type LoadedMessage } from './MessageList';
import { SettingsDialog } from './SettingsDialog';
import { parseTryHash } from './try-link';

/** The rotor names in the "enigma.machine" messages, by slot. */
const SLOT_NAMES = ['left', 'middle', 'right'] as const;

/** The machines in the choice at the top of the lab, with their names in the "enigma.lab" messages (spec R5a 3). */
const MODELS = [
  { model: 'I', name: 'modelI' },
  { model: 'M4', name: 'modelM4' },
] as const satisfies readonly { model: MachineModel; name: string }[];

const button = 'press border-2 border-ink px-3 py-1.5 font-semibold disabled:opacity-50';
const strip = 'min-h-11 border border-soft bg-cell px-2.5 py-2 font-mono text-[17px] font-medium tracking-[2px] [word-spacing:6px] break-words';

/** The page never changes "hydrated" after the first render, so nothing needs a subscription. */
const noSubscription = () => () => {};

/** Typing in these fields must not press Enigma keys. */
const TEXT_FIELDS = 'input:not([type="checkbox"]):not([type="radio"]), select, textarea, [contenteditable]';

/**
 * The Enigma lab (spec R3 3, mockup lab-c-v2.html). Settings and typed letters live in this page
 * only: a reload starts again from the defaults. On phones, "Lamps lit" sits above the machine, so a
 * thumb on the keys never covers it; from 768 px, the strips and buttons sit right of the machine.
 * The messages to decrypt sit under the lab (spec R3 4). A loaded message shows above the machine.
 * A Bombe stop's link loads its key and secret letters the same way (spec R4 3). So does Home's
 * "Load my secret into the lab", with the answer, so "Check my answer" works (spec R4 4).
 */
export function EnigmaLab() {
  const t = useTranslations('enigma.lab');
  const tSettings = useTranslations('enigma.settings');
  const tMachine = useTranslations('enigma.machine');
  const tDecrypt = useTranslations('enigma.decrypt');
  const [lab, dispatch] = useReducer(labReducer, undefined, initialLab);
  const [changing, setChanging] = useState(false);
  const [copied, setCopied] = useState<'copied' | 'copyFailed' | null>(null);
  const changeButton = useRef<HTMLButtonElement>(null);
  const settingsLine = useRef<HTMLElement>(null);
  const [loaded, setLoaded] = useState<LoadedMessage | null>(null);
  const decryptHeading = useRef<HTMLHeadingElement>(null);
  /** The "Load" button that opened the box. "Close" gives the focus back to it. */
  const loadButton = useRef<HTMLButtonElement | null>(null);
  // The keyboard types only after React loads, and not while the settings dialog is open. The caret shows only then.
  const hydrated = useSyncExternalStore(noSubscription, () => true, () => false);
  const keysOn = hydrated && !changing;

  // The physical keyboard: letters press keys, Backspace takes the last one back.
  useEffect(() => {
    if (changing) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.repeat) return;
      if (event.target instanceof Element && event.target.closest(TEXT_FIELDS) !== null) return;
      if (event.key === 'Backspace') {
        event.preventDefault();
        dispatch({ type: 'backspace' });
        return;
      }
      const key = event.key.toUpperCase();
      if (isLetter(key)) {
        event.preventDefault();
        dispatch({ type: 'press', key });
      }
    };
    window.addEventListener('keydown', onKeyDown);
    // data-keys="on" says the keys work. The lab hydrates after the menu bar, so end-to-end tests wait for it before typing.
    const line = settingsLine.current;
    line?.setAttribute('data-keys', 'on');
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      line?.removeAttribute('data-keys');
    };
  }, [changing]);

  // A loaded message shows above the machine. Its heading takes the focus, so the page scrolls up to it.
  useEffect(() => {
    if (loaded !== null) decryptHeading.current?.focus();
  }, [loaded]);

  // A link from the Bombe lab loads a stop's key and opens the box with its secret letters (spec R4 3).
  // Home's "Load my secret into the lab" loads the secret saved in this browser, with its answer (spec R4 4).
  // A link pasted into the address bar of an open lab changes only the hash, so the lab listens for that too.
  useEffect(() => {
    const linkedMessage = (hash: string): LoadedMessage | null => {
      if (hash === MY_SECRET_HASH) {
        const secret = readSecret();
        if (secret === null || secret.cipher === '' || checkSettings(secret.settings).length > 0) return null;
        const { settings, start, cipher, plain } = secret;
        return { title: tDecrypt('homeSecret'), sheet: { settings, start, cipher: groupsOf5(cipher), answer: toEnigmaLetters(plain) } };
      }
      const key = parseTryHash(hash);
      if (key === null) return null;
      const { settings, start, cipher } = key;
      const title = tDecrypt('bombeStop', { rotors: settings.rotors.join(' '), start: start.join(' ') });
      return { title, sheet: { settings, start, cipher: groupsOf5(cipher), answer: null } };
    };
    const openLink = () => {
      const message = linkedMessage(window.location.hash);
      if (message === null) return;
      // Like any loaded message, the key lives in the page only: a reload goes back to the first settings.
      window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
      dispatch({ type: 'load', settings: message.sheet.settings, start: message.sheet.start });
      setLoaded(message);
    };
    openLink();
    window.addEventListener('hashchange', openLink);
    return () => window.removeEventListener('hashchange', openLink);
  }, [tDecrypt]);

  // "Copied" goes back to "Copy lit letters" after 2 seconds.
  useEffect(() => {
    if (copied === null) return;
    const timer = window.setTimeout(() => setCopied(null), 2000);
    return () => window.clearTimeout(timer);
  }, [copied]);

  const lit = litLetters(lab);
  const last = lab.typed.at(-1) ?? null;
  const { rotors, plugs } = lab.settings;
  const m4 = isM4(lab.settings) ? lab.settings : null;
  const reflectorText = m4 === null ? lab.settings.reflector : tSettings('thinReflector', { name: m4.reflector });

  const news = () => {
    if (lab.news === null) return null;
    const { kind, letter } = lab.news;
    if (kind === 'turned') {
      const { slot } = lab.news;
      return tMachine('window', { rotor: tMachine(SLOT_NAMES[slot]), name: rotors[slot], letter });
    }
    return t(kind === 'lit' ? 'litNews' : 'removedNews', { letter });
  };

  const load = ({ settings, start }: LoadedMessage['sheet']) => dispatch({ type: 'load', settings, start });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(groupsOf5(lit));
      setCopied('copied');
    } catch {
      setCopied('copyFailed');
    }
  };

  const chooseModel = (model: MachineModel) => {
    dispatch({ type: 'model', model });
    // A loaded message belongs to the machine it was loaded into.
    setLoaded(null);
  };

  return (
    <>
      <fieldset className="mt-4">
        <legend className="font-semibold">{t('machine')}</legend>
        <div className="mt-1 flex flex-wrap gap-x-6 gap-y-2">
          {MODELS.map(({ model, name }) => (
            <label key={model} className="flex items-center gap-2">
              <input type="radio" name="machine" checked={modelOf(lab.settings) === model} onChange={() => chooseModel(model)} className="size-4 accent-ink" />
              {t(name)}
            </label>
          ))}
        </div>
        <p className="mt-1 text-sm text-muted">{t('machineHelp')}</p>
      </fieldset>

      <section ref={settingsLine} aria-label={t('settings')} className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1.5 border border-soft bg-cell px-3.5 py-2.5 sm:rounded">
        <dl className="hidden flex-wrap gap-x-6 gap-y-1.5 sm:flex">
          {[
            [tSettings('rotors'), rotorsText(lab.settings)],
            [tSettings('rings'), ringsText(lab.settings)],
            [tSettings('plugs'), plugs.length === 0 ? tSettings('noPlugs') : plugs.join(' ')],
            [tSettings('reflector'), reflectorText],
          ].map(([term, value]) => (
            <div key={term}>
              <dt className="text-[13px] text-muted">{term}</dt>
              <dd className="font-mono font-semibold">{value}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-muted sm:hidden">{t('summary', { rotors: rotorsText(lab.settings), reflector: reflectorText, count: plugs.length })}</p>
        <button ref={changeButton} type="button" onClick={() => setChanging(true)} className={`${button} ml-auto bg-cell text-ink`}>
          <span className="sm:hidden">{t('change')}</span>
          <span className="hidden sm:inline">{t('changeSettings')}</span>
        </button>
      </section>

      {loaded !== null && (
        <DecryptBox
          key={loaded.title}
          message={loaded}
          lit={lit}
          headingRef={decryptHeading}
          onTypeForMe={() => {
            load(loaded.sheet);
            dispatch({ type: 'type', letters: lettersOf(loaded.sheet.cipher) });
          }}
          onClose={() => {
            setLoaded(null);
            loadButton.current?.focus();
          }}
        />
      )}

      <div className="mt-4 grid gap-4 md:grid-cols-[1.25fr_1fr] md:grid-rows-[auto_auto_1fr]">
        <section aria-labelledby="lit-title" className="md:col-start-2 md:row-start-2">
          <h2 id="lit-title" className="mb-1 font-semibold">
            {t('lit')}
          </h2>
          <div data-strip className={`${strip} border-l-4 border-l-lamp`}>
            {groupsOf5(lit)}
          </div>
        </section>

        <div className="md:col-start-1 md:row-span-3 md:row-start-1">
          <MachinePanel
            rotors={rotors}
            thin={m4 === null ? null : { name: m4.thinRotor, letter: m4.thinPosition }}
            positions={lab.positions}
            lit={last?.lamp ?? null}
            lastKey={last?.key ?? null}
            onPress={(key) => dispatch({ type: 'press', key })}
            onTurn={(slot, by) => dispatch({ type: 'turn', slot, by })}
          />
        </div>

        <section aria-labelledby="typed-title" className="md:col-start-2 md:row-start-1">
          <h2 id="typed-title" className="mb-1 font-semibold">
            {t('typed')}
          </h2>
          <div data-strip className={strip}>
            {groupsOf5(typedLetters(lab))}
            {keysOn && <span data-caret aria-hidden="true" className="typing-caret" />}
          </div>
        </section>

        <div className="md:col-start-2 md:row-start-3">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => dispatch({ type: 'back-to-start' })} className={`${button} bg-ink text-paper`}>
              {t('backToStart', { start: startText(lab.settings, lab.start) })}
            </button>
            <button type="button" onClick={copy} disabled={lit === ''} className={`${button} bg-cell text-ink`}>
              {t(copied ?? 'copy')}
            </button>
            <button type="button" onClick={() => dispatch({ type: 'clear' })} className={`${button} bg-cell text-ink`}>
              {t('clear')}
            </button>
          </div>
          <p className="mt-2 text-sm text-muted">{t('hint')}</p>
          {lab.previousLit !== '' && <p className="mt-2 font-mono text-sm">{t(lab.previousLitAfter === 'turn' ? 'previousLitTurned' : 'previousLit', { letters: groupsOf5(lab.previousLit) })}</p>}
        </div>
      </div>

      <CurrentPath settings={lab.settings} last={last} />

      <MessageList
        onLoad={(message, button) => {
          loadButton.current = button;
          load(message.sheet);
          setLoaded(message);
        }}
      />

      <p role="status" className="sr-only">
        {lab.news !== null && <span key={lab.news.id}>{news()}</span>}
      </p>

      {changing && (
        <SettingsDialog
          settings={lab.settings}
          onSave={(settings) => dispatch({ type: 'settings', settings })}
          onClose={() => {
            setChanging(false);
            changeButton.current?.focus();
          }}
        />
      )}
    </>
  );
}

import { z } from 'zod';
import { ALPHABET, REFLECTOR_NAMES, ROTOR_NAMES, type EnigmaSettings, type Positions } from '@/engines/enigma';
import { createKeyValue, type KeyValue } from '@/storage/key-value';

/** Where the browser keeps Home's secret (spec R3 4). */
export const SECRET_KEY = 'computable.secret';

/** Home's secret, as the browser keeps it. The R4 Bombe will read it to try to break it. */
export interface SavedSecret {
  /** The text the visitor typed. */
  plain: string;
  /** The lamps it lit: the secret letters. */
  cipher: string;
  settings: EnigmaSettings;
  start: Positions;
}

const letter = z.enum(ALPHABET);
const secretSchema = z.strictObject({
  plain: z.string(),
  cipher: z.string().regex(/^[A-Z]*$/),
  settings: z.strictObject({
    rotors: z.tuple([z.enum(ROTOR_NAMES), z.enum(ROTOR_NAMES), z.enum(ROTOR_NAMES)]),
    rings: z.tuple([letter, letter, letter]),
    reflector: z.enum(REFLECTOR_NAMES),
    plugs: z.array(z.string().regex(/^[A-Z]{2}$/)),
  }),
  start: z.tuple([letter, letter, letter]),
});

/** Reads a saved secret. Data that does not parse reads as no secret, so it never breaks Home. */
export function parseSecret(text: string | null): SavedSecret | null {
  if (text === null) return null;
  try {
    const parsed = secretSchema.safeParse(JSON.parse(text));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Where Home's secret lives. Like the quiz progress, it keeps working in memory when storage is blocked. */
export interface SecretStorage {
  /** False when the browser blocks storage. The secret then lives in memory until the tab closes. */
  readonly persistent: boolean;
  load(): SavedSecret | null;
  save(secret: SavedSecret): void;
  /** "Forget my secret". */
  forget(): void;
}

function createSecretStorage(values: KeyValue): SecretStorage {
  return {
    get persistent() {
      return values.persistent;
    },
    load: () => parseSecret(values.read(SECRET_KEY)),
    save: (secret) => values.write(SECRET_KEY, JSON.stringify(secret)),
    forget: () => values.remove(SECRET_KEY),
  };
}

/** The secret in the browser's localStorage, with an in-memory fallback. */
export function createBrowserSecretStorage(getStorage: () => Storage = () => window.localStorage): SecretStorage {
  return createSecretStorage(createKeyValue(getStorage));
}

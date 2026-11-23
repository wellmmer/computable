import type { Stop } from '@/engines/bombe';
import type { SecretKey } from '@/home/random-key';

/**
 * True when a stop is the key of Home's secret (spec R4 4): the same rotor order, the same start, and
 * every plug pair the stop found is in the key. The stop may miss pairs that its menu never reached.
 */
export function isYourKey(stop: Stop, key: SecretKey): boolean {
  const pairs = new Set(key.settings.plugs.map((pair) => [...pair].sort().join('')));
  return stop.rotors.join(' ') === key.settings.rotors.join(' ') && stop.start.join('') === key.start.join('') && stop.plugs.every((pair) => pairs.has(pair));
}

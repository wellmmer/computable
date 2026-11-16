/** A Storage backed by a Map, like localStorage in a browser that allows it. */
export function fakeStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, String(value)),
  };
}

/** A Storage that throws on every write, like Safari in a private window with storage blocked. */
export function blockedStorage(): Storage {
  return { ...fakeStorage(), setItem: () => { throw new DOMException('blocked', 'SecurityError'); } };
}

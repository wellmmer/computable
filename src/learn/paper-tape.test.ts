import { describe, expect, it } from 'vitest';
import { createSimulatorStore } from '@/simulator/store';
import { createMemoryStorage } from '@/storage/machine-storage';
import { moveTo, partsReached, tapeMode } from './paper-tape';

describe('partsReached (spec R2c 3: one step per part reached)', () => {
  it('counts the parts whose top has passed the reading line', () => {
    expect(partsReached([500, 900, 1300], 400)).toBe(0);
    expect(partsReached([380, 780, 1180], 400)).toBe(1);
    expect(partsReached([-900, -500, 390], 400)).toBe(3);
  });

  it('counts a part whose top sits on the line as reached', () => {
    expect(partsReached([400, 800], 400)).toBe(1);
  });

  it('goes down again when the visitor scrolls back up', () => {
    expect(partsReached([-200, 200, 600], 400)).toBe(2);
    expect(partsReached([300, 700, 1100], 400)).toBe(1);
  });
});

describe('tapeMode', () => {
  it('steps with the scroll when the browser can watch the parts and allows motion', () => {
    expect(tapeMode({ reducedMotion: false, observer: true })).toBe('scroll');
  });

  it('shows Step and Reset when the visitor asks for reduced motion', () => {
    expect(tapeMode({ reducedMotion: true, observer: true })).toBe('buttons');
  });

  it('shows Step and Reset when the browser cannot watch the parts', () => {
    expect(tapeMode({ reducedMotion: false, observer: false })).toBe('buttons');
  });
});

describe('moveTo', () => {
  function turingStore() {
    const store = createSimulatorStore({ storage: createMemoryStorage() });
    store.getState().loadExample('turing-1936');
    return store;
  }

  it("runs Turing's first machine forward to the step asked for", () => {
    const store = turingStore();
    moveTo(store, 3);
    const run = store.getState().run;
    expect(run?.history).toHaveLength(3);
    expect(run?.head).toBe(3);
    expect(run?.state).toBe('𝔨');
    expect([0, 1, 2].map((cell) => run?.tape.read(cell))).toEqual(['0', '_', '1']);
  });

  it('steps back when the step asked for is lower, and erases what those steps printed', () => {
    const store = turingStore();
    moveTo(store, 5);
    moveTo(store, 2);
    const run = store.getState().run;
    expect(run?.history).toHaveLength(2);
    expect(run?.head).toBe(2);
    expect(run?.tape.read(2)).toBe('_');
    moveTo(store, 0);
    expect(store.getState().run?.history).toHaveLength(0);
    expect(store.getState().run?.head).toBe(0);
  });

  it('does nothing when the machine is already at that step', () => {
    const store = turingStore();
    moveTo(store, 4);
    const version = store.getState().version;
    moveTo(store, 4);
    expect(store.getState().version).toBe(version);
  });
});

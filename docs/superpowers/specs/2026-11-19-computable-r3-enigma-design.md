# Computable R3: the Enigma lab, messages, and a one-rotor Turing machine

Date: 2026-11-19. Status: Wellmmer approved the design in chat on 2026-11-19. He has not reviewed this file yet.
Open to other ideas.

R3 adds the Enigma I machine to Computable. A visitor types on a keyboard, a lamp lights, and a
diagram shows where the current went. R3 reuses the R1 shell, the 5 languages, and the machine
panel colors from the R1 spec, section 5.

## 1. Decisions

| Topic | Decision |
| --- | --- |
| How R3 ships | 3 PRs. R3a: the engine and the lab at `/enigma`. R3b: practice messages, real messages, and the new Home. R3c: a one-rotor Turing machine in the simulator. Wellmmer chose this on 2026-11-18. |
| Lab layout | Layout "C v2" from the brainstorm mockup: the machine, two letter strips, and the path of the current. Wellmmer approved it on 2026-11-18 and asked for the clearest, easiest UI possible. |
| Real messages | All of them: the 1941 Barbarossa message (2 parts, Enigma I) and the 1943 Scharnhorst message (naval M3). |
| Home | "Type your own secret": a small Enigma on Home. |
| One-rotor machine | 4 letters (A B C D), 16 rules. |
| Languages | All 5, as in R2. Wellmmer reviews EN and PT-BR on the preview link. |

## 2. R3a: the engine, `src/engines/enigma/`

Plain TypeScript with no React, like `src/engines/turing/`.

- **Parts:** rotors I to VIII, reflectors B and C, ring settings, and a plugboard with 0 to 13 pairs.
  Rotors VI, VII and VIII have 2 notches each (Z and M). The others have 1.
- **Stepping:** before each letter, the right rotor steps. When the middle rotor stands at its notch,
  the middle and left rotors both step (the double step). Otherwise, when the right rotor stands at
  its notch, the middle rotor steps.
- **Pure functions.** `press(state, letter)` returns the new state, the lit lamp, and the path. The
  path lists the letter after each part: key, plugboard, right rotor, middle rotor, left rotor,
  reflector, left rotor, middle rotor, right rotor, plugboard. The lab draws this path.
- **Settings check.** A setting with the same rotor twice, a letter in two plug pairs, or more than
  13 pairs returns an error. The lab shows the error next to the field.

Tests (Vitest):

| Test | Expected |
| --- | --- |
| Rotors I II III, reflector B, rings AAA, start AAA, no plugs, type `AAAAA` | `BDZGO` |
| Rotors I II III, start ADU, press 3 keys | Windows show ADV, then AEW, then BFX (the double step) |
| Any settings, type a text, go back to the start, type the result | The original text |
| Any settings, any letter | The lamp is never the letter typed |
| The default lab settings below, type `WETTERBERICHT` | `PBJGOLIZQMQGZ` |

The last 3 rows also run as property tests with random settings, like `run.property.test.ts`.

## 3. R3a: the lab, `/[locale]/enigma`

The page follows the approved mockup.

- **Title and lead.** "Enigma I". "Type a letter on your keyboard or tap a key. A lamp lights the
  secret letter."
- **Settings line,** always visible: Rotors, Rings, Plug pairs, Reflector. Default: rotors I II III,
  rings A A A, plug pairs `AV BS CG DL FU HZ IN KM OW RX`, reflector B, start B L A.
- **"Change settings"** opens a dialog with rotors, rings, reflector, and plug pairs. To add a plug
  pair, the visitor taps 2 letters. Tapping a paired letter removes its pair.
- **Machine panel:** rotor windows with ▲ and ▼ buttons, and the note "The right rotor turns one
  step before each letter." Below it, the lampboard and the keyboard. Both use the German rows
  QWERTZUIO, ASDFGHJK, PYXCVBNML.
- **Two strips,** "You typed" and "Lamps lit", in groups of 5 letters.
- **Buttons:** "Back to start (B L A)", "Copy lit letters", "Clear". Below them, the hint: "To
  decrypt: go back to the start, then type the lit letters. The lamps show the message again."
- **Backspace** removes the last letter and turns the rotors back one step. The real machine could
  not do this. The lab allows it to help learners.
- **Path panel,** "Where the current went for T", with a "Show the path" switch. It is an SVG. The
  current goes out on the top lane (key, plugboard, rotor III, rotor II, rotor I, reflector) and back
  on the bottom lane. A red ring marks each plugboard swap. One sentence explains why a letter never
  lights itself.
- **Phone layout:** the settings line shrinks to one line with a "Change" button. The "Lamps lit"
  strip sits above the machine. Below the machine: "You typed", the buttons, and the path drawn top
  to bottom.
- **Accessibility:** a live region reads the lit letter. Every key is a real button. The keyboard
  works with a physical keyboard and with the on-screen keys.
- **State:** settings and typed text live in the page only. A reload goes back to the defaults.
- **Menu:** the Enigma item in `src/shell/menu.ts` links to `/enigma` and loses its "coming soon"
  label.

## 4. R3b: messages and Home

### Practice messages

- 3 messages, each harder than the last: no plug pairs, then plug pairs, then ring settings too.
- Each message shows a key sheet: the settings to set on the machine, and the cipher text.
- A "Check my answer" button compares the visitor's decrypted text with the answer.
- The plain text is in the visitor's language, written without accents, because Enigma has only
  26 letters.

### Real messages

- The 1941 Barbarossa message, parts 1 and 2 (Enigma I), and the 1943 Scharnhorst message (naval M3,
  which uses rotors VI and VIII).
- Each shows its real settings, the cipher text, the German plain text, and a translation.
- A button loads the settings into the machine, so the visitor can decrypt it.
- **Source rule.** The settings and texts I have now are from my own knowledge, not checked. Before
  R3b ships, every setting and every letter is checked against a published source, and the page
  links that source. A Vitest test decrypts each message and compares it with the published plain
  text.

### Home: "Type your own secret"

- Home shows a small Enigma with the prompt "Type a secret message".
- The secret is saved in the visitor's browser only: the plain text, the cipher text, and the
  settings. Nothing leaves the browser. The R4 Bombe will try to break it.
- A "Forget my secret" button deletes it.
- Buttons: "Open the Enigma lab" and "Open the simulator".
- Turing's tape, the current Home picture, moves below, smaller.

## 5. R3c: the one-rotor machine in the simulator

- A new example machine in the simulator, on the alphabet A B C D.
- It reads a letter, writes the letter the rotor's wiring gives at the current position, and turns
  the rotor one step. The rotor position is part of the machine's state: 4 positions × 4 letters =
  16 rules.
- A short note says that the same idea with 26 letters needs 26 × 26 = 676 rules, and links to the
  lab.
- A Vitest test runs the machine on every 4-letter input from AAAA to DDDD and compares the output with
  a short rotor function written in the test.

## 6. Tests and checks

The same checks as R2, for each PR: Vitest, Playwright in 5 languages and at phone sizes, axe with 0
violations, and Lighthouse on a phone setting (accessibility 100, performance 95 or more). For R3a,
Playwright also checks the physical keyboard, Backspace, "Back to start", and the settings dialog.

## 7. How it ships

| PR | Content |
| --- | --- |
| R3a | This spec, the engine, the lab, the menu link. |
| R3b | Practice messages, real messages with their sources, the new Home. |
| R3c | The one-rotor machine in the simulator. |

Each PR updates the README roadmap: the R3 row and a short "What R3 brings". Merging still needs
Wellmmer's OK for each PR.

## 8. Open checks

| Claim | Source |
| --- | --- |
| Rotor wirings I to VIII, notches, and reflectors B and C. | From my own knowledge. The `BDZGO` test checks rotors I to III and reflector B only. Before R3a ships, check all wirings against a published table. |
| `WETTERBERICHT` gives `PBJGOLIZQMQGZ` with the default lab settings. | Checked: a scratch script, the same one that gives `BDZGO`. Not checked against a second tool. |
| The Barbarossa and Scharnhorst settings and texts. | From my own knowledge, not checked. Must be checked before R3b ships (section 4). |
| The simulator can hold a machine on the alphabet A B C D with 16 rules. | Not checked. The R3c plan checks it first. |

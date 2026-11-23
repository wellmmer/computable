# Computable R5a: the naval Enigma M4

Date: 2026-11-23. Status: Wellmmer approved the design in chat on 2026-11-23. He has not reviewed this file yet.
Open to other ideas.

R5a adds the naval Enigma M4 to the Enigma lab. R5b, optional accounts, gets its own design talk
after R5a ships. R5a reuses the Enigma engine in `src/engines/enigma/`, the lab in `src/enigma/`, and
the 5 languages.

## 1. Decisions

| Topic | Decision |
| --- | --- |
| Order | The M4 first (R5a). Accounts later (R5b), with their own design talk. |
| Place | A choice in the existing `/enigma` lab: "Enigma I" or "Naval M4". No new page. |
| Bombe | The Bombe stays 3-rotor. The M4 history box explains why. |
| Messages | The real U-264 message of 25 November 1942, and 1 practice M4 message. |
| How R5a ships | 2 PRs. R5a1: the engine, the M4 choice, the practice message. R5a2: U-264, the history box, the README. |
| Languages | All 5, as in R3 and R4. Wellmmer reviews EN and PT-BR on the preview link. |

## 2. R5a1: the engine

The M4 is a second machine model next to the Enigma I. Plain TypeScript with no React.

- **New parts.** The thin rotors Beta and Gamma, and the thin reflectors B and C. Each wiring is
  checked letter by letter against 2 published sources, as for rotors I to VIII.
- **The 4th rotor never turns.** It sits between the left rotor and the thin reflector. The 3
  turning rotors step as they do in the Enigma I, with the middle rotor's double step. So the
  existing `Three` types and `stepRotors` stay as they are.
- **M4 settings** add the thin rotor, its ring, and its start letter. The reflector is a thin one.
  Rotors I to VIII are allowed, each at most once.
- **The current path** adds the 4th rotor on the way in and on the way out, so the lab can draw it.
- **The Enigma I does not change.** The Bombe, the Home secret, and "Try in the Enigma lab" keep
  using it.

Tests (Vitest):

| Test | Expected |
| --- | --- |
| Beta at A, ring A, with thin reflector B | The same letters as the Enigma I with reflector B. Checked on 2026-11-23: true (see section 6). |
| Gamma at A, ring A, with thin reflector C | The same letters as the Enigma I with reflector C. Checked on 2026-11-23: true. |
| The Dönitz message of 1 May 1945 | Its first 108 letters decrypt to the plain text the Crypto Museum publishes. |
| Any M4 setting, a message typed twice from the same start | The second pass gives the plain text back. |
| No letter | Ever turns into itself. |
| The 4th rotor | Never turns, over 1,000 key presses. |

## 3. R5a1: the lab

- **Machine choice** at the top of `/enigma`: "Enigma I" or "Naval M4". The Enigma I stays the
  default, so existing links and saved machines keep working.
- **4 rotor windows** with the M4. The thin rotor is the leftmost window and looks thinner.
- **Settings dialog** adds the thin rotor (Beta or Gamma), its ring, and its start, and offers the
  thin reflectors only.
- **The current path** drawing shows the 4th rotor.
- **Practice M4 message.** One message we make, with its key shown, in the message list.
- **Switching** puts back that machine's starting key, as after a reload: its rotors, rings, plug
  pairs, reflector and windows. It also clears the typed letters and closes a loaded message. This is
  the simple, safe choice: the Enigma I allows only rotors I to V, so an M4 key would not always fit it.

## 4. R5a2: U-264 and the history box

- **U-264.** The real message of 25 November 1942 from U-264, as broken by the M4 Project in 2006,
  with its published key. The source is linked next to the message.
- **History box** under the lab: in 1942 the navy added the 4th rotor; Bletchley Park could not read
  U-boat messages for about 10 months; 4-rotor Bombes came in 1943. It says the Bombe on this site
  is 3-rotor, so it does not break M4 messages. Each fact links to its source.
- **README:** the R5 row and a short "What R5a brings".

## 5. Tests and checks

The same checks as R4, for each PR: Vitest, Playwright in 5 languages and at phone sizes, axe with 0
violations in light and dark mode. Lighthouse is not required.

## 6. Open checks

| Claim | Source |
| --- | --- |
| The wirings of Beta, Gamma, thin B and thin C. | Checked letter by letter on 2026-11-23: [Crypto Museum, "Enigma wiring"](https://www.cryptomuseum.com/crypto/enigma/wiring.htm) and [Wikipedia, "Enigma rotor details"](https://en.wikipedia.org/wiki/Enigma_rotor_details) agree. |
| Beta at A with thin B equals the Enigma I with reflector B; Gamma at A with thin C equals reflector C. | Checked on 2026-11-23: true. A property test in `src/engines/enigma/m4.test.ts` compares both machines on random settings and texts. |
| An M4 test vector. | Checked on 2026-11-23: [Crypto Museum, "Dönitz message"](https://www.cryptomuseum.com/crypto/enigma/msg/p1030681.htm). M4, thin reflector C, Beta, rotors V VI VIII, rings E P E L, start C D S Z. Its first 108 letters decrypt. The page says later groups have reception errors. |
| The U-264 message, its date, its key, and its 2006 break by the M4 Project. | From my own knowledge. Check before R5a2 ships. |
| The 10-month blackout in 1942 and the 4-rotor Bombes in 1943. | From my own knowledge. Check before R5a2 ships. |

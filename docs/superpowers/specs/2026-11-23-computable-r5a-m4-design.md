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
| Messages | The real U-264 message of November 1942, and 1 practice M4 message. See section 6 for the date. |
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

- **U-264.** The real message of November 1942 from U-264, as broken by the M4 Project in 2006,
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
| The U-264 message, its date, its key, and its 2006 break by the M4 Project. | Checked on 2026-11-23: [M4 Project](https://www.bytereef.org/m4_project.html) says the first message was broken on 20 February 2006, with distributed computing. [M4 Project, first break](https://www.bytereef.org/m4-project-first-break.html) gives U264, Hartwig Looks, thin reflector B, rings A A A V, start V J N A, the plug pairs, and the plain text. [uboat.net](https://uboat.net/boats/u264.htm) names Hartwig Looks as commander. All 232 letters decrypt in `src/engines/enigma/m4.test.ts`. |
| The date of the U-264 message. | Changed to "November 1942". The M4 Project page says 25 November 1942. Erskine's letter shows the signal time "1840/19Z", so it was received on the 19th. I did not open Erskine's letter: this comes from the research before R5a2. The war diary entry on the first break page reads 1851/19/252. |
| The rings A A A V. | Not historical. They are the rings the M4 Project found. The thin rotor and the left rotor never turn in these 232 letters. So other ring and start pairs give the same text, and `m4.test.ts` shows 2 of them. |
| The plain text of U-264. | The research before R5a2 gave 231 letters. The first break page and the engine give 232: the text ends "vierysichteinsnull", with a Y before "sicht". The page uses the 232 letters. |
| The M4 in use from 1 February 1942. | Checked on 2026-11-23: [Wikipedia, "Enigma machine"](https://en.wikipedia.org/wiki/Enigma_machine): "A four-rotor Enigma was introduced by the Navy for U-boat traffic on 1 February 1942." |
| About 10 months without U-boat messages, the U-559 codebooks, and December 1942. | Checked on 2026-11-23: [Wikipedia, "German submarine U-559"](https://en.wikipedia.org/wiki/German_submarine_U-559) gives 30 October 1942, the ten months, and the value of the codebooks. [Wikipedia, "Cryptanalysis of the Enigma"](https://en.wikipedia.org/wiki/Cryptanalysis_of_the_Enigma) says reading restarted in December 1942. It dates the capture "29 or 30 October 1942". The page says 30 October, as the U-559 article does. |
| The 4-rotor Bombes of 1943. | Checked on 2026-11-23: [Wikipedia, "Bombe"](https://en.wikipedia.org/wiki/Bombe): Harold Keen at BTM designed Mammoth. NCR in Dayton built the US Navy Bombe, and Joseph Desch led the work. The first one was tested on 3 May 1943. A table lists 4 four-rotor Bombes in June 1943 and 95 in December 1943. |
| 3-rotor Bombes would take 50 to 100 times as long. | Checked on 2026-11-23: the Bombe article does not say this. [Wikipedia, "Cryptanalysis of the Enigma"](https://en.wikipedia.org/wiki/Cryptanalysis_of_the_Enigma) does: "Solving Shark keys on 3-rotor bombes would have taken 50 to 100 times as long as an average Air Force or Army job." The page links that article. |

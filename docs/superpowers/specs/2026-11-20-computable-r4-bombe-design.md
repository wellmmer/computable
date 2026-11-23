# Computable R4: the Bombe lab

Date: 2026-11-20. Status: Wellmmer approved the design in chat on 2026-11-20. He has not reviewed this file yet.
Open to other ideas.

R4 adds the Bombe to Computable. The visitor gives the Bombe a crib, a word they know is in a
message. The Bombe tests every rotor order and every start, and stops where the crib fits. R4 reuses
the Enigma engine in `src/engines/enigma/`, the R1 shell, the 5 languages, and the drum colors in the
R1 spec: red `#B23A2E`, yellow `#C9A227`, green `#3E7D4F`.

## 1. Decisions

| Topic | Decision |
| --- | --- |
| Search | A real Turing–Welchman search: a menu of letter links from the crib, loops, and the diagonal board. It tests all 60 rotor orders (3 of rotors I to V) × 17,576 starts, in a Web Worker. |
| Home key | Each new Home secret gets a random key, saved with the secret in the browser. |
| Crib | The visitor types a word, then slides it along the secret letters. A place where a letter would turn into itself shows in red. A hint warns when the crib is short or its menu has no loop. |
| Layout | Layout B from the brainstorm mockup: the drum wall on the left; the crib, the menu and the stops on the right. On phones: crib, menu, drum wall, stops. |
| How R4 ships | 3 PRs. R4a: the engine and the lab. R4b: the Home key and slow step mode. R4c: history, the film, and Barbarossa. |
| Film | Wellmmer asked to suggest "The Imitation Game" (2014) somewhere in the app. The app calls it a drama that changes facts. |
| Languages | All 5, as in R3. Wellmmer reviews EN and PT-BR on the preview link. |

## 2. R4a: the engine, `src/engines/bombe/`

Plain TypeScript with no React, like `src/engines/enigma/`.

- **Menu.** `buildMenu(cipher, crib, offset)` returns one link for each crib letter: the plain
  letter, the secret letter, and the position in the message. It also returns the letters, the
  loops counted, and the menu's center letter (the letter with the most links).
- **Crashes.** `crashes(cipher, crib, offset)` lists the positions where the crib letter equals the
  secret letter. An Enigma never turns a letter into itself, so the crib cannot sit there.
- **One test.** For one rotor order and one start, each link is a scrambler: the Enigma without its
  plugboard, at that link's position. The test assumes the center letter is plugged to one letter,
  then spreads that fact along every link. The diagonal board adds the mirror fact: if A is plugged
  to B, then B is plugged to A. The test stops when the center letter's 26 wires do not all light.
  A wrong guess can also light just 1 wire when the menu has no loop. So at each stop, the engine
  tries every partner for the center letter. It keeps each guess where no letter gets two partners.
  Only the center letter's group of links is tested. Links in other groups give no plug pairs.
- **Stepping.** Each scrambler uses the real stepping of the Enigma engine, with the middle rotor's
  double step. Rings stay at A A A, so the Bombe finds where each rotor's wiring sits.
- **Stop result.** Each stop gives the rotor order, the start, and the plug pairs that the facts
  worked out. Letters the menu never reached stay unknown.
- **Search.** `searchOrder(order, menu)` tests the 17,576 starts of one rotor order. The worker,
  `src/bombe/search.worker.ts`, runs the 60 orders, reports progress after each order, and stops when
  asked.
- **Speed target.** The full search finishes in under 60 s on a desktop. AI theory, not checked: the
  plan measures it first, before any UI work.

Tests (Vitest):

| Test | Expected |
| --- | --- |
| The practice message and its crib at the right place | The practice key is among the stops. |
| 20 random keys (property test), a 15-letter crib from each message | The true key is among the stops each time. |
| A known crib and message | The menu has the expected links, loop count and center letter. |
| A crib with a letter on top of the same secret letter | `crashes` lists that position. |
| A stop's plug pairs, loaded into the Enigma engine | The crib comes out at its place. |

## 3. R4a: the lab, `/[locale]/bombe`

- **Title and lead.** "Bombe". "Give the Bombe a word you know is in the message. It finds the key."
- **Menu item** "Bombe", after "Enigma".
- **Crib card.** A text field for the crib, the secret letters above it, and ◀ ▶ buttons to slide
  it. Crashes show in red. A green line says when no letter turns into itself. A hint shows when the
  crib has fewer than 15 letters or its menu has no loop. Start still works with a short crib
  (Wellmmer, 2026-11-20). The stops list shows at most 100 stops and counts the rest.
- **Menu card.** A drawing of the menu: letters as circles, links as lines, and the loop count. A
  sentence says "More loops, fewer false stops."
- **Drum wall.** A dark panel. One Enigma for each menu link, up to 12, each with 3 drums: left
  rotor red, middle yellow, right green. The drums show the letters being tested and turn during the
  search. A bar and a line show the rotor order, "7 of 60", and the stops so far. Start and Stop
  buttons. With reduced motion, the drums do not turn; only the counter changes.
- **Stops card.** A list: rotor order, start, plug pairs found. "Try in the Enigma lab" opens
  `/enigma` with these settings and the secret letters loaded, using the R3b decrypt box.
- **Practice message.** One ready-made German message with 10 plug pairs and the crib
  `WETTERBERICHT`. "Load the practice message" fills the secret letters.
- **Layout.** Desktop: drum wall left, cards right. Phones: crib, menu, drum wall, stops.

## 4. R4b: your own secret, and slow step mode

### Home key

- Each new Home secret gets a random key: 3 different rotors from I to V, a random start, 10 random
  plug pairs, rings A A A, reflector B. `SavedSecret` already stores settings and start, so the
  stored shape does not change.
- Secrets saved before R4b keep their fixed settings and still decrypt.
- Home does not show the key. Two buttons: "Load my secret into the lab" and "Break it with the
  Bombe". The second opens `/bombe` with the secret letters filled in.
- On `/bombe`, a stop that matches the saved key shows "✓ This is your key".
- A hint on Home: the Bombe needs a crib of about 15 letters from your secret. The R4a tests
  showed this: with a 15-letter crib, 14 of 20 random keys gave 100 stops or fewer; with 10
  letters, none did.

### Slow step mode

- "Watch one test slowly" on `/bombe` runs one test with Step, Back and Play, as in the simulator.
- Each step has one sentence: the test current enters the center letter; it goes through one link;
  the diagonal board adds the mirror wire; the test ends with "all 26 wires lit: no stop" or "Stop".
- With fewer than 26 wires lit, the test still tries each guess for the center letter's partner, as
  the search does. If every guess gives a letter two partners, the last step says "not a stop".
- The drum wall and the menu drawing mark the link in use.
- A test without a stop takes 286 to 445 steps; a stop takes about 18. So "Watch one test slowly"
  opens on the first stop of the last search, if there is one.
- If no search has run yet, and the practice message is loaded with its crib at its place, it opens
  on the practice key: rotors II III V, start Q K A. Otherwise it opens on the rotor order and start
  on the drum wall.
- "Skip to the end" sits next to Step, Back and Play. It jumps to the last step and pauses.

## 5. R4c: history, the film, and Barbarossa

- **History section** under the Bombe lab, in the same place as the messages under the Enigma lab.
  Each fact links to its source. Topics: Rejewski's Polish *bomba* (1938); the Polish work shared
  with Britain (July 1939); Turing's design (1939); Welchman's diagonal board; the first Bombe,
  "Victory" (March 1940).
- **Film box** in the same section: "The Imitation Game (2014), a drama with Benedict Cumberbatch as
  Alan Turing." One or two sentences say what the film changes, for example that Turing did not build the
  Bombe alone, and that the film calls the machine "Christopher".
- **Barbarossa.** "Break part 1 with the Bombe" fills the real secret letters and a crib from the
  known German text.

## 6. Tests and checks

The same checks as R3, for each PR: Vitest, Playwright in 5 languages and at phone sizes, axe with 0
violations in light and dark mode, and Lighthouse on a phone setting (accessibility 100, performance
95 or more). The full search is too slow for Playwright. Playwright runs a search limited to 1 rotor
order, through a test-only setting that the page never shows.

## 7. How it ships

| PR | Content |
| --- | --- |
| R4a | This spec, the engine, the worker, the lab, the practice message, the menu link. |
| R4b | The Home random key, the two Home buttons, slow step mode. |
| R4c | The history section with sources, the film box, breaking Barbarossa part 1. |

Each PR updates the README roadmap: the R4 row and a short "What R4 brings". Merging needs
Wellmmer's OK for each PR.

## 8. Open checks

| Claim | Source |
| --- | --- |
| The full search finishes in under 60 s on a desktop. | AI theory, not checked. The R4a plan measures it first. |
| A 15-letter crib with a loop gives few enough stops to read. | AI theory, not checked. The R4a tests count the stops. |
| The Bombe still finds Barbarossa with rings B U L. The search assumes A A A, so the middle rotor may turn at another letter and the rest of the message may not read cleanly. | Checked on 2026-11-23 by `src/bombe/barbarossa.test.ts`. The crib OWAXNORDWESTLXSE at letter 37 gives 1 stop in all 60 rotor orders: the real order II IV V. Its start is A Q P, not B L A, and it has 9 of the 10 plug pairs. A crib from letter 1 with more than 10 letters misses the real key: the middle rotor turns inside it. The stop's key reads 92 of the 174 letters, in blocks of about 15. The crib card says why. |
| The history facts and dates in section 5. | Checked on 2026-11-23 against the sources in `src/bombe/history.ts`. One date differs: Turing designed the Bombe in 1939, not 1940. The page adds exact days. The meeting at Pyry was on 25 and 26 July 1939. Victory started on 14 March 1940 (The National Museum of Computing) or arrived on 18 March (Crypto Museum), so the page gives both. The diagonal board first ran in Agnus, installed on 8 August 1940. Only Wikipedia names Rejewski as the bomba's designer; Crypto Museum says "Polish mathematicians". |
| What the film changes. | Checked on 2026-11-23 against Slate (3 December 2014) and TIME (28 November 2014). Turing did not design the Bombe alone, Welchman does not appear, and the film calls the machine "Christopher". The page does not say the film leaves out the Poles: neither source says that directly. |

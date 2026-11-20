<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/assets/banner-dark.svg">
  <img alt="Computable: Turing's 1936 machine printing 0 1 0 1 on a tape, with the head on the next blank square" src="docs/assets/banner-light.svg">
</picture>

**Computable** is a web app for learning the Turing machine by running one. You write the rules,
press Run, and watch the head read, write and move, one square at a time. Every step is explained
in a plain sentence.

> **Status: releases 1, 2 and 3 are live at https://computable-lac.vercel.app.** This repo held
> a 2016 capstone project built with jQuery. It is now Computable, built release by release. Release
> 1 is the simulator. Release 2 adds six lessons and a reading guide to Turing's 1936 paper. Release
> 3a adds a working Enigma I, and release 3b adds messages to decrypt and a new Home. Release 3c adds
> a one-rotor cipher to the simulator. The roadmap below lists the rest. The 2016 version stays
> available at the git tag `v1.0-tcc-2016`.

---

## The story it tells

In **1936**, Alan Turing published *On Computable Numbers, with an Application to the
Entscheidungsproblem*. To answer a question about the limits of mathematics, he imagined a person
computing on paper divided into squares, and reduced that person to a machine: a tape, a head, and
a table of rules. That imagined machine is the Turing machine. Nobody built it. It is a model of
what any computer can and cannot do.

In **1940**, Turing and Gordon Welchman designed the **Bombe** at Bletchley Park, building on the
Polish *bomba* of Marian Rejewski. The Bombe was a real electromechanical machine. It searched
Enigma rotor settings against a *crib*, a guessed piece of the message such as `WETTERVORHERSAGE`
("weather forecast").

The two are often mixed up. Computable keeps them apart and shows how they connect: you will
encrypt a message on a working Enigma, break it with the Bombe, and then learn why a Turing
machine could do the same work.

## Roadmap

| Release | What you get | Status |
| --- | --- | --- |
| **R1** | The simulator, the guided tour, 5 languages, light and dark themes, About, Support the dev | Live. Support the dev shows its payment links once they are set. |
| **R2a** | The Learn page, lesson 1 (intuition) and lesson 2 (the formal definition), quizzes, and progress saved in your browser | Live |
| **R2b** | Lessons 3 to 6: the universal machine, the halting problem, the Entscheidungsproblem, Church–Turing | Live: lessons 3 to 6 |
| **R2c** | Turing's 1936 paper, read alongside a running tape | Live |
| **R3** | Enigma lab: a working Enigma I with plugboard, real and practice messages | Live: the lab (R3a), messages and the new Home (R3b), and a one-rotor machine in the simulator (R3c) |
| **R4** | Bombe lab: break your own Enigma message with a crib and a wall of drums | Planned |
| **R5** | The naval Enigma M4, then optional accounts | Planned |

## What R1 brings

- **A tape you can watch.** The head carries its current state. A sentence under the tape explains
  each step: *"In q1 reading 1: write 0, move left, go to q1."*
- **Rules, diagram and tape stay linked.** The rule in use lights up in the table, on the state
  diagram, and at the head at the same time.
- **Run, Step, and Step back.** Go backwards through a run. A step limit catches machines that
  never stop.
- **Two notations.** Modern rules (write, move, next state) and Turing's own 1936 notation, with his
  first machine as a built-in example.
- **One-sided or two-way tape**, chosen per machine.
- **Save and share.** Machines save in your browser, download as JSON, and share as a link.
  A link asks before it replaces a machine you built. Machines from the 2016 version import directly.
- **A guided tour** that asks you to press Step, not just read about it.
- **Keyboard first.** `Space` runs, `→` steps, `←` steps back, `?` lists every shortcut.
- **English, Português (Brasil), Español, Français, Deutsch.** The app picks your browser's
  language and lets you switch back.
- **Squared paper by day, night paper by night.** Follows your system theme, and a switch in the
  menu overrides it.
- **No accounts, no ads.** The site counts visits with Vercel Web Analytics, which sets no cookies.
  The only cookie keeps your language. The Privacy page lists what is counted.

## What R2a brings

- **A Learn page.** It lists the lessons in order, with the reading time and your quiz score.
- **Machines inside the lessons.** Small simulators sit between the paragraphs. Press Step, Run or
  Reset, or open the machine in the full simulator with one click.
- **Lesson 1, "Intuition".** How Turing turned a person who computes with a pencil into a machine.
  It runs Turing's first machine and a machine that adds 1 to a binary number.
- **Lesson 2, "The formal definition".** The seven parts of a Turing machine in Sipser's textbook.
  Each part points to the place in the simulator that holds it. The lesson also says where the
  simulator differs from the book. It runs a machine that checks palindromes.
- **A quiz at the end of each lesson.** Every answer says why it is right or wrong. Your best score
  stays in your browser only, and "Reset my progress" clears it.
- **All 5 languages.** The Spanish, French and German lesson texts are AI translations, marked as
  such on every page.
- **Sources for every lesson.** Each lesson lists the books and papers it draws on. Each textbook links
  to the publisher's page for its edition. Hilbert and Ackermann's 1928 book links to its Open
  Library page. Turing's and Church's papers link to their DOIs. The texts are under
  CC BY 4.0.

## What R2b brings

- **Lesson 3, "The universal machine".** Turing wrote a whole machine as one line of letters, its
  standard description. A table shows his first machine, its standard description and its
  description number. Move to a row, and its part of both is marked. The strings match page 241 of
  the paper.
- **Lesson 4, "The halting problem".** One machine stops and one runs forever. The lesson explains
  why no machine can tell which, for every machine. It shows the diagonal argument step by step,
  with tables. It also says what Turing himself proved, and how that differs from today's form.
- **Lesson 5, "The Entscheidungsproblem".** Hilbert and Ackermann asked for one method that decides,
  for every formula of logic, whether it is valid. Turing asks whether it can be proved. For this
  logic, the two questions come to the same thing (Gödel, 1930). The lesson gives Turing's answer,
  no, in five steps. His proof uses the "ever prints 0" result of lesson 4. Church also answered no,
  in 1936.
- **Lesson 6, "The Church–Turing thesis".** What a person can compute by following a fixed method, a
  Turing machine can compute. The lesson explains why this is a thesis and not a theorem. Turing's
  appendix shows that his computable sequences and Church's λ-definable ones are the same.
- **Quotes from the paper, with page numbers.** They stay in Turing's English. The other languages
  add a translation next to them.

## What R2c brings

- **A reading guide to Turing's 1936 paper.** One block for each part: sections 1 to 11, the
  appendix and Turing's later correction. Each block gives the pages in the journal and a short
  summary. It links to the lessons that explain it, where there is one: 10 of the 13 blocks have one.
- **Short quotes, not the paper.** Each part has at most one quote, word for word, with its page.
  The quotes stay in Turing's English, and the other languages add a translation. The page links to
  the paper by its DOI.
- **A tape that moves as you read.** Turing's first machine runs at the top of the screen. Each part
  you reach moves it one step, and scrolling back moves it back. With reduced motion, Step and Reset
  buttons move it instead.
- **On the Learn page, after lesson 6.** The guide has no quiz.

## What R3 brings

- **A working Enigma I at `/enigma`.** Type on your own keyboard or tap the keys on the screen. A
  lamp lights the secret letter. The menu's Enigma item opens it.
- **The real parts.** Rotors I to VIII, reflectors B and C, ring settings and up to 13 plug pairs.
  The rotors turn as on the real machine, with the double step of the middle rotor. The wirings were
  checked against two published tables.
- **Settings you can see.** One line shows the rotors, rings, plug pairs and reflector. A dialog
  changes them. Tap 2 letters to join a plug pair.
- **Decrypting in one click.** "Back to start" turns the rotors back. Type the lit letters, and the
  lamps show the message again. Backspace takes back the last letter, which the real machine could
  not do.
- **The path of the current.** A drawing shows the letter after each part, out to the reflector and
  back. It shows why a letter never lights itself.
- **Messages to decrypt.** Under the lab, 3 practice messages in your language get harder one step
  at a time. Two real wartime messages follow: Operation Barbarossa (1941) and the Scharnhorst's last
  message (1943). One button loads a message into the machine, and "Check my answer" checks it. Every
  real setting and letter was checked against published sources, and the page links them.
- **A secret on Home.** Home starts with a small Enigma: type a secret message and see its secret
  letters. The secret stays in your browser only. "Forget my secret" deletes it.
- **Clearer to use.** A blinking caret in "You typed" shows that the lab listens to your keyboard.
  On every page, buttons show the hand cursor, and framed buttons lift a little under the mouse.
- **A one-rotor machine in the simulator.** The example "One-rotor cipher" is a Turing machine on
  the letters A B C D. Its states p0 to p3 are the 4 rotor positions, so 16 rules do the work of one
  rotor, and 4 more rules stop it. A note says why 26 letters would need 26 × 26 = 676 rules, and
  links to the lab.

## The machine format

A machine is a small JSON file. This one adds 1 to a binary number:

```json
{
  "format": "computable/machine@1",
  "name": "Binary +1",
  "tape": "two-way",
  "blank": "_",
  "start": "q0",
  "accept": ["qA"],
  "reject": ["qR"],
  "input": "1011",
  "rules": [
    { "state": "q0", "read": "0", "write": "0", "move": "R", "next": "q0" },
    { "state": "q0", "read": "1", "write": "1", "move": "R", "next": "q0" },
    { "state": "q0", "read": "_", "write": "_", "move": "L", "next": "q1" },
    { "state": "q1", "read": "1", "write": "0", "move": "L", "next": "q1" },
    { "state": "q1", "read": "0", "write": "1", "move": "S", "next": "qA" },
    { "state": "q1", "read": "_", "write": "1", "move": "S", "next": "qA" }
  ]
}
```

Input `1011` ends as `1100` and the machine accepts.

## Built with

Next.js and TypeScript, Tailwind CSS, next-intl for languages, MDX for the lessons, React Flow
for the state diagram, and Zustand for the simulator's state. The Turing machine logic lives in plain TypeScript with no
UI code, tested with Vitest and Playwright. Hosted on Vercel, with Vercel Web Analytics.

## Where this came from

Computable started as the capstone project *Simulador de Máquina de Turing: Uma Aplicação Web para
o Aprendizado*, by **Wellmmer Lucas de Oliveira Pinto**, Bachelor of Computer Science at **UNASP**,
2016, advised by **Prof. Laercio Martins Carpes**.

In that study, 29 people used the 2016 app and answered a survey. 41.4% knew nothing about Turing
or his machine before. Afterwards, 79.3% reported they had learned something about it. The paper's
own list of future work (step back, a state diagram, a "stay" move, saving machines, better
animation) is the starting point for R1.

## Support

Computable is free and has no ads. The "Buy the dev a coffee" page links to ways to give. Each
payment link shows there once its handle is set in `src/config/support.ts`.

## License

The code is under the [MIT License](LICENSE). Lesson texts and other written content are under
[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/) (see
[`content/lessons/LICENSE`](content/lessons/LICENSE)).

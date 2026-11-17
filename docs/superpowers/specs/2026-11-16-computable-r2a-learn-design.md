# Computable R2a: the Learn page, lessons 1 and 2, quizzes

Date: 2026-11-16. Status: approved in brainstorming, waiting for Wellmmer's review of this file.
Open to other ideas.

Release 2 of the R1 spec (`2026-11-11-computable-r1-design.md`, section 2) is split into 3 parts.
Each part goes live on its own:

| Part | Content |
| --- | --- |
| **R2a** | The Learn page, the lesson page, the mini-simulator, quizzes, progress saved in the browser, lesson 1 (intuition) and lesson 2 (the formal definition). This spec. |
| R2b | The Entscheidungsproblem, the halting problem, Church–Turing, the universal machine. |
| R2c | "Read Turing's 1936 paper", with a scroll-driven tape. |

## 1. Decisions

| Topic | Decision |
| --- | --- |
| Machines in a lesson | A live mini-simulator inside the text, with Step, Run/Pause and Reset. No editing. |
| Quiz | Multiple choice. Each answer shows why it is right or wrong. |
| Languages | All 5 languages go live together. Wellmmer reviews EN and PT-BR. ES, FR and DE are AI-translated and show the existing machine-translation note. |
| Lesson format | MDX files, one per lesson per language. |
| Slugs | English in every language: `/pt-br/learn/intuition`, like `/pt-br/simulator` today. |
| Lesson texts | Claude drafts them from the TCC and cited sources. Wellmmer reviews them on the Vercel preview link before merge. |
| Sources | Cited, never copied: Turing (1936), Sipser, Hopcroft–Motwani–Ullman, the 2016 TCC. |
| License | CC BY 4.0 for lesson texts, in `content/lessons/LICENSE` and on each lesson page. |

## 2. What the visitor sees

### 2.1 Learn page, `/[locale]/learn`

- A list of the live lessons, in order. Each row shows the number, the title, a one-sentence
  summary, the reading time and the quiz status: "Not started" or "Quiz: 4 of 5".
- One line says that more lessons come later.
- A "Reset my progress" button. It asks for confirmation first.
- The menu item "Learn" loses its "coming soon" label and links to this page.

### 2.2 Lesson page, `/[locale]/learn/[slug]`

- Squared paper. The text column is about 68 characters wide.
- Header: "Lesson 1 of 2", the title and the reading time.
- Body: prose, with mini-simulators between paragraphs.
- End, in this order: the quiz, a "Sources" list, the CC BY 4.0 note, then links to the previous
  and the next lesson.

### 2.3 Mini-simulator, `<Machine>`

- Shows the tape, the step sentence, and the buttons Step, Run/Pause and Reset. The visitor cannot
  edit the machine.
- It never runs by itself. Reduced motion therefore needs no special case.
- "Open in Simulator" opens the machine through the existing share link (`#m=`).
- Each instance has its own store with `createMemoryStorage()`, like `HomeMachine`. The machine the
  visitor saved in the simulator stays untouched.

### 2.4 Quiz, `<Quiz>`

- 4 or 5 questions per lesson, with 3 or 4 options each, shown as a radio group.
- "Check" shows whether the chosen option is right, and why.
- The score shows after the last question. "Try again" clears the answers.
- Finishing the quiz saves the result (section 4).

### 2.5 Lesson content

1. **Intuition** (`intuition`). Turing's 1936 "human computer": a person with a pencil, a strip of
   squared paper and a few states of mind. Mini-simulators: Turing's first machine, then binary
   plus one.
2. **The formal definition** (`formal-definition`). Sipser's 7-tuple (Q, Σ, Γ, δ, q0, q_accept,
   q_reject). Each part points at the matching column of the simulator's rule table.
   Mini-simulator: palindrome.

## 3. Files

```
content/lessons/
  LICENSE                          CC BY 4.0
  intuition/
    en.mdx pt-BR.mdx es.mdx fr.mdx de.mdx
    quiz.ts                        question ids, option ids and the right option, once
    quiz.en.json … quiz.de.json    question, option and explanation texts
    machines/*.json                machines that only this lesson uses
  formal-definition/               same shape
src/learn/
  lessons.ts                       the lessons, in order
  LessonMachine.tsx                the <Machine> mini-simulator
  Quiz.tsx                         the <Quiz>
  progress-storage.ts              quiz results in the browser
src/app/[locale]/learn/page.tsx
src/app/[locale]/learn/[slug]/page.tsx
```

- `lessons.ts` imports all 10 MDX files and all 10 quiz text files by name. A missing language file
  therefore fails `next build`, as `src/i18n/messages-check.ts` does for messages.
- The right answers live only in `quiz.ts`. Translations hold text only, so a translation cannot
  change which answer is right.
- Each MDX file exports `meta` with the title, the summary and the reading time. The Learn page and
  the page `<title>` read it.
- The pages are static. `generateStaticParams` returns 5 languages × 2 lessons.
- Every lesson machine goes through `parseMachine`.
- Interface texts such as "Check", "Try again" and "Lesson 1 of 2" go into `messages/*.json`.
- MDX files hold only headings, paragraphs, lists, links, `<Machine>` and `<Quiz>`. No raw HTML, so
  a translator touches only text.

## 4. Progress in the browser

- Key `computable.progress`. For each lesson: the best score, the number of questions, and the date
  of the last finished quiz.
- `ProgressStorage` follows the `MachineStorage` pattern in `src/storage/machine-storage.ts`. It
  falls back to memory when the browser blocks storage. Accounts in R5 can sit behind the same
  interface.
- Data that does not parse reads as "no progress". It never breaks the page.
- The Privacy page gets one sentence, in all 5 languages: quiz results stay in this browser only.
- Quizzes send no analytics events. Analytics counts page views only.

## 5. Tests and checks

- Vitest: `ProgressStorage` (blocked storage, bad data, reset), `Quiz` (check, explanation, score,
  try again, saved result), `LessonMachine` (step, run, reset, share link).
- Vitest: every `quiz.<locale>.json` has the same question and option ids as `quiz.ts`.
- Vitest: every lesson machine parses.
- Playwright: the Learn page in all 5 languages. One lesson end to end: run a machine, answer the
  quiz, see the score on the Learn page. The quiz with the keyboard only.
- axe finds 0 violations on the Learn page and on both lessons.
- Lighthouse on a phone setting: accessibility 100, performance 95 or more.

## 6. How it ships

| PR | Content |
| --- | --- |
| R2a-1 | MDX setup, the Learn page, the lesson page, `<Machine>`, `<Quiz>`, progress, the menu link, the Privacy sentence, lesson 1 in 5 languages. |
| R2a-2 | Lesson 2 in 5 languages, and the fixes from Wellmmer's review of lesson 1. |

Each PR updates the README: the R2 roadmap row splits into R2a, R2b and R2c with their status, and
a "What R2a brings" section describes what is live.

Not in R2a: lessons 3 to 6 (R2b), the paper reader (R2c), editing machines inside a lesson, and
accounts.

## 7. Open checks

| Claim | Source |
| --- | --- |
| `@next/mdx` works with Turbopack in Next 16.4, if remark plugins are given by name. | From my own knowledge. The plan agent proves it in its scratch clone first. If it fails, the lessons become TSX files, one per language. |
| Vercel Web Analytics custom events need the Pro plan. | From my own knowledge. Matters only if quiz events are wanted later. |
| Short quotes from Turing (1936) are fine to use. | From my own knowledge. R2c, which quotes the paper at length, checks the public-domain claim in the R1 spec, section 11. |

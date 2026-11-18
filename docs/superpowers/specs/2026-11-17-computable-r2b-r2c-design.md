# Computable R2b and R2c: lessons 3 to 6, and the reading guide to Turing's paper

Date: 2026-11-17. Status: drafted after Wellmmer's answers in chat, waiting for his review of this file.
Open to other ideas.

R2b and R2c reuse everything R2a built: the lesson page, `<Machine>`, `<Quiz>`, progress, MDX in 5
languages, CC BY 4.0, Sources lists with links. This spec covers only what is new.

## 1. Decisions

| Topic | Decision |
| --- | --- |
| Lesson order | Turing's order: 3 universal machine, 4 halting problem, 5 Entscheidungsproblem, 6 Church–Turing. Each lesson needs the one before it. Wellmmer chose this on 2026-11-17. |
| How R2b ships | 2 PRs. R2b-1: lessons 3 and 4. R2b-2: lessons 5 and 6. |
| R2c format | A reading guide, not the full text. Plain summaries, short quotes, and a link to the original. Wellmmer chose this on 2026-11-17. |
| Languages | All 5, as in R2a. Wellmmer reviews EN and PT-BR on the preview link. Quotes from the paper stay in Turing's English, with a translation next to them in the other languages. |
| Sources | Every source in a Sources list has a link: a DOI, the publisher's page, or the Open Library ISBN page. |

## 2. R2b lessons

| # | Slug | Content | Interactive part |
| --- | --- | --- | --- |
| 3 | `universal-machine` | A machine's rule table can be written as a string on the tape. One machine, the universal machine, reads that string and does what the described machine does. Turing's "standard description" and "description number" (paper, section 5). | New `<Encoding>`: Turing's first machine as a rule table, as its standard description (`DADDCRDAA;…`) and as its description number. Focusing a row of the table highlights its part of the string. |
| 4 | `halting-problem` | No machine can decide, for every machine and input, whether it stops. The diagonal argument, step by step. Turing proved two close relatives (section 8, pp. 246–248): no machine decides if a machine is "circle-free", and no machine decides if a machine ever prints 0. Later authors stated the "stops" form used today; the lesson names nobody until a book confirms who. The lesson says which is which. | Two `<Machine>`s: one that stops, one that runs forever. |
| 5 | `entscheidungsproblem` | Hilbert and Ackermann's question (1928): is there a method that decides if any statement of first-order logic is provable? Church (in a short 1936 note) and Turing both answered no. Turing's route goes through the "ever prints 0" result of lesson 4 (section 11, p. 262). | Quiz only. |
| 6 | `church-turing` | The thesis: what a person can compute by a fixed method, a Turing machine can compute. Why it is a thesis and not a theorem. Turing's appendix (p. 263) shows that his computable sequences and Church's λ-definable ones are the same. | Quiz only. |

- Each lesson has a quiz of 4 or 5 questions, like lessons 1 and 2.
- `<Encoding>` gets its data from the rule table of Turing's first machine. A Vitest test checks that the
  standard description and the description number match the strings printed in section 5 of the paper.
- MDX may now hold markdown tables, for the diagonal argument. Still no raw HTML.
- New sources, each with a link: Hilbert and Ackermann (1928), Church's 1936 note in the *Journal of
  Symbolic Logic* (DOI 10.2307/2269326), Turing's 1937 correction (DOI 10.1112/plms/s2-43.6.544),
  Petzold, *The Annotated Turing* (2008, ISBN 978-0-470-22905-7).

## 3. R2c: the reading guide, `/[locale]/learn/paper`

- The Learn page lists it after lesson 6, as "Read Turing's 1936 paper". It has no quiz.
- One block per part of the paper: sections 1 to 11, the appendix, and the 1937 correction. Each block
  holds the page numbers in the *Proceedings of the London Mathematical Society*, a plain summary of 2
  to 4 sentences, at most one short quote, and links to the lessons that explain it.
- **The scroll-driven tape.** A tape stays on screen while the visitor reads. It runs Turing's first
  machine. Each block the visitor reaches moves the machine one step. With reduced motion, or in a
  browser that cannot watch the blocks, the tape shows Step and Reset buttons instead. Without script,
  the tape shows its first step and a short note that it needs JavaScript to move, with no buttons.
- At the top: the DOI link `https://doi.org/10.1112/plms/s2-42.1.230`, and one line that says the
  guide quotes the paper and does not reproduce it.
- R2c ships as 1 PR.

## 4. Tests and checks

The same checks as R2a, for each new page: Vitest, Playwright in 5 languages, axe with 0 violations,
and Lighthouse on a phone setting (accessibility 100, performance 95 or more). For R2c, Playwright also
checks that scrolling moves the tape, and that reduced motion shows the buttons.

## 5. How it ships

| PR | Content |
| --- | --- |
| R2b-1 | This spec, `<Encoding>`, lessons 3 and 4 in 5 languages. |
| R2b-2 | Lessons 5 and 6 in 5 languages, and fixes from Wellmmer's review of lessons 3 and 4. |
| R2c | The reading guide and the scroll-driven tape in 5 languages. |

Each PR updates the README roadmap: the R2b and R2c rows, and a short "What R2b brings" and "What R2c
brings".

## 6. Open checks

| Claim | Source |
| --- | --- |
| The paper is public domain in the UK since 2025. In the US it is probably under copyright until the end of 2031 or 2032. | Checked: Cornell's public-domain chart, and HathiTrust marks volume 42 as in copyright. The year depends on whether the issue counts as 1936 or 1937. This is why R2c is a guide with short quotes. |
| Section 5 of the paper prints the standard description `DADDCRDAA;DAADDRDAAA;DAAADDCCRDAAAA;DAAAADDRDA;` and the description number `31332531173113353111731113322531111731111335317` for the first machine. | Checked: scan of p. 241. |
| Turing's section 8 proves undecidability for "circle-free" and for "ever prints 0", not the halting problem as books state it today. | Checked: scan of pp. 246–248. Who first stated today's form: Wikipedia only, not checked in a book. |

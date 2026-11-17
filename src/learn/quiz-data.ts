import { z } from 'zod';

/**
 * One question of a lesson's quiz without its texts: the ids and the right option (spec 3). Each
 * lesson's quiz.ts holds these once, so a translation can never change which answer is right.
 */
export interface QuizKeyQuestion {
  id: string;
  options: readonly string[];
  answer: string;
}

export type QuizKey = readonly QuizKeyQuestion[];

export interface QuizOption {
  id: string;
  text: string;
  /** Why this option is right or wrong. The quiz shows it after Check. */
  why: string;
}

/** A question as the quiz shows it, in one language. */
export interface QuizQuestion {
  id: string;
  text: string;
  options: QuizOption[];
  answer: string;
}

/** The shape of quiz.<locale>.json: texts only, by question id and option id. */
const textsSchema = z.strictObject({
  questions: z.record(
    z.string(),
    z.strictObject({
      text: z.string().min(1),
      options: z.record(z.string(), z.strictObject({ text: z.string().min(1), why: z.string().min(1) })),
    }),
  ),
});

/**
 * Joins a quiz key with the texts of one language, in the order of the key. Throws when they do not
 * match, naming `source`: lessons.ts calls this when the app builds, so a broken translation fails the build.
 */
export function buildQuiz(key: QuizKey, texts: unknown, source: string): QuizQuestion[] {
  const parsed = textsSchema.safeParse(texts);
  if (!parsed.success) throw new Error(`${source}: ${parsed.error.issues.map((issue) => issue.path.join('.')).join(', ')}`);
  const { questions } = parsed.data;

  for (const id of Object.keys(questions)) {
    if (!key.some((question) => question.id === id)) throw new Error(`${source}: question "${id}" is not in quiz.ts`);
  }
  return key.map(({ id, options, answer }) => {
    if (!options.includes(answer)) {
      throw new Error(`quiz.ts: the answer of question "${id}" is "${answer}", which is not one of its options`);
    }
    const question = questions[id];
    if (question === undefined) throw new Error(`${source}: question "${id}" is missing`);
    const textIds = Object.keys(question.options);
    if (textIds.length !== options.length || options.some((option) => !textIds.includes(option))) {
      throw new Error(`${source}: question "${id}" has the options ${textIds.join(', ')}, but quiz.ts has ${options.join(', ')}`);
    }
    return {
      id,
      text: question.text,
      answer,
      options: options.map((option) => ({ id: option, ...question.options[option] })),
    };
  });
}

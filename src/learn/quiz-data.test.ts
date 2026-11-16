import { describe, expect, it } from 'vitest';
import { buildQuiz, type QuizKey } from './quiz-data';

const KEY: QuizKey = [
  { id: 'tape', options: ['paper', 'pencil', 'mind'], answer: 'paper' },
  { id: 'stops', options: ['never', 'four'], answer: 'never' },
];

const option = (text: string) => ({ text, why: `Because of ${text}.` });

/** A copy of `record` without the entry `key`. */
const without = <T,>(record: Record<string, T>, key: string) => Object.fromEntries(Object.entries(record).filter(([id]) => id !== key));

function texts() {
  return {
    questions: {
      tape: { text: 'What became the tape?', options: { paper: option('Paper'), pencil: option('Pencil'), mind: option('Mind') } },
      stops: { text: 'When does it stop?', options: { never: option('Never'), four: option('After four steps') } },
    },
  };
}

describe('buildQuiz (spec 3: the right answers live only in quiz.ts)', () => {
  it('joins the ids and the right answers with the texts of one language, in the order of quiz.ts', () => {
    expect(buildQuiz(KEY, texts(), 'quiz.en.json')).toEqual([
      {
        id: 'tape',
        text: 'What became the tape?',
        answer: 'paper',
        options: [
          { id: 'paper', text: 'Paper', why: 'Because of Paper.' },
          { id: 'pencil', text: 'Pencil', why: 'Because of Pencil.' },
          { id: 'mind', text: 'Mind', why: 'Because of Mind.' },
        ],
      },
      {
        id: 'stops',
        text: 'When does it stop?',
        answer: 'never',
        options: [
          { id: 'never', text: 'Never', why: 'Because of Never.' },
          { id: 'four', text: 'After four steps', why: 'Because of After four steps.' },
        ],
      },
    ]);
  });

  it('refuses texts without a question of quiz.ts', () => {
    const questions = without(texts().questions, 'stops');
    expect(() => buildQuiz(KEY, { questions }, 'quiz.de.json')).toThrow('quiz.de.json: question "stops" is missing');
  });

  it('refuses a question that quiz.ts does not have', () => {
    const data = texts();
    const questions = { ...data.questions, extra: data.questions.stops };
    expect(() => buildQuiz(KEY, { questions }, 'quiz.de.json')).toThrow('quiz.de.json: question "extra" is not in quiz.ts');
  });

  it('refuses texts without an option of quiz.ts, or with an extra option', () => {
    const missing = texts();
    const options = without(missing.questions.stops.options, 'four');
    expect(() => buildQuiz(KEY, { questions: { ...missing.questions, stops: { ...missing.questions.stops, options } } }, 'quiz.fr.json')).toThrow(
      'quiz.fr.json: question "stops" has the options never, but quiz.ts has never, four',
    );
    const extra = texts();
    extra.questions.tape.options = { ...extra.questions.tape.options, ...{ eraser: option('Eraser') } };
    expect(() => buildQuiz(KEY, extra, 'quiz.fr.json')).toThrow(
      'quiz.fr.json: question "tape" has the options paper, pencil, mind, eraser, but quiz.ts has paper, pencil, mind',
    );
  });

  it('refuses texts of the wrong shape, such as an option without an explanation', () => {
    const data = texts();
    const broken = { questions: { ...data.questions, tape: { ...data.questions.tape, options: { ...data.questions.tape.options, mind: { text: 'Mind' } } } } };
    expect(() => buildQuiz(KEY, broken, 'quiz.es.json')).toThrow('quiz.es.json: questions.tape.options.mind.why');
  });

  it('refuses a key whose right answer is not one of its options', () => {
    const key: QuizKey = [{ id: 'tape', options: ['paper', 'pencil', 'mind'], answer: 'eraser' }];
    const questions = without(texts().questions, 'stops');
    expect(() => buildQuiz(key, { questions }, 'quiz.en.json')).toThrow('quiz.ts: the answer of question "tape" is "eraser", which is not one of its options');
  });
});

import type { QuizKey } from '@/learn/quiz-data';

/** The right answers of lesson 4's quiz (spec R2b 2). The texts live in quiz.<locale>.json. */
export const quiz: QuizKey = [
  { id: 'step-limit', options: ['never-stops', 'not-yet', 'error'], answer: 'not-yet' },
  { id: 'decider', options: ['run-and-wait', 'some-machines', 'always-answer', 'print-zero'], answer: 'always-answer' },
  { id: 'diagonal', options: ['contradiction', 'stops', 'forever'], answer: 'contradiction' },
  { id: 'turing-proved', options: ['stops', 'every-machine-stops', 'circle-free-and-zero'], answer: 'circle-free-and-zero' },
  { id: 'circular', options: ['circular', 'circle-free', 'universal'], answer: 'circular' },
];

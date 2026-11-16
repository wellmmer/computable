import type { QuizKey } from '@/learn/quiz-data';

/** The right answers of lesson 1's quiz (spec 3). The texts live in quiz.<locale>.json. */
export const quiz: QuizKey = [
  { id: 'computer', options: ['electronic', 'person', 'tables'], answer: 'person' },
  { id: 'tape', options: ['pencil', 'mind', 'paper'], answer: 'paper' },
  { id: 'state', options: ['memory', 'cell', 'whole-tape', 'rules'], answer: 'memory' },
  { id: 'first-machine', options: ['four-steps', 'end-of-tape', 'never'], answer: 'never' },
  { id: 'carry', options: ['write-one-stop', 'write-zero-left', 'move-right'], answer: 'write-zero-left' },
];

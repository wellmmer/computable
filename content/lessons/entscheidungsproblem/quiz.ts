import type { QuizKey } from '@/learn/quiz-data';

/** The right answers of lesson 5's quiz (spec R2b 2). The texts live in quiz.<locale>.json. */
export const quiz: QuizKey = [
  { id: 'question', options: ['prove-every-formula', 'fast-computer', 'decide-provable'], answer: 'decide-provable' },
  { id: 'list-of-proofs', options: ['never-says-no', 'misses-some', 'too-long'], answer: 'never-says-no' },
  { id: 'un-m', options: ['stops', 'zero-on-tape', 'circle-free'], answer: 'zero-on-tape' },
  { id: 'route', options: ['every-formula-provable', 'nothing', 'decides-zero'], answer: 'decides-zero' },
  { id: 'church', options: ['hilbert', 'church', 'nobody'], answer: 'church' },
];

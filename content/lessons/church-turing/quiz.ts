import type { QuizKey } from '@/learn/quiz-data';

/** The right answers of lesson 6's quiz (spec R2b 2). The texts live in quiz.<locale>.json. */
export const quiz: QuizKey = [
  { id: 'thesis', options: ['every-problem', 'person-and-machine', 'speed'], answer: 'person-and-machine' },
  { id: 'why-thesis', options: ['believed-false', 'proof-too-long', 'no-exact-definition'], answer: 'no-exact-definition' },
  { id: 'appendix', options: ['same-sequences', 'church-wrong', 'thesis-proved'], answer: 'same-sequences' },
  { id: 'lambda', options: ['circle-free-machine', 'one-formula', 'no-rule'], answer: 'one-formula' },
  { id: 'no-method', options: ['more-steps', 'appendix-alone', 'thesis'], answer: 'thesis' },
];

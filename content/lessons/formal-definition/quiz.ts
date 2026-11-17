import type { QuizKey } from '@/learn/quiz-data';

/** The right answers of lesson 2's quiz (spec 3). The texts live in quiz.<locale>.json. */
export const quiz: QuizKey = [
  { id: 'delta', options: ['tape', 'rule-table', 'start-state'], answer: 'rule-table' },
  { id: 'blank', options: ['sigma', 'neither', 'gamma'], answer: 'gamma' },
  { id: 'stay', options: ['same-work', 'more-power', 'two-cells'], answer: 'same-work' },
  { id: 'no-rule', options: ['accepts', 'waits', 'error', 'rejects'], answer: 'rejects' },
  { id: 'accept-states', options: ['any', 'exactly-one', 'none'], answer: 'exactly-one' },
];

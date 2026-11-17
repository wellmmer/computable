import type { QuizKey } from '@/learn/quiz-data';

/** The right answers of lesson 3's quiz (spec R2b 2). The texts live in quiz.<locale>.json. */
export const quiz: QuizKey = [
  { id: 'standard-description', options: ['steps', 'rules-as-letters', 'tape'], answer: 'rules-as-letters' },
  { id: 'state-letters', options: ['dccc', 'd3', 'daaa', 'aaa'], answer: 'daaa' },
  { id: 'description-number', options: ['digits', 'count', 'sum'], answer: 'digits' },
  { id: 'universal-tape', options: ['description', 'nothing', 'own-table'], answer: 'description' },
  { id: 'many-numbers', options: ['exactly-one', 'only-if-stops', 'yes'], answer: 'yes' },
];

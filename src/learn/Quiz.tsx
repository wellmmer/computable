'use client';

import { Check, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import { sectionTitle, sheet } from '@/shell/page-styles';
import { saveQuizResult } from './progress';
import type { QuizQuestion } from './quiz-data';

interface QuestionProps {
  question: QuizQuestion;
  number: number;
  total: number;
  /** The radio group's name: unique on the page. */
  name: string;
  chosen: string | undefined;
  checked: boolean;
  onChoose: (option: string) => void;
  onCheck: () => void;
}

/** One question: a radio group with its legend, the Check button, then whether the answer is right, and why. */
function Question({ question, number, total, name, chosen, checked, onChoose, onCheck }: QuestionProps) {
  const t = useTranslations('learn.quiz');
  const feedback = useRef<HTMLParagraphElement>(null);
  const chosenOption = question.options.find((option) => option.id === chosen);
  const right = chosen === question.answer;

  // Check disappears once pressed. The focus moves to the answer, so a screen reader reads it at once
  // and Tab goes on to the next question.
  useEffect(() => {
    if (checked) feedback.current?.focus();
  }, [checked]);

  return (
    <fieldset className="mt-8 first:mt-6">
      <legend>
        <span className="block text-sm text-muted">{t('number', { number, total })}</span>
        <span className="mt-1 block text-[17px]/snug font-semibold">{question.text}</span>
      </legend>
      <div className="mt-3 space-y-2">
        {question.options.map((option) => {
          const isAnswer = checked && option.id === question.answer;
          const isWrongChoice = checked && option.id === chosen && !right;
          return (
            <label
              key={option.id}
              className={`flex items-start gap-3 border-2 px-3 py-2 ${checked ? '' : 'cursor-pointer'} ${
                isAnswer ? 'border-ink' : isWrongChoice ? 'border-pencil' : 'border-soft'
              }`}
            >
              <input
                type="radio"
                name={name}
                value={option.id}
                checked={chosen === option.id}
                disabled={checked}
                onChange={() => onChoose(option.id)}
                className="mt-1 size-4 shrink-0 accent-pencil"
              />
              <span>
                {option.text}
                {/* The space keeps the words apart in the radio's accessible name: "The pencil Your answer". */}
                {(isAnswer || isWrongChoice) && ' '}
                {isAnswer && (
                  <span className="ml-1 inline-flex items-center gap-1 text-sm font-semibold whitespace-nowrap">
                    <Check aria-hidden className="size-4" />
                    {t('rightAnswer')}
                  </span>
                )}
                {isWrongChoice && (
                  <span className="ml-1 inline-flex items-center gap-1 text-sm font-semibold whitespace-nowrap text-pencil">
                    <X aria-hidden className="size-4" />
                    {t('yourAnswer')}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
      {checked && chosenOption !== undefined ? (
        <p ref={feedback} tabIndex={-1} className="mt-3">
          <strong className={right ? 'font-semibold' : 'font-semibold text-pencil'}>{right ? t('right') : t('wrong')}</strong> {chosenOption.why}
        </p>
      ) : (
        <button
          type="button"
          onClick={onCheck}
          disabled={chosen === undefined}
          className="mt-3 border-2 border-ink bg-ink px-4 py-1.5 font-semibold text-paper press disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t('check')}
        </button>
      )}
    </fieldset>
  );
}

/**
 * The quiz at the end of a lesson (spec 2.4). Check shows whether the chosen answer is right, and
 * why. After the last question it shows the score and saves it in the browser; Try again clears the answers.
 */
export function Quiz({ slug, questions }: { slug: string; questions: QuizQuestion[] }) {
  const t = useTranslations('learn.quiz');
  const id = useId();
  const title = useRef<HTMLHeadingElement>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<ReadonlySet<string>>(new Set());

  const total = questions.length;
  const done = checked.size === total;
  const score = questions.filter((question) => answers[question.id] === question.answer).length;

  const check = (questionId: string) => {
    const next = new Set(checked).add(questionId);
    setChecked(next);
    if (next.size === total) saveQuizResult(slug, score, total);
  };

  const tryAgain = () => {
    setAnswers({});
    setChecked(new Set());
    title.current?.focus();
  };

  return (
    <section aria-labelledby={`${id}-title`} className={`mt-12 border-t-4 border-pencil ${sheet}`}>
      <h2 id={`${id}-title`} ref={title} tabIndex={-1} className={sectionTitle}>
        {t('title')}
      </h2>
      <p className="mt-2 text-muted">{t('intro')}</p>
      {questions.map((question, index) => (
        <Question
          key={question.id}
          question={question}
          number={index + 1}
          total={total}
          name={`${id}-${question.id}`}
          chosen={answers[question.id]}
          checked={checked.has(question.id)}
          onChoose={(option) => setAnswers({ ...answers, [question.id]: option })}
          onCheck={() => check(question.id)}
        />
      ))}
      {/* Always in the page, so screen readers announce the score when it appears. */}
      <div role="status" className="mt-8 font-semibold">
        {done && (
          <>
            <p className="font-display text-xl">{t('score', { score, total })}</p>{' '}
            <p className="mt-1 text-sm font-normal text-muted">{t('saved')}</p>
          </>
        )}
      </div>
      {done && (
        <button type="button" onClick={tryAgain} className="mt-3 border-2 border-ink bg-cell px-4 py-1.5 font-semibold text-ink press">
          {t('tryAgain')}
        </button>
      )}
    </section>
  );
}

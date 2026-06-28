import type { KeyboardEvent } from 'react';
import { Card, Text, Heading } from '@radix-ui/themes';
import cn from 'clsx';
import styles from '../DecisionSupport.module.css';

export interface SuggestedQuestion {
  type: 'Technical' | 'Behavioral' | 'Cultural' | 'Role-specific' | 'Leadership' | 'Strategic' | 'Availability';
  question: string;
  reason: string;
}

export interface SuggestionCardProps {
  question: SuggestedQuestion;
  onClick: (question: string) => void;
  onKeyDown: (e: KeyboardEvent, question: string) => void;
}

export function SuggestionCard({ question, onClick, onKeyDown }: SuggestionCardProps) {
  const handleClick = () => onClick(question.question);
  const handleKeyDown = (e: KeyboardEvent) => onKeyDown(e, question.question);

  return (
    <Card
      className={cn(
        styles.questionCard,
        styles[`question-${question.type.toLowerCase()}`]
      )}
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label={`${question.type} question: ${question.question}`}
    >
      <Heading className={styles.questionType} as="h4">
        {question.type}
      </Heading>
      <Text className={styles.questionText}>{question.question}</Text>
      <Text className={styles.questionReason}>Reason: {question.reason}</Text>
      <Text className={styles.copyIndicator}>Click to copy</Text>
    </Card>
  );
}

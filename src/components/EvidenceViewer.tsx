"use client";

import { Box, Flex, Text, Button } from '@radix-ui/themes';
import cn from 'clsx';
import type { Evidence } from './types';
import styles from './ExplainabilityPanel.module.css';

interface EvidenceViewerProps {
  evidence: Evidence[];
  isExpanded: boolean;
}

export function EvidenceViewer({ evidence, isExpanded }: EvidenceViewerProps) {
  if (!isExpanded) return null;

  return (
    <Box className={styles.evidenceContainer}>
      <Flex align="center" justify="between" className={styles.evidenceHeader}>
        <Text className={styles.evidenceTitle}>Supporting Evidence</Text>
        <Button
          variant="soft"
          size="1"
          className={styles.copyButton}
          onClick={() => {
            const text = evidence.map((e) => `[${e.type}] ${e.content}`).join('\n\n');
            void navigator.clipboard.writeText(text);
          }}
        >
          Copy All
        </Button>
      </Flex>

      <Box className={styles.evidenceList}>
        {evidence.map((item) => (
          <Box
            key={item.id}
            className={cn(
              styles.evidenceItem,
              item.highlighted && styles.evidenceItemHighlighted
            )}
          >
            <Flex align="start" gap="2" className={styles.evidenceHeader}>
              <Box className={cn(styles.evidenceDot)} />
              <Text className={styles.evidenceType}>{item.type}</Text>
              {item.relevance !== undefined && (
                <Text className={styles.evidenceRelevance}>
                  Relevance: {item.relevance}%
                </Text>
              )}
            </Flex>

            <Box className={styles.evidenceContent}>
              <pre
                className={styles.codeBlock}
                dangerouslySetInnerHTML={{ __html: highlightKeywords(item.content) }}
              />
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

function highlightKeywords(text: string): string {
  const keywords = ['Python', 'ML', 'AI', 'production', 'deployment', 'Senior', 'Engineer'];
  return text.replace(
    new RegExp(`\\b(${keywords.join('|')})\\b`, 'gi'),
    (match) => `<mark class="${styles.highlight}">${match}</mark>`
  );
}

"use client";

import React, { useState } from 'react';
import { Box, Text } from '@radix-ui/themes';
import styles from './ExplainabilityPanel.module.css';

interface InfoTooltipProps {
  content: string;
  children?: React.ReactNode;
}

export function InfoTooltip({ content, children }: InfoTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <Box style={{ position: 'relative', display: 'inline-flex' }}>
      <Box
        className={styles.icon}
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        role="button"
        tabIndex={0}
        aria-label="Information"
      >
        {children ?? 'ℹ'}
      </Box>

      {isVisible && (
        <Box className={styles.tooltip}>
          <Text className={styles.tooltipContent}>{content}</Text>
        </Box>
      )}
    </Box>
  );
}

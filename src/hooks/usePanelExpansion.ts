"use client";

import { useEffect, useState } from 'react';

export function usePanelExpansion() {
  const [expandedDimensions, setExpandedDimensions] = useState<Set<string>>(new Set());
  const [expandedSignals, setExpandedSignals] = useState<Set<string>>(new Set());

  // Load saved state from localStorage on mount
  useEffect(() => {
    const savedDimensions = localStorage.getItem('explainability_expanded_dimensions');
    const savedSignals = localStorage.getItem('explainability_expanded_signals');

    if (savedDimensions) {
      setExpandedDimensions(new Set(JSON.parse(savedDimensions)));
    }
    if (savedSignals) {
      setExpandedSignals(new Set(JSON.parse(savedSignals)));
    }
  }, []);

  // Save expanded dimensions to localStorage
  useEffect(() => {
    localStorage.setItem('explainability_expanded_dimensions', JSON.stringify(Array.from(expandedDimensions)));
  }, [expandedDimensions]);

  // Save expanded signals to localStorage
  useEffect(() => {
    localStorage.setItem('explainability_expanded_signals', JSON.stringify(Array.from(expandedSignals)));
  }, [expandedSignals]);

  const toggleDimension = (dimensionId: string) => {
    setExpandedDimensions(prev => {
      const next = new Set(prev);
      if (next.has(dimensionId)) {
        next.delete(dimensionId);
      } else {
        next.add(dimensionId);
      }
      return next;
    });
  };

  const toggleSignal = (signalId: string) => {
    setExpandedSignals(prev => {
      const next = new Set(prev);
      if (next.has(signalId)) {
        next.delete(signalId);
      } else {
        next.add(signalId);
      }
      return next;
    });
  };

  return {
    expandedDimensions,
    expandedSignals,
    toggleDimension,
    toggleSignal,
  };
}

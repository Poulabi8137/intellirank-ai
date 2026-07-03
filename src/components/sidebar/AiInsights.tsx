import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { useAppStore } from '../../store/useAppStore';
import { getGlobalInsights, getAIRecommendation, getRecConfig } from '../../intellirank/aiEngine';
import type { Candidate } from '../../types/api';
import styles from './AiInsights.module.css';

interface InsightCard {
  type: string;
  color: string;
  candidate: Candidate;
  metaSuffix: string;
}

export function AiInsights() {
  const rankings = useAppStore(s => s.rankings);
  const hiddenGems = useAppStore(s => s.hiddenGems);
  const setSelectedId = useAppStore(s => s.setSelectedId);

  const insights = useMemo(
    () => getGlobalInsights(rankings, hiddenGems),
    [rankings, hiddenGems],
  );

  if (!insights) return null;

  const cards: InsightCard[] = [
    {
      type: 'Best Match',
      color: '#7c5df7',
      candidate: insights.bestOverall,
      metaSuffix: `${insights.bestOverall.overall_score.toFixed(1)}`,
    },
    {
      type: 'Fastest to Hire',
      color: '#22c55e',
      candidate: insights.fastestHire,
      metaSuffix: insights.fastestHire.availability === 'yes'
        ? 'Immediate'
        : (insights.fastestHire.availability ?? 'Available'),
    },
    {
      type: 'Highest Potential',
      color: '#3b82f6',
      candidate: insights.highestPotential,
      metaSuffix: insights.highestPotential.potential_score != null
        ? `Potential ${insights.highestPotential.potential_score.toFixed(0)}`
        : `Score ${insights.highestPotential.overall_score.toFixed(1)}`,
    },
  ];

  if (insights.hiddenGem) {
    const gem = insights.hiddenGem;
    cards.push({
      type: 'Hidden Gem',
      color: '#f5a623',
      candidate: gem,
      metaSuffix: `Potential ${(gem.potential_score ?? 0).toFixed(0)}`,
    });
  }

  return (
    <div className={styles.container}>
      <div className={styles.cards}>
        {cards.map(({ type, color, candidate, metaSuffix }) => {
          const rec = getAIRecommendation(candidate.overall_score);
          const recConf = getRecConfig(rec);
          const name = candidate.headline ?? `Candidate ${candidate.id}`;
          return (
            <motion.button
              key={type}
              type="button"
              className={styles.card}
              onClick={() => setSelectedId(candidate.id)}
              whileHover={{ y: -1 }}
              transition={{ duration: 0.12 }}
              aria-label={`${type}: ${name}`}
            >
              <span className={styles.cardType} style={{ color }}>{type}</span>
              <span className={styles.cardName}>{name}</span>
              <div className={styles.cardMeta}>
                <span className={styles.cardScore}>{metaSuffix}</span>
                <span className={styles.cardMetaDot}>·</span>
                <span className={styles.cardRec} style={{ color: recConf.color }}>{rec}</span>
              </div>
            </motion.button>
          );
        })}
      </div>

      <div className={styles.footer}>
        <span className={styles.footerCount}>{insights.readyToHire}</span>
        <span className={styles.footerLabel}>
          candidates ready to hire · avg score {insights.avgScore}
        </span>
      </div>
    </div>
  );
}

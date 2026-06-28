import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Box, Flex, Text } from '@radix-ui/themes';
import { useSelectedCandidate } from '@/store/useAppStore';
import { RecruitabilityPanel } from './RecruitabilityPanel';
import {
  getAIRecommendation,
  getRecConfig,
  getConfidenceLevel,
  getTopStrengths,
  getPotentialRisks,
  getInterviewFocus,
  getExpectedRampup,
  getExecutiveSummary,
} from '../intellirank/aiEngine';
import styles from './DetailPanel.module.css';

const sectionVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
};

interface DetailPanelProps {
  onClose: () => void;
}

const TIER_COLORS = {
  strong: '#22c55e',
  good: '#3b82f6',
  possible: '#f59e0b',
  weak: '#6b7280',
} as const;

const TIER_LABELS = {
  strong: 'Strong',
  good: 'Good',
  possible: 'Possible',
  weak: 'Weak',
} as const;

type Tier = keyof typeof TIER_COLORS;

function getTier(score: number): Tier {
  if (score >= 85) return 'strong';
  if (score >= 70) return 'good';
  if (score >= 55) return 'possible';
  return 'weak';
}

const DIMENSIONS = ['Skill Fit', 'Career Intel', 'Recruitability', 'Potential', 'Education'] as const;

export function DetailPanel({ onClose }: DetailPanelProps) {
  const candidate = useSelectedCandidate();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  if (!candidate) return null;

  const tier = getTier(candidate.overall_score);
  const tierColor = TIER_COLORS[tier];

  const rec = getAIRecommendation(candidate.overall_score);
  const recConf = getRecConfig(rec);
  const confidence = getConfidenceLevel(candidate);
  const rampup = getExpectedRampup(candidate);
  const summary = getExecutiveSummary(candidate);
  const strengths = getTopStrengths(candidate);
  const risks = getPotentialRisks(candidate);
  const focus = getInterviewFocus(candidate);

  return (
    <Box
      className={styles.panel}
      role="region"
      aria-label={`Candidate details: ${candidate.headline ?? candidate.id}`}
    >
      <button className={styles.closeBtn} onClick={onClose} aria-label="Close panel" type="button">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
          <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      </button>

      <motion.div
        key={candidate.id}
        initial="initial"
        animate="animate"
        transition={{ staggerChildren: 0.04 }}
      >
        {/* AI Recommendation Banner */}
        <motion.div variants={sectionVariants} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}>
          <Box
            className={styles.recBanner}
            style={{ background: recConf.bg, borderColor: recConf.border }}
          >
            <Text className={styles.recLabel} style={{ color: recConf.color }}>{rec}</Text>
            <Text className={styles.recSub}>AI Recommendation</Text>
          </Box>
        </motion.div>

        {/* Header */}
        <motion.div variants={sectionVariants} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}>
          <Box className={styles.header}>
            <Flex justify="between" align="start" gap="3">
              <Box style={{ minWidth: 0, flex: 1 }}>
                <Text as="p" className={styles.headline}>
                  {candidate.headline ?? `Candidate ${candidate.id}`}
                </Text>
                <Text as="p" className={styles.meta}>
                  {[candidate.current_company, candidate.location].filter(Boolean).join(' · ')}
                </Text>
              </Box>
              <Box
                className={styles.scoreBlock}
                style={{
                  borderColor: `${tierColor}35`,
                  boxShadow: `0 0 16px ${tierColor}12`,
                }}
              >
                <Text className={styles.scoreNum} style={{ color: tierColor }}>
                  {candidate.overall_score.toFixed(1)}
                </Text>
                <Text className={styles.scoreTier} style={{ color: tierColor }}>
                  {TIER_LABELS[tier]}
                </Text>
                <Text className={styles.scoreRank}>#{candidate.rank}</Text>
              </Box>
            </Flex>

            <Flex gap="2" className={styles.badges}>
              {candidate.hidden_by && (
                <Box className={styles.gemBadge}>
                  <Text className={styles.gemBadgeText}>◆ Hidden Gem · {candidate.hidden_by}</Text>
                </Box>
              )}
              {candidate.availability && (
                <Box className={styles.availBadge}>
                  <Text className={styles.availBadgeText}>
                    {candidate.availability === 'yes' ? '● Available now' : `${candidate.availability} notice`}
                  </Text>
                </Box>
              )}
            </Flex>
          </Box>
        </motion.div>

        {/* Confidence + Ramp-up */}
        <motion.div variants={sectionVariants} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}>
          <Box className={styles.metaRow}>
            <Box className={styles.confBlock}>
              <Flex justify="between" align="center" className={styles.confLabelRow}>
                <Text className={styles.confLabel}>AI Confidence</Text>
                <Text className={styles.confValue} style={{ color: recConf.color }}>{confidence}%</Text>
              </Flex>
              <Box className={styles.confBarTrack}>
                <motion.div
                  className={styles.confBarFill}
                  initial={{ width: 0 }}
                  animate={{ width: `${confidence}%` }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  style={{ background: recConf.color }}
                />
              </Box>
            </Box>
            <Box className={styles.rampupBlock}>
              <Text className={styles.rampupLabel}>Expected Ramp-up</Text>
              <Text className={styles.rampupValue}>{rampup}</Text>
            </Box>
          </Box>
        </motion.div>

        {/* Executive Summary */}
        <motion.div variants={sectionVariants} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}>
          <Box className={styles.section}>
            <Text as="p" className={styles.sectionLabel}>Executive Summary</Text>
            <Text as="p" className={styles.summaryText}>{summary}</Text>
          </Box>
        </motion.div>

        {/* Top Strengths */}
        <motion.div variants={sectionVariants} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}>
          <Box className={styles.section}>
            <Text as="p" className={styles.sectionLabel}>Top Strengths</Text>
            <Box className={styles.strengthsGrid}>
              {strengths.map((s, i) => (
                <Box key={s.label} className={styles.strengthCard}>
                  <Flex justify="between" align="center" className={styles.strengthHeader}>
                    <Text className={styles.strengthName}>{s.label}</Text>
                    <Text className={styles.strengthScore} style={{ color: s.color }}>
                      {s.score.toFixed(0)}
                    </Text>
                  </Flex>
                  <Box className={styles.strengthBarTrack}>
                    <motion.div
                      className={styles.strengthBarFill}
                      initial={{ width: 0 }}
                      animate={{ width: `${s.score}%` }}
                      transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1], delay: i * 0.08 }}
                      style={{ background: s.color }}
                    />
                  </Box>
                  <Text className={styles.strengthDetail}>{s.detail}</Text>
                </Box>
              ))}
            </Box>
          </Box>
        </motion.div>

        {/* Potential Risks */}
        {risks.length > 0 && (
          <motion.div variants={sectionVariants} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}>
            <Box className={styles.section}>
              <Text as="p" className={styles.sectionLabel}>Potential Risks</Text>
              <Box className={styles.risksList}>
                {risks.map((r, i) => {
                  const riskColor = r.severity === 'high' ? '#ef4444' : r.severity === 'medium' ? '#f59e0b' : '#6b7280';
                  return (
                    <Flex key={i} align="start" gap="2" className={styles.riskItem}>
                      <Box className={styles.riskDot} style={{ background: riskColor }} />
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Text className={styles.riskText}>{r.label}</Text>
                      </Box>
                      <Text className={styles.riskSeverity} style={{ color: riskColor }}>
                        {r.severity.toUpperCase()}
                      </Text>
                    </Flex>
                  );
                })}
              </Box>
            </Box>
          </motion.div>
        )}

        {/* Interview Focus */}
        <motion.div variants={sectionVariants} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}>
          <Box className={styles.section}>
            <Text as="p" className={styles.sectionLabel}>Interview Focus Areas</Text>
            <Box className={styles.focusList}>
              {focus.map((f, i) => (
                <Flex key={i} gap="2" align="start" className={styles.focusItem}>
                  <Text className={styles.focusNum}>{i + 1}</Text>
                  <Box style={{ minWidth: 0 }}>
                    <Text className={styles.focusTopic}>{f.topic}</Text>
                    <Text className={styles.focusReason}>{f.reason}</Text>
                  </Box>
                </Flex>
              ))}
            </Box>
          </Box>
        </motion.div>

        {/* Dimension Scores */}
        <motion.div variants={sectionVariants} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}>
          <Box className={styles.section}>
            <Text as="p" className={styles.sectionLabel}>Dimension Scores</Text>
            <Box className={styles.dimGrid}>
              {DIMENSIONS.map(dim => {
                const score = candidate.dimension_scores?.find(d => d.dimension === dim)?.score ?? 0;
                const color = score >= 85 ? '#22c55e' : score >= 70 ? '#3b82f6' : score >= 55 ? '#f59e0b' : '#6b7280';
                return (
                  <Box key={dim} className={styles.dimRow}>
                    <Text className={styles.dimName}>{dim}</Text>
                    <Text className={styles.dimScore} style={{ color }}>
                      {score > 0 ? score.toFixed(0) : '—'}
                    </Text>
                    <Box className={styles.dimBar}>
                      <Box className={styles.dimBarFill} style={{ width: `${score}%`, background: color }} />
                    </Box>
                  </Box>
                );
              })}
            </Box>
          </Box>
        </motion.div>

        {/* Profile */}
        <motion.div variants={sectionVariants} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}>
          <Box className={styles.section}>
            <Text as="p" className={styles.sectionLabel}>Profile</Text>
            <Box className={styles.profileGrid}>
              <Box className={styles.profileItem}>
                <Text className={styles.profileKey}>Experience</Text>
                <Text className={styles.profileVal}>
                  {candidate.experience !== undefined ? `${candidate.experience} yrs` : '—'}
                </Text>
              </Box>
              <Box className={styles.profileItem}>
                <Text className={styles.profileKey}>Location</Text>
                <Text className={styles.profileVal}>{candidate.location ?? '—'}</Text>
              </Box>
              <Box className={styles.profileItem}>
                <Text className={styles.profileKey}>Fit Score</Text>
                <Text className={styles.profileVal}>
                  {candidate.fit_score > 0 ? candidate.fit_score.toFixed(1) : '—'}
                </Text>
              </Box>
              <Box className={styles.profileItem}>
                <Text className={styles.profileKey}>Potential</Text>
                <Text className={styles.profileVal}>
                  {candidate.potential_score !== undefined ? candidate.potential_score.toFixed(1) : '—'}
                </Text>
              </Box>
            </Box>
          </Box>
        </motion.div>

        {/* AI Reasoning */}
        {candidate.reasoning && candidate.reasoning.length > 0 && (
          <motion.div variants={sectionVariants} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}>
            <Box className={styles.section}>
              <Text as="p" className={styles.sectionLabel}>AI Reasoning</Text>
              <Flex direction="column" gap="2">
                {candidate.reasoning.map((item, i) => (
                  <Flex key={i} gap="2" align="start" className={styles.reasonItem}>
                    <Box className={styles.reasonDot} aria-hidden="true" />
                    <Text className={styles.reasonText}>{item}</Text>
                  </Flex>
                ))}
              </Flex>
            </Box>
          </motion.div>
        )}

        {/* Hiring Recommendation */}
        {candidate.recruitability?.recommendation && (
          <motion.div variants={sectionVariants} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}>
            <Box className={styles.section}>
              <Text as="p" className={styles.sectionLabel}>Hiring Recommendation</Text>
              <Box
                className={styles.hiringRec}
                style={{ background: recConf.bg, borderColor: recConf.border }}
              >
                <Text className={styles.hiringRecText} style={{ color: recConf.color }}>
                  {candidate.recruitability.recommendation}
                </Text>
              </Box>
            </Box>
          </motion.div>
        )}

        {/* Recruitability */}
        {candidate.recruitability && (
          <motion.div variants={sectionVariants} transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}>
            <Box className={styles.section}>
              <Text as="p" className={styles.sectionLabel}>Recruitability</Text>
              <Box className={styles.sectionContainer}>
                <RecruitabilityPanel
                  data={candidate.recruitability}
                  isLoading={false}
                  error={null}
                />
              </Box>
            </Box>
          </motion.div>
        )}
      </motion.div>
    </Box>
  );
}

export default DetailPanel;

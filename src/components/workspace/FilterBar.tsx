import { Box, Flex, Text, Button } from '@radix-ui/themes';
import { useAppStore } from '../../store/useAppStore';
import type { TierFilter, AvailabilityFilter, ExperienceRange } from '../../store/useAppStore';
import styles from './FilterBar.module.css';

const TIER_OPTIONS: { value: TierFilter; label: string; color: string }[] = [
  { value: 'strong', label: 'Strong ≥85', color: '#22c55e' },
  { value: 'good', label: 'Good 70–84', color: '#3b82f6' },
  { value: 'possible', label: 'Possible 55–69', color: '#f59e0b' },
  { value: 'weak', label: 'Weak <55', color: '#6b7280' },
];

const AVAIL_OPTIONS: { value: AvailabilityFilter; label: string }[] = [
  { value: 'yes', label: 'Immediate' },
  { value: '60 days', label: '60 days' },
  { value: '90 days', label: '90 days' },
  { value: 'no', label: 'Not available' },
];

const EXP_OPTIONS: { value: ExperienceRange; label: string }[] = [
  { value: '0-2', label: '0–2 yrs' },
  { value: '3-5', label: '3–5 yrs' },
  { value: '6-10', label: '6–10 yrs' },
  { value: '10+', label: '10+ yrs' },
];

interface FilterChipProps {
  label: string;
  active: boolean;
  color?: string;
  onClick: () => void;
  ariaLabel: string;
}

function FilterChip({ label, active, color, onClick, ariaLabel }: FilterChipProps) {
  return (
    <button
      className={`${styles.chip} ${active ? styles.chipActive : ''}`}
      onClick={onClick}
      aria-pressed={active}
      aria-label={ariaLabel}
      type="button"
      style={active && color ? { borderColor: color, color } : undefined}
    >
      {active && color && (
        <span className={styles.chipDot} style={{ background: color }} aria-hidden="true" />
      )}
      {label}
    </button>
  );
}

interface FilterBarProps {
  activeFilterCount: number;
}

export function FilterBar({ activeFilterCount }: FilterBarProps) {
  const tierFilter = useAppStore(s => s.tierFilter);
  const availabilityFilter = useAppStore(s => s.availabilityFilter);
  const experienceFilter = useAppStore(s => s.experienceFilter);
  const toggleTierFilter = useAppStore(s => s.toggleTierFilter);
  const toggleAvailabilityFilter = useAppStore(s => s.toggleAvailabilityFilter);
  const toggleExperienceFilter = useAppStore(s => s.toggleExperienceFilter);
  const clearAllFilters = useAppStore(s => s.clearAllFilters);

  return (
    <Box className={styles.bar} role="group" aria-label="Candidate filters">
      <Flex align="center" gap="3" wrap="wrap">

        <Box className={styles.group}>
          <Text className={styles.groupLabel} as="span">Tier</Text>
          <Flex gap="1" wrap="wrap">
            {TIER_OPTIONS.map(opt => (
              <FilterChip
                key={opt.value}
                label={opt.label}
                active={tierFilter.includes(opt.value)}
                color={opt.color}
                onClick={() => toggleTierFilter(opt.value)}
                ariaLabel={`Filter by ${opt.label} tier`}
              />
            ))}
          </Flex>
        </Box>

        <Box className={styles.divider} aria-hidden="true" />

        <Box className={styles.group}>
          <Text className={styles.groupLabel} as="span">Availability</Text>
          <Flex gap="1" wrap="wrap">
            {AVAIL_OPTIONS.map(opt => (
              <FilterChip
                key={opt.value}
                label={opt.label}
                active={availabilityFilter.includes(opt.value)}
                onClick={() => toggleAvailabilityFilter(opt.value)}
                ariaLabel={`Filter by ${opt.label} availability`}
              />
            ))}
          </Flex>
        </Box>

        <Box className={styles.divider} aria-hidden="true" />

        <Box className={styles.group}>
          <Text className={styles.groupLabel} as="span">Experience</Text>
          <Flex gap="1" wrap="wrap">
            {EXP_OPTIONS.map(opt => (
              <FilterChip
                key={opt.value}
                label={opt.label}
                active={experienceFilter.includes(opt.value)}
                onClick={() => toggleExperienceFilter(opt.value)}
                ariaLabel={`Filter by ${opt.label} experience`}
              />
            ))}
          </Flex>
        </Box>

        {activeFilterCount > 0 && (
          <Button
            variant="ghost"
            size="1"
            onClick={clearAllFilters}
            className={styles.clearAll}
            aria-label={`Clear all ${activeFilterCount} active filters`}
          >
            Clear all
            <Box className={styles.badge} aria-hidden="true">
              {activeFilterCount}
            </Box>
          </Button>
        )}
      </Flex>
    </Box>
  );
}

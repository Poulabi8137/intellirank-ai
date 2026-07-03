import { Flex } from '@radix-ui/themes';
import { useAppStore } from '../../store/useAppStore';
import type { TierFilter, AvailabilityFilter, ExperienceRange, DashboardMode } from '../../store/useAppStore';
import styles from './FilterBar.module.css';

const MODE_META: Partial<Record<DashboardMode, { label: string; color: string }>> = {
  'strong-hire': { label: 'Strong Hire Mode',  color: '#22c55e' },
  'immediate':   { label: 'Immediate Joiners', color: '#10b981' },
  'risks':       { label: 'Review Mode',        color: '#f59e0b' },
  'analytics':   { label: 'Analytics Mode',     color: '#a99cff' },
};

const TIER_OPTIONS: { value: TierFilter; label: string; color: string }[] = [
  { value: 'strong', label: 'Strong Hire', color: '#22c55e' },
  { value: 'good', label: 'Recommended', color: '#3b82f6' },
  { value: 'possible', label: 'Consider', color: '#f59e0b' },
  { value: 'weak', label: 'Pass', color: '#6b7280' },
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
  const dashboardMode = useAppStore(s => s.dashboardMode);
  const setDashboardMode = useAppStore(s => s.setDashboardMode);

  const activeMeta = dashboardMode !== 'all' ? MODE_META[dashboardMode] : null;

  return (
    <div className={styles.bar} role="group" aria-label="Candidate filters">
      <Flex align="center" gap="2" wrap="wrap">

        {/* ── Active dashboard mode chip ────────────────────── */}
        {activeMeta && (
          <div className={styles.modeChip} style={{ borderColor: activeMeta.color, color: activeMeta.color } as React.CSSProperties}>
            <span className={styles.modeChipDot} style={{ background: activeMeta.color }} aria-hidden="true" />
            <span className={styles.modeChipLabel}>{activeMeta.label}</span>
            <button
              className={styles.modeChipClear}
              onClick={() => setDashboardMode('all')}
              aria-label={`Clear ${activeMeta.label} workspace filter`}
              type="button"
              style={{ color: activeMeta.color } as React.CSSProperties}
            >
              ✕
            </button>
          </div>
        )}

        {activeMeta && <div className={styles.divider} aria-hidden="true" />}

        <Flex gap="1" wrap="wrap" align="center">
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

        <div className={styles.divider} aria-hidden="true" />

        <Flex gap="1" wrap="wrap" align="center">
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

        <div className={styles.divider} aria-hidden="true" />

        <Flex gap="1" wrap="wrap" align="center">
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

        {activeFilterCount > 0 && (
          <button
            onClick={clearAllFilters}
            className={styles.clearAll}
            aria-label={`Clear all ${activeFilterCount} active filters`}
            type="button"
          >
            Clear all
            <span className={styles.badge} aria-hidden="true">
              {activeFilterCount}
            </span>
          </button>
        )}
      </Flex>
    </div>
  );
}

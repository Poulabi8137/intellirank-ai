import React from 'react';
import { Box, Text } from '@radix-ui/themes';
import cn from 'clsx';
import styles from './Loading.module.css';

interface LoadingProps {
  variant: 'skeleton' | 'shimmer' | 'progress';
  height?: string;
  width?: string;
  className?: string;
}

interface SkeletonTextProps {
  lines: number;
  className?: string;
}

interface SkeletonCardProps {
  height?: string;
  width?: string;
  className?: string;
}

interface LoadingStateProps {
  isLoading: boolean;
  error: string | null;
  loadingText?: string;
  errorText?: string;
  children: React.ReactNode;
}

interface DashboardSkeletonProps {
  className?: string;
}

interface CandidateDetailsSkeletonProps {
  className?: string;
}

interface ComparisonSkeletonProps {
  className?: string;
}

interface HiddenGemsSkeletonProps {
  className?: string;
}

export const Loading = {
  Skeleton: ({ variant, height, width, className }: LoadingProps) => {
    const baseClasses = styles.skeleton;
    
    if (variant === 'skeleton') {
      return (
        <Box
          className={cn(baseClasses, styles.skeletonBase, className)}
          style={{ height, width }}
        />
      );
    }
    
    if (variant === 'shimmer') {
      return (
        <Box
          className={cn(baseClasses, styles.shimmer, className)}
          style={{ height, width }}
        />
      );
    }
    
    return (
      <Box
        className={cn(baseClasses, styles.skeletonProgress, className)}
        style={{ height, width }}
      />
    );
  },

  SkeletonText: ({ lines, className }: SkeletonTextProps) => {
    return (
      <Box className={styles.skeletonTextContainer}>
        {Array.from({ length: lines }).map((_, index) => (
          <Box
            key={index}
            className={cn(
              styles.skeletonText,
              styles[`skeletonTextLine-${Math.min(index + 1, 3)}`],
              className
            )}
          />
        ))}
      </Box>
    );
  },

  SkeletonCard: ({ height, width, className }: SkeletonCardProps) => {
    return (
      <Box
        className={cn(styles.skeletonCard, className)}
        style={{ height, width }}
      />
    );
  },

  DashboardSkeleton: ({ className }: DashboardSkeletonProps) => {
    return (
      <Box className={cn(styles.dashboardSkeleton, className)}>
        <Box className={styles.dashboardHeader}>
          <Loading.Skeleton variant="shimmer" height="32px" width="200px" />
          <Loading.Skeleton variant="shimmer" height="20px" width="150px" />
        </Box>
        
        <Box className={styles.dashboardStats}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Box key={index} className={styles.dashboardStatCard}>
              <Loading.Skeleton variant="shimmer" height="40px" width="80px" />
              <Loading.SkeletonText lines={2} className={styles.dashboardStatLabel} />
            </Box>
          ))}
        </Box>
        
        <Box className={styles.dashboardGrid}>
          <Box className={styles.dashboardMain}>
            <Box className={styles.dashboardTable}>
              <Loading.Skeleton variant="shimmer" height="24px" width="100%" className={styles.dashboardTableHeader} />
              {Array.from({ length: 5 }).map((_, index) => (
                <Box key={index} className={styles.dashboardTableRow}>
                  <Loading.Skeleton variant="shimmer" height="20px" width="80px" />
                  <Loading.Skeleton variant="shimmer" height="20px" width="120px" />
                  <Loading.Skeleton variant="shimmer" height="20px" width="100px" />
                  <Loading.Skeleton variant="shimmer" height="20px" width="90px" />
                </Box>
              ))}
            </Box>
          </Box>
          
          <Box className={styles.dashboardSidebar}>
            <Loading.SkeletonCard height="200px" width="100%" />
            <Loading.SkeletonCard height="150px" width="100%" className={styles.mt16} />
          </Box>
        </Box>
      </Box>
    );
  },

  CandidateDetailsSkeleton: ({ className }: CandidateDetailsSkeletonProps) => {
    return (
      <Box className={cn(styles.candidateDetailsSkeleton, className)}>
        <Box className={styles.candidateHeader}>
          <Loading.Skeleton variant="shimmer" height="32px" width="250px" />
          <Loading.Skeleton variant="shimmer" height="20px" width="200px" />
        </Box>
        
        <Box className={styles.candidateProfile}>
          <Loading.SkeletonCard height="120px" width="100%" />
        </Box>
        
        <Box className={styles.candidateTabs}>
          {Array.from({ length: 3 }).map((_, index) => (
            <Box key={index} className={styles.tabPanel}>
              <Loading.Skeleton variant="shimmer" height="24px" width="100px" className={styles.tabHeader} />
              <Box className={styles.tabContent}>
                {Array.from({ length: 3 }).map((_, contentIndex) => (
                  <Loading.Skeleton variant="shimmer" height="16px" width="100%" key={contentIndex} />
                ))}
              </Box>
            </Box>
          ))}
        </Box>
      </Box>
    );
  },

  ComparisonSkeleton: ({ className }: ComparisonSkeletonProps) => {
    return (
      <Box className={cn(styles.comparisonSkeleton, className)}>
        <Box className={styles.comparisonHeader}>
          <Loading.Skeleton variant="shimmer" height="28px" width="200px" />
          <Loading.Skeleton variant="shimmer" height="20px" width="150px" />
        </Box>
        
        <Box className={styles.comparisonControls}>
          <Loading.Skeleton variant="shimmer" height="36px" width="120px" />
          <Loading.Skeleton variant="shimmer" height="36px" width="80px" />
        </Box>
        
        <Box className={styles.comparisonTable}>
          <Loading.Skeleton variant="shimmer" height="32px" width="100%" className={styles.tableHeader} />
          {Array.from({ length: 8 }).map((_, index) => (
            <Box key={index} className={styles.tableRow}>
              <Loading.Skeleton variant="shimmer" height="20px" width="80px" />
              <Loading.Skeleton variant="shimmer" height="20px" width="100px" />
              <Loading.Skeleton variant="shimmer" height="20px" width="90px" />
              <Loading.Skeleton variant="shimmer" height="20px" width="80px" />
              <Loading.Skeleton variant="shimmer" height="20px" width="70px" />
            </Box>
          ))}
        </Box>
      </Box>
    );
  },

  HiddenGemsSkeleton: ({ className }: HiddenGemsSkeletonProps) => {
    return (
      <Box className={cn(styles.hiddenGemsSkeleton, className)}>
        <Box className={styles.hiddenGemsHeader}>
          <Loading.Skeleton variant="shimmer" height="32px" width="180px" />
          <Loading.Skeleton variant="shimmer" height="20px" width="200px" />
        </Box>
        
        <Box className={styles.filtersSection}>
          <Loading.Skeleton variant="shimmer" height="40px" width="300px" />
          <Loading.Skeleton variant="shimmer" height="40px" width="150px" />
        </Box>
        
        <Box className={styles.cardsGrid}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Box key={index} className={styles.cardSkeleton}>
              <Loading.SkeletonCard height="200px" width="100%" />
            </Box>
          ))}
        </Box>
      </Box>
    );
  },

  LoadingState: ({ isLoading, error, loadingText, errorText, children }: LoadingStateProps) => {
    if (isLoading) {
      return (
        <Box className={styles.loadingState} role="status" aria-label="Loading">
          <Text className={styles.loadingText}>{loadingText || 'Loading...'}</Text>
        </Box>
      );
    }
    
    if (error) {
      return (
        <Box className={styles.errorState} role="alert" aria-label="Error">
          <Text className={styles.errorTitle}>Error</Text>
          <Text className={styles.errorMessage}>{errorText || error}</Text>
        </Box>
      );
    }
    
    return <>{children}</>;
  },
};

export default Loading;

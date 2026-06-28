import type { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useViewport } from '@/hooks/useViewport';
import styles from './AppShell.module.css';

interface AppShellProps {
  header: ReactNode;
  sidebar: ReactNode;
  children: ReactNode;
  panel?: ReactNode;
}

export function AppShell({ header, sidebar, children, panel }: AppShellProps) {
  const viewport = useViewport();

  if (viewport === 'unsupported') {
    return (
      <div className={styles.unsupported} role="alert">
        <h2 className={styles.unsupportedTitle}>Screen Too Small</h2>
        <p className={styles.unsupportedText}>Please use a larger screen. Minimum required width is 1280px.</p>
      </div>
    );
  }

  const isPanelOpen = Boolean(panel);

  return (
    <div className={styles.shell} role="application">
      {header}
      <div className={styles.body}>
        <div className={styles.sidebarContainer}>
          {sidebar}
        </div>
        <main className={styles.main}>
          {children}
        </main>
        <AnimatePresence>
          {isPanelOpen && (
            <motion.div
              key="detail-panel"
              className={styles.panelContainer}
              role="complementary"
              aria-label="Candidate details"
              initial={{ x: 20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 20, opacity: 0 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              {panel}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

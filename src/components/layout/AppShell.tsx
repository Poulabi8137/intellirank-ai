import type { ReactNode } from 'react';
import { useViewport } from '@/hooks/useViewport';
import styles from './AppShell.module.css';

interface AppShellProps {
  header: ReactNode;
  children: ReactNode;
}

export function AppShell({ header, children }: AppShellProps) {
  const viewport = useViewport();

  if (viewport === 'unsupported') {
    return (
      <div className={styles.unsupported} role="alert">
        <h2 className={styles.unsupportedTitle}>Screen Too Small</h2>
        <p className={styles.unsupportedText}>
          IntelliRank requires a minimum width of 768px.
        </p>
      </div>
    );
  }

  return (
    <div className={styles.shell} role="application">
      {header}
      <div className={styles.body}>
        <main className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  );
}

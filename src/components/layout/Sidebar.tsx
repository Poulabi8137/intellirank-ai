import { AiInsights } from '../sidebar/AiInsights';
import styles from './Sidebar.module.css';

export function Sidebar() {
  return (
    <aside className={styles.sidebar} role="complementary" aria-label="AI insights">
      <AiInsights />
    </aside>
  );
}

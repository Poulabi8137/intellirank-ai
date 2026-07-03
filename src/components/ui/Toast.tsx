import { useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, XCircle, X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useToastStore, type ToastItem } from '../../store/useToastStore';
import styles from './Toast.module.css';

const ICONS = {
  success: CheckCircle,
  error: XCircle,
} as const;

function ToastCard({ item }: { item: ToastItem }) {
  const dismiss = useToastStore(s => s.dismiss);
  const progressRef = useRef<HTMLDivElement>(null);
  const Icon = ICONS[item.variant];

  // Animate the progress bar from 100% → 0%
  useEffect(() => {
    if (!progressRef.current || item.duration === 0) return;
    const el = progressRef.current;
    el.style.transform = 'scaleX(1)';
    const raf = requestAnimationFrame(() => {
      el.style.transition = `transform ${item.duration}ms linear`;
      el.style.transform = 'scaleX(0)';
    });
    return () => cancelAnimationFrame(raf);
  }, [item.duration]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.96 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className={`${styles.card} ${styles[item.variant]}`}
      role="alert"
      aria-live="assertive"
    >
      <div className={styles.cardInner}>
        <Icon className={styles.icon} size={15} aria-hidden="true" />
        <div className={styles.textBlock}>
          <span className={styles.title}>{item.title}</span>
          {item.body && <span className={styles.body}>{item.body}</span>}
          {item.action && (
            <button
              className={styles.actionBtn}
              onClick={() => { item.action!.fn(); dismiss(item.id); }}
              type="button"
            >
              {item.action.label}
            </button>
          )}
        </div>
        <button
          className={styles.closeBtn}
          onClick={() => dismiss(item.id)}
          aria-label="Dismiss notification"
          type="button"
        >
          <X size={11} aria-hidden="true" />
        </button>
      </div>
      {item.duration > 0 && (
        <div className={styles.progressTrack} aria-hidden="true">
          <div ref={progressRef} className={`${styles.progress} ${styles[item.variant]}`} />
        </div>
      )}
    </motion.div>
  );
}

export function ToastContainer() {
  const toasts = useToastStore(s => s.toasts);

  return createPortal(
    <div className={styles.container} aria-label="Notifications" role="region">
      <AnimatePresence initial={false} mode="sync">
        {toasts.map(t => (
          <ToastCard key={t.id} item={t} />
        ))}
      </AnimatePresence>
    </div>,
    document.body,
  );
}

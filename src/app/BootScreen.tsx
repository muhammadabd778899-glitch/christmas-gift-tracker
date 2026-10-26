import { BrandMark } from '../components/layout/BrandMark';
import styles from './BootScreen.module.css';

export function BootScreen() {
  return (
    <div className={styles.page} role="status" aria-live="polite">
      <div className={styles.card}>
        <BrandMark className={styles.mark} />
        <p className={styles.eyebrow}>Christmas Gift Tracker</p>
        <h1 className={styles.title}>Preparing your planner</h1>
        <p className={styles.description}>
          Opening your private local workspace. No account is needed.
        </p>
        <div className={styles.progress} aria-hidden="true">
          <span />
        </div>
      </div>
    </div>
  );
}

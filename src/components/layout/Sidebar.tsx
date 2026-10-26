import { Brand } from './Brand';
import { NavLinks } from './NavLinks';
import styles from './Sidebar.module.css';

export function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <Brand tone="dark" />
      </div>

      <div className={styles.navigation}>
        <NavLinks ariaLabel="Primary navigation" tone="dark" />
      </div>

      <div className={styles.footer}>
        <div className={styles.buildNote}>
          <span className={styles.buildDot} aria-hidden="true" />
          <div className={styles.buildCopy}>
            <span className={styles.buildLabel}>Milestone 1</span>
            <span className={styles.buildText}>Interface foundation</span>
          </div>
        </div>
        <p className={styles.version}>v0.1.0 · Local-first by design</p>
      </div>
    </aside>
  );
}

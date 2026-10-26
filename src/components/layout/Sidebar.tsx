import { APP_MILESTONE, APP_MILESTONE_LABEL, APP_VERSION } from '../../lib/appInfo';
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
            <span className={styles.buildLabel}>Milestone {APP_MILESTONE}</span>
            <span className={styles.buildText}>{APP_MILESTONE_LABEL}</span>
          </div>
        </div>
        <p className={styles.version}>v{APP_VERSION} · Local-first by design</p>
      </div>
    </aside>
  );
}

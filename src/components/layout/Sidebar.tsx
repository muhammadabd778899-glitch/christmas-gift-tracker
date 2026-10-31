import { APP_VERSION } from '../../lib/appInfo';
import { EDITION_LABEL } from '../../edition';
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
            <span className={styles.buildLabel}>Version {APP_VERSION}</span>
            <span className={styles.buildText}>{EDITION_LABEL}</span>
          </div>
        </div>
        <p className={styles.version}>Local-first by design</p>
      </div>
    </aside>
  );
}

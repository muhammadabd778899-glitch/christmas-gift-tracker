import { CalendarDays, Info, Menu } from 'lucide-react';
import { Brand } from './Brand';
import { IconButton } from '../ui/IconButton';
import styles from './Header.module.css';

interface HeaderProps {
  onOpenNav: () => void;
  onOpenAbout: () => void;
}

export function Header({ onOpenNav, onOpenAbout }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <IconButton
          label="Open navigation"
          icon={<Menu />}
          onClick={onOpenNav}
          className={styles.menu}
        />
        <div className={styles.mobileBrand}>
          <Brand compact showTagline={false} />
        </div>
        <span className={styles.desktopName}>Christmas Gift Tracker</span>
        <span className={styles.headerDivider} aria-hidden="true" />
        <div className={styles.seasonBlock}>
          <span className={styles.seasonLabel}>Season</span>
          <span
            className={styles.seasonChip}
            title="Season setup arrives in Milestone 3."
            aria-label="No active season. Season setup arrives in Milestone 3."
          >
            <CalendarDays size={15} aria-hidden="true" />
            <span className={styles.seasonText}>No active season</span>
            <span className={styles.seasonHint}>Setup in M3</span>
          </span>
        </div>
      </div>

      <div className={styles.right}>
        <span className={styles.preview}>
          <span className={styles.previewDot} aria-hidden="true" />
          Milestone 1 preview
        </span>
        <IconButton label="About this build" icon={<Info />} onClick={onOpenAbout} />
      </div>
    </header>
  );
}

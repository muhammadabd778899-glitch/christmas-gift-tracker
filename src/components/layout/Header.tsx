import { CalendarDays, Info, Menu } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useActiveSeason } from '../../app/providers/useActiveSeason';
import { formatDateOnly } from '../../domain/dates';
import { APP_MILESTONE } from '../../lib/appInfo';
import { Brand } from './Brand';
import { IconButton } from '../ui/IconButton';
import styles from './Header.module.css';

interface HeaderProps {
  onOpenNav: () => void;
  onOpenAbout: () => void;
}

export function Header({ onOpenNav, onOpenAbout }: HeaderProps) {
  const active = useActiveSeason();
  const season = active.data?.season ?? null;
  const settings = active.data?.settings ?? null;
  const archived = season?.status === 'archived';
  const dateLabel = season && settings ? formatDateOnly(season.holidayDate, settings.locale) : null;

  let seasonContent;

  if (active.loading) {
    seasonContent = (
      <span className={styles.seasonChip} aria-live="polite">
        <CalendarDays size={15} aria-hidden="true" />
        <span className={styles.seasonText}>Loading season…</span>
      </span>
    );
  } else if (active.error) {
    seasonContent = (
      <span
        className={styles.seasonChip}
        title="The saved season could not be read. Open Settings or reload the app."
      >
        <CalendarDays size={15} aria-hidden="true" />
        <span className={styles.seasonText}>Season unavailable</span>
      </span>
    );
  } else if (!season) {
    seasonContent = (
      <Link to="/onboarding" className={`${styles.seasonChip} ${styles.seasonChipLink}`}>
        <CalendarDays size={15} aria-hidden="true" />
        <span className={styles.seasonText}>No active season</span>
        <span className={styles.seasonHint}>Set up season</span>
      </Link>
    );
  } else {
    seasonContent = (
      <span
        className={styles.seasonChip}
        title={`${season.name}${dateLabel ? ` · ${dateLabel}` : ''}${
          archived ? ' · archived' : ''
        }`}
        aria-label={`Season: ${season.name}${dateLabel ? `, ${dateLabel}` : ''}${
          archived ? ', archived' : ''
        }`}
      >
        <CalendarDays size={15} aria-hidden="true" />
        <span className={styles.seasonText}>{season.name}</span>
        <span className={styles.seasonHint}>{archived ? 'Archived' : dateLabel}</span>
      </span>
    );
  }

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
          {seasonContent}
        </div>
      </div>

      <div className={styles.right}>
        <span className={styles.preview}>
          <span className={styles.previewDot} aria-hidden="true" />
          Milestone {APP_MILESTONE} preview
        </span>
        <IconButton label="About this build" icon={<Info />} onClick={onOpenAbout} />
      </div>
    </header>
  );
}

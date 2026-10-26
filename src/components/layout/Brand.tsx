import { Link } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { BrandMark } from './BrandMark';
import styles from './Brand.module.css';

interface BrandProps {
  tone?: 'dark' | 'light';
  compact?: boolean;
  showTagline?: boolean;
  onClick?: () => void;
}

export function Brand({
  tone = 'light',
  compact = false,
  showTagline = true,
  onClick,
}: BrandProps) {
  return (
    <Link
      to="/"
      onClick={onClick}
      className={cn(styles.brand, styles[tone], compact && styles.compact)}
      aria-label="Christmas Gift Tracker home"
    >
      <BrandMark />
      <span className={styles.text}>
        <span className={styles.name}>Christmas Gift Tracker</span>
        {showTagline ? <span className={styles.tagline}>Plan with a little more calm</span> : null}
      </span>
    </Link>
  );
}

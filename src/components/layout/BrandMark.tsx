import { cn } from '../../lib/cn';
import styles from './BrandMark.module.css';

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      className={cn(styles.mark, className)}
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <rect width="48" height="48" rx="13" fill="#f5ead0" />
      <path d="M24 15v19M14 24h20" stroke="#102f26" strokeWidth="2.4" strokeLinecap="round" />
      <rect x="14" y="18" width="20" height="16" rx="2.5" stroke="#102f26" strokeWidth="2.2" />
      <path
        d="M24 18c-3.8 0-6.2-1.7-6.2-4.1 0-2 2.5-3.2 4.2-1.6 1.2 1.1 2 3.3 2 5.7Z"
        fill="#b05a64"
      />
      <path
        d="M24 18c3.8 0 6.2-1.7 6.2-4.1 0-2-2.5-3.2-4.2-1.6-1.2 1.1-2 3.3-2 5.7Z"
        fill="#b05a64"
      />
    </svg>
  );
}

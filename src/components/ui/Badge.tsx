import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';
import styles from './Badge.module.css';

export type BadgeTone = 'neutral' | 'evergreen' | 'gold' | 'burgundy' | 'success' | 'outline';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
}

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return <span className={cn(styles.badge, styles[tone], className)} {...props} />;
}

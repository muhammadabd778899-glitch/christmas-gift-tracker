import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';
import styles from './EmptyState.module.css';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn(styles.empty, className)}>
      <div className={styles.icon} aria-hidden="true">
        {icon}
      </div>
      <div className={styles.copy}>
        <h2 className={styles.title}>{title}</h2>
        <p className={styles.description}>{description}</p>
      </div>
      {action ? <div className={styles.action}>{action}</div> : null}
    </div>
  );
}

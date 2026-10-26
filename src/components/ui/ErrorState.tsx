import type { ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';
import { cn } from '../../lib/cn';
import styles from './ErrorState.module.css';

interface ErrorStateProps {
  title: string;
  description: string;
  actions?: ReactNode;
  detail?: string;
  className?: string;
}

export function ErrorState({ title, description, actions, detail, className }: ErrorStateProps) {
  return (
    <div className={cn(styles.container, className)} role="alert">
      <div className={styles.icon} aria-hidden="true">
        <TriangleAlert />
      </div>
      <p className={styles.eyebrow}>Something went wrong</p>
      <h1 className={styles.title}>{title}</h1>
      <p className={styles.description}>{description}</p>
      {detail ? (
        <details className={styles.detail}>
          <summary>Technical detail</summary>
          <pre>{detail}</pre>
        </details>
      ) : null}
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </div>
  );
}

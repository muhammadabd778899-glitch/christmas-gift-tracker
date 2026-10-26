import type { HTMLAttributes, ReactNode, ThHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';
import styles from './Table.module.css';

interface TableProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function Table({ label, children, className }: TableProps) {
  return (
    <div
      className={cn(styles.container, className)}
      role="region"
      aria-label={label}
      // Scrollable data regions stay focusable so keyboard users can scroll wide tables.
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
      tabIndex={0}
    >
      <table className={styles.table}>
        <caption className="sr-only">{label}</caption>
        {children}
      </table>
    </div>
  );
}

export function TableHead({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn(styles.head, className)} {...props} />;
}

export function TableBody({ className, ...props }: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn(styles.body, className)} {...props} />;
}

export function TableRow({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return <tr className={cn(styles.row, className)} {...props} />;
}

export function TableHeaderCell({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th scope="col" className={cn(styles.headerCell, className)} {...props} />;
}

export function TableCell({ className, ...props }: HTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn(styles.cell, className)} {...props} />;
}

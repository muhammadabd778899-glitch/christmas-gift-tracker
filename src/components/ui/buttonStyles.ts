import { cn } from '../../lib/cn';
import styles from './Button.module.css';

export type ButtonVariant =
  'primary' | 'secondary' | 'ghost' | 'danger' | 'inverse' | 'ghost-inverse';
export type ButtonSize = 'sm' | 'md';

export interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function buttonStyles({
  variant = 'primary',
  size = 'md',
}: ButtonStyleOptions = {}): string {
  return cn(styles.button, styles[variant], styles[size]);
}

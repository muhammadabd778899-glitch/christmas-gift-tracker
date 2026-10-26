import type { HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';
import styles from './Card.module.css';

export function Card({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return <section className={cn(styles.card, className)} {...props} />;
}

export function CardHeader({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(styles.header, className)} {...props} />;
}

type HeadingLevel = 'h2' | 'h3' | 'h4';

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  as?: HeadingLevel;
}

export function CardTitle({ as: Tag = 'h3', className, ...props }: CardTitleProps) {
  return <Tag className={cn(styles.title, className)} {...props} />;
}

export function CardDescription({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn(styles.description, className)} {...props} />;
}

export function CardContent({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(styles.content, className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(styles.footer, className)} {...props} />;
}

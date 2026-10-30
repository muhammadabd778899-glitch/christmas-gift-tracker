import { Gift, Home, Map } from 'lucide-react';
import { Link } from 'react-router-dom';
import { buttonStyles } from '../components/ui/buttonStyles';
import styles from './NotFoundPage.module.css';

export function NotFoundPage() {
  return (
    <div className={styles.page}>
      <div className={styles.ornament} aria-hidden="true">
        <Gift size={34} strokeWidth={1.4} />
      </div>
      <p className={styles.code}>404</p>
      <h1 className={styles.title}>This page slipped out of the stocking.</h1>
      <p className={styles.description}>
        The address does not match a page in this app. No data was changed or lost. Use the links
        below to return to your plan.
      </p>
      <div className={styles.actions}>
        <Link className={buttonStyles()} to="/">
          <Home size={17} aria-hidden="true" />
          Back to dashboard
        </Link>
        <Link className={buttonStyles({ variant: 'secondary' })} to="/settings">
          <Map size={17} aria-hidden="true" />
          View build roadmap
        </Link>
      </div>
    </div>
  );
}

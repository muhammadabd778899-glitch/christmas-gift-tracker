import type { AppError } from '../domain/errors';
import { BrandMark } from '../components/layout/BrandMark';
import { Button } from '../components/ui/Button';
import { ErrorState } from '../components/ui/ErrorState';
import styles from './boundaries/ErrorPage.module.css';

interface StorageRecoveryPageProps {
  error: AppError;
}

export function StorageRecoveryPage({ error }: StorageRecoveryPageProps) {
  const title =
    error.code === 'MIGRATION_FAILED'
      ? 'Your planner needs a safe update.'
      : 'We could not open your local planner.';

  return (
    <div className={styles.page}>
      <div className={styles.top}>
        <a className={styles.brand} href="/" aria-label="Christmas Gift Tracker home">
          <BrandMark />
          <span>Christmas Gift Tracker</span>
        </a>
      </div>
      <ErrorState
        title={title}
        description={
          error.recovery ??
          'Your data has not been deleted. Reload the app. If this keeps happening, do not clear site data; contact support.'
        }
        detail={`${error.code}: ${error.message}`}
        actions={<Button onClick={() => window.location.reload()}>Reload app</Button>}
      />
    </div>
  );
}

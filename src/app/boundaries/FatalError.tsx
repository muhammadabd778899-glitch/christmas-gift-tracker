import { Button } from '../../components/ui/Button';
import { ErrorState } from '../../components/ui/ErrorState';
import { buttonStyles } from '../../components/ui/buttonStyles';
import { BrandMark } from '../../components/layout/BrandMark';
import styles from './ErrorPage.module.css';

interface FatalErrorProps {
  title: string;
  description: string;
  detail?: string;
}

export function FatalError({ title, description, detail }: FatalErrorProps) {
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
        description={description}
        detail={detail}
        actions={
          <>
            <Button onClick={() => window.location.reload()}>Reload app</Button>
            <a className={buttonStyles({ variant: 'secondary' })} href="/">
              Back to dashboard
            </a>
          </>
        }
      />
    </div>
  );
}

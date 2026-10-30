import { APP_MILESTONE, APP_MILESTONE_LABEL } from '../../lib/appInfo';
import { Dialog } from '../ui/Dialog';
import { NavLinks } from './NavLinks';
import styles from './MobileNav.module.css';

interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

export function MobileNav({ open, onClose }: MobileNavProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      variant="drawer"
      title="Christmas Gift Tracker"
      description="Navigate the planner"
    >
      <div className={styles.nav}>
        <NavLinks ariaLabel="Mobile navigation" tone="light" onNavigate={onClose} />
      </div>
      <div className={styles.footer}>
        <span className={styles.dot} aria-hidden="true" />
        <span>
          Milestone {APP_MILESTONE} · {APP_MILESTONE_LABEL}
        </span>
      </div>
    </Dialog>
  );
}

import { Check, Clock3, Sparkles } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { APP_MILESTONE } from '../lib/appInfo';
import styles from './AboutDialog.module.css';

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
}

const included = [
  'Responsive application shell and navigation',
  'Warm design tokens and reusable interface components',
  'Accessible dialogs, forms, tables, and mobile navigation',
  'Versioned local storage with typed validation and transactions',
  'Safe startup diagnostics and storage recovery guidance',
  'Automated tests, type checking, linting, and a production build',
];

const upcoming = [
  'First season and recipient management (Milestone 3)',
  'Gifts and purchase status (Milestone 4)',
  'Budgets, dashboard charts, and progress (Milestone 5)',
  'Ideas, shopping, archives, and backups (Milestones 6–8)',
];

export function AboutDialog({ open, onClose }: AboutDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="About this preview"
      description={`Milestone ${APP_MILESTONE} of 12: persistent local storage.`}
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className={styles.stack}>
        <div className={styles.intro}>
          <Badge tone="gold">
            <Sparkles size={12} aria-hidden="true" />
            Milestone {APP_MILESTONE}
          </Badge>
          <p>
            The planner can now open and protect a local database. Data-entry screens arrive next;
            this build does not invent a season or seed sample records.
          </p>
        </div>

        <div className={styles.columns}>
          <div>
            <h3 className={styles.heading}>
              <Check size={15} aria-hidden="true" />
              Included
            </h3>
            <ul className={styles.list}>
              {included.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className={styles.heading}>
              <Clock3 size={15} aria-hidden="true" />
              Coming next
            </h3>
            <ul className={styles.list}>
              {upcoming.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className={styles.notice}>
          <strong>No customer plans yet.</strong> The local storage layer is implemented, but there
          are no recipient or gift screens in this build. No sample records are loaded, and no data
          is sent anywhere.
        </div>
      </div>
    </Dialog>
  );
}

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
  'Explicit first-season setup — nothing is created automatically',
  'Recipient profiles with optional caps, relationships, and notes',
  'Planned, spent, and remaining cap calculated from gift records',
  'Safe recipient deletion with move-or-delete choices for gifts',
  'Accessible dialogs, forms, tables, and responsive navigation',
  'Versioned local storage with validation and transactions',
  'Automated tests, type checking, linting, and a production build',
];

const upcoming = [
  'Gifts and purchase status (Milestone 4)',
  'Budgets, dashboard charts, and progress (Milestone 5)',
  'Ideas and grouped shopping lists (Milestone 6)',
  'Search, archives, backup, and offline delivery (Milestones 7–10)',
];

export function AboutDialog({ open, onClose }: AboutDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="About this preview"
      description={`Milestone ${APP_MILESTONE} of 12: recipients and first-season setup.`}
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
            The planner can now create a real season and keep a recipient list in a private local
            database. Gift entry, backup, and offline packaging are not implemented yet.
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
          <strong>Local and account-free.</strong> Seasons and recipients are stored only in this
          browser. There is no backup, cloud sync, or proven recovery from cleared browser data, and
          no data is sent anywhere.
        </div>
      </div>
    </Dialog>
  );
}

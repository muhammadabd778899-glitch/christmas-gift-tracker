import { Check, Clock3, Sparkles } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import styles from './AboutDialog.module.css';

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
}

const included = [
  'Responsive application shell and navigation',
  'Warm design tokens and reusable interface components',
  'Accessible dialogs, forms, tables, and mobile navigation',
  'Route error handling and a deliberate not-found page',
  'Automated tests, type checking, linting, and a production build',
];

const upcoming = [
  'Persistent local storage (Milestone 2)',
  'Recipients and gifts (Milestones 3–4)',
  'Budgets, dashboard charts, and progress (Milestone 5)',
  'Ideas, shopping, archives, and backups (Milestones 6–8)',
];

export function AboutDialog({ open, onClose }: AboutDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="About this preview"
      description="Milestone 1 of 12: the interface foundation."
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
            Milestone 1
          </Badge>
          <p>
            The shell is ready. The screens are wired, the design system is in place, and the
            application builds as a production web app.
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
          <strong>No customer data yet.</strong> This build does not create, store, or transmit gift
          plans. Placeholder pages contain no sample records or hidden business logic.
        </div>
      </div>
    </Dialog>
  );
}

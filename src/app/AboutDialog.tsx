import { Check, Clock3, Sparkles } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { APP_MILESTONE, APP_MILESTONE_LABEL } from '../lib/appInfo';
import styles from './AboutDialog.module.css';

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
}

const included = [
  'Explicit first-season setup — nothing is created automatically',
  'Recipient profiles with optional caps, relationships, and notes',
  'Gift records with recipients, stores, links, planned and actual costs',
  'Independent bought, wrapped, and sent states with optional dates',
  'A live dashboard with budget, planned, spent, remaining, and unallocated figures',
  'A budget-vs-actual chart with an accessible table of the same numbers',
  'Holiday countdown, gift progress, and data-quality alerts',
  'An Idea Bank with search, editing, conversion, and safe reopening',
  'A shopping list derived from unbought gifts, grouped by store with subtotals',
  'Gift search across name, recipient, category, and store, with combinable filters and sorting',
  'Recipient detail pages with caps, planned and spent totals, utilisation, progress, and gift editing',
  'Mark bought from the shopping list with the same status rules',
  'A print view that hides navigation and controls',
  'Confirmation before un-buying or deleting a gift',
  'Safe deletion that returns converted ideas to the Idea Bank',
  'Accessible dialogs, forms, tables, and responsive navigation',
  'Versioned local storage with validation and transactions',
  'Automated tests, type checking, linting, and a production build',
];

const upcoming = [
  'Season archives, backup, and CSV (Milestone 8)',
  'Professional UI, themes, and accessibility polish (Milestone 9)',
  'Offline delivery and packaging (Milestone 10)',
];

export function AboutDialog({ open, onClose }: AboutDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="About this preview"
      description={`Milestone ${APP_MILESTONE} of 12: ${APP_MILESTONE_LABEL}.`}
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
            The planner can now create a season, keep a recipient list, track gifts, search and
            filter them, open a recipient detail page, capture ideas, convert them into gifts, and
            build a grouped shopping list from unbought gifts. Budget figures still come from saved
            gift records. Backup and offline packaging are not implemented yet.
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
          <strong>Local and account-free.</strong> Seasons, recipients, gifts, ideas, and budget
          records are stored only in this browser. There is no backup, cloud sync, or proven
          recovery from cleared browser data, and no data is sent anywhere.
        </div>
      </div>
    </Dialog>
  );
}

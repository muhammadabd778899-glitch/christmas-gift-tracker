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
  'Season management with one active season, read-only archives, and recipient copying',
  'Complete JSON backups with validation, atomic replace-all restore, and a required fresh backup',
  'CSV export for one or all seasons, with formula guard and optional sensitive columns',
  'Optional sample data that stays isolated, plus a guarded reset that requires a backup',
  'Confirmation before un-buying or deleting a gift',
  'Safe deletion that returns converted ideas to the Idea Bank',
  'Light, dark, and system themes with pre-paint application and no flash',
  'Currency symbol, code, and fraction-digit settings with confirmation before reinterpretation',
  'A rebuilt Settings page with PII-free diagnostics, privacy explanation, and app/schema versions',
  'Keyboard-accessible metric explanations, visible focus, and reduced-motion support',
  'Responsive layouts with mobile gift and shopping cards at 360 px',
  'Accessible dialogs, forms, tables, and responsive navigation',
  'Versioned local storage with validation and transactions',
  'An installable offline-first app with precached assets and offline navigation',
  'An update prompt that waits for consent and never reloads over unsaved form work',
  'Truthful offline status plus persistent-storage requests with clear explanations',
  'Install guidance for desktop Chromium, Android, iPhone/iPad, and Firefox',
  'An optional online edition with account sign-up, sign-in, password recovery, and account deletion',
  'Device linking with a plan preview, typed confirmations, and a fresh backup before merging',
  'Automatic sync with an offline outbox, retry, duplicate protection, and record-by-record conflict choices',
  'Cross-account isolation enforced by database row-level security',
  'A compile-time edition split so the offline bundle contains no account or sync code',
  'Automated tests, type checking, linting, and a production build',
];

const upcoming = ['Release hardening and Etsy packaging (Milestone 12)'];

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
            The planner manages several seasons with one active at a time and read-only archives,
            complete JSON backups, CSV exports, isolated sample data, and a guarded reset. This
            build also installs as an offline-first app: assets are cached after one online visit,
            the app launches and reloads without a connection, and new versions are offered rather
            than forced. An optional online edition adds an account, cloud sync, and conflict
            handling; the default offline edition still needs no account.
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
          <strong>Local-first by default.</strong> The offline edition keeps seasons, recipients,
          gifts, ideas, and budget records only in this browser; backups and CSV exports are the
          deliberate ways to take a copy with you. In the online edition, connecting a device
          uploads the same records to your own account so they can sync, protected per account by
          row-level security. There is no tracking, telemetry, or third-party advertising, and the
          first online visit is required before the app can launch offline.
        </div>
      </div>
    </Dialog>
  );
}

import { Check, Sparkles, X } from 'lucide-react';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { APP_VERSION } from '../lib/appInfo';
import { EDITION_LABEL, IS_ONLINE_EDITION } from '../edition';
import styles from './AboutDialog.module.css';

interface AboutDialogProps {
  open: boolean;
  onClose: () => void;
}

const coreIncluded = [
  'Explicit first-season setup — nothing is created automatically',
  'Recipient profiles with optional caps, relationships, and notes',
  'Gift records with recipients, stores, links, planned and actual costs',
  'Independent bought, wrapped, and sent states with optional dates',
  'A live dashboard with budget, planned, spent, remaining, and unallocated figures',
  'A budget-vs-actual chart with an accessible table of the same numbers',
  'Holiday countdown, gift progress, and data-quality alerts',
  'An Idea Bank with search, editing, conversion, and safe reopening',
  'A shopping list derived from unbought gifts, grouped by store with subtotals',
  'Gift search across name, recipient, category, and store, with combinable filters',
  'Recipient detail pages with caps, planned and spent totals, utilisation, and progress',
  'Mark bought from the shopping list with the same status rules',
  'A print view that hides navigation and controls',
  'Season management with one active season, read-only archives, and recipient copying',
  'Complete JSON backups with validation and atomic replace-all restore',
  'CSV export for one or all seasons, with formula guard and optional sensitive columns',
  'Optional sample data that stays isolated, plus a guarded reset that requires a backup',
  'Confirmation before un-buying or deleting a gift',
  'Safe deletion that returns converted ideas to the Idea Bank',
  'Light, dark, and system themes with pre-paint application and no flash',
  'Currency symbol, code, and fraction-digit settings with confirmation before reinterpretation',
  'A Settings page with PII-free diagnostics, privacy explanation, and app/schema versions',
  'Keyboard-accessible metric explanations, visible focus, and reduced-motion support',
  'Responsive layouts with mobile gift and shopping cards at 360 px',
  'Accessible dialogs, forms, tables, and responsive navigation',
  'Versioned local storage with validation and transactions',
  'An installable offline-first app with precached assets and offline navigation',
  'An update prompt that waits for consent and never reloads over unsaved form work',
  'Truthful offline status plus persistent-storage requests with clear explanations',
  'Install guidance for desktop Chromium, Android, iPhone/iPad, and Firefox',
  'Automated tests, type checking, linting, and a production build',
];

const onlineIncluded = [
  'An optional account with sign-up, sign-in, password recovery, and account deletion',
  'Device linking with a plan preview, typed confirmations, and a fresh backup before merging',
  'Automatic sync with an offline outbox, retry, duplicate protection, and record-by-record conflict choices',
  'Cross-account isolation enforced by database row-level security',
  'A compile-time edition split so the offline bundle contains no account or sync code',
];

const notIncluded = IS_ONLINE_EDITION
  ? [
      'Automatic or cloud backups beyond account sync',
      'Built-in PDF export; printing uses the browser print dialog',
      'Verified install and offline behavior in Firefox, Safari, or iOS',
      'Combining two backups — restore is replace-all',
      'A hosted service: you configure and verify your own Supabase project',
    ]
  : [
      'Account sign-in and cloud sync — available as a separate online edition',
      'Automatic or cloud backups',
      'Built-in PDF export; printing uses the browser print dialog',
      'Verified install and offline behavior in Firefox, Safari, or iOS',
      'Combining two backups — restore is replace-all',
    ];

const included = IS_ONLINE_EDITION ? [...coreIncluded, ...onlineIncluded] : coreIncluded;

export function AboutDialog({ open, onClose }: AboutDialogProps) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="About Christmas Gift Tracker"
      description={`Version ${APP_VERSION} · ${EDITION_LABEL}.`}
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
            Version {APP_VERSION} · {EDITION_LABEL}
          </Badge>
          <p>
            {IS_ONLINE_EDITION
              ? 'The online edition adds an optional account and cloud sync to the same local-first planner. Records live in this browser and also upload to your own account so connected devices can sync. Conflicts keep both versions and ask you to choose; nothing is resolved by silent last-write-wins.'
              : 'The offline edition runs entirely in this browser. It installs as an app after one online visit, launches without a connection, and keeps seasons, recipients, gifts, ideas, budgets, themes, and currency settings on this device. Complete JSON backups and CSV exports are the deliberate ways to take a copy with you.'}
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
              <X size={15} aria-hidden="true" />
              Not included
            </h3>
            <ul className={styles.list}>
              {notIncluded.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className={styles.notice}>
          <strong>Local-first by default.</strong>{' '}
          {IS_ONLINE_EDITION
            ? 'Records stay in this browser until you connect a device to your own account. When you connect, the same records upload so they can sync, protected per account by row-level security. There is no tracking, telemetry, or third-party advertising, and the first online visit is required before the app can launch offline.'
            : 'Seasons, recipients, gifts, ideas, and budget records stay only in this browser; backups and CSV exports are the deliberate ways to take a copy with you. There is no account, tracking, telemetry, or third-party advertising, and the first online visit is required before the app can launch offline.'}
        </div>
      </div>
    </Dialog>
  );
}

import {
  ArrowRight,
  Check,
  Database,
  Download,
  FileSpreadsheet,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useActiveSeason } from '../app/providers/useActiveSeason';
import { Badge, type BadgeTone } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { ErrorState } from '../components/ui/ErrorState';
import { PageHeader } from '../components/ui/PageHeader';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../components/ui/Table';
import { AppearanceSettings } from '../features/settings/AppearanceSettings';
import { StorageDiagnostics } from '../features/settings/StorageDiagnostics';
import { APP_MILESTONE, APP_MILESTONE_LABEL, APP_VERSION } from '../lib/appInfo';
import { toAppError } from '../storage/errors';
import styles from './SettingsPage.module.css';

type MilestoneStatus = 'Complete' | 'Planned';

interface Milestone {
  number: string;
  title: string;
  focus: string;
  status: MilestoneStatus;
}

const milestones: Milestone[] = [
  {
    number: '0',
    title: 'Specification',
    focus: 'Product, architecture, data model, acceptance criteria',
    status: 'Complete',
  },
  {
    number: '1',
    title: 'Foundation',
    focus: 'Runnable shell, navigation, design system, quality tooling',
    status: 'Complete',
  },
  {
    number: '2',
    title: 'Persistent storage',
    focus: 'IndexedDB schema, repositories, migrations, validation',
    status: 'Complete',
  },
  {
    number: '3',
    title: 'Recipients',
    focus: 'People, budget caps, first-season setup, and safe deletion',
    status: 'Complete',
  },
  {
    number: '4',
    title: 'Gifts',
    focus: 'Gift records, costs, statuses, stores, and safe deletion',
    status: 'Complete',
  },
  {
    number: '5',
    title: 'Budget engine and dashboard',
    focus: 'Pure calculations, live totals, and progress charts',
    status: 'Complete',
  },
  {
    number: '6',
    title: 'Idea Bank and Shopping List',
    focus: 'Idea conversion and a derived, grouped shopping list',
    status: 'Complete',
  },
  {
    number: '7',
    title: 'Search, filters, details',
    focus: 'Gift search and filters, sorting, and recipient detail pages',
    status: 'Complete',
  },
  {
    number: '8',
    title: 'Seasons, archives, backup',
    focus: 'Yearly reuse, protected archives, JSON backup, CSV export',
    status: 'Complete',
  },
  {
    number: '9',
    title: 'Professional UI',
    focus: 'Themes, responsive polish, accessibility, and print styles',
    status: 'Complete',
  },
  {
    number: '10',
    title: 'Offline delivery',
    focus: 'Validated offline artifact and customer setup',
    status: 'Planned',
  },
  {
    number: '11',
    title: 'Online edition',
    focus: 'Accounts, cloud storage, sync, and conflict resolution',
    status: 'Planned',
  },
  {
    number: '12',
    title: 'QA, packaging, launch',
    focus: 'Tested, documented Etsy release with honest claims',
    status: 'Planned',
  },
];

const buildFacts = [
  ['Version', `v${APP_VERSION} · Milestone ${APP_MILESTONE}`],
  ['Framework', 'React 19 + TypeScript + Vite'],
  ['Styling', 'CSS Modules with light and dark design tokens'],
  ['Charts', 'Recharts with a table alternative and reduced motion'],
  ['Storage', 'IndexedDB via Dexie — seasons, recipients, gifts, and ideas'],
  ['Backup', 'Manual JSON backup with validated replace-all restore'],
  ['Export', 'CSV with an optional sensitive-column switch'],
  ['Theme', 'Light, dark, and system themes saved in this browser'],
  ['Currency', 'Display-only presets or custom code and symbol — no conversion'],
  ['Accessibility', 'Keyboard operation, visible focus, and 44px targets'],
  ['Offline', 'Not yet packaged — Milestone 10'],
  ['Data', 'One active season, archived seasons, and optional sample data'],
];

const limitations = [
  'Currency is display-only. Changing it reformats amounts; it never converts or rewrites stored values.',
  'Backups and CSV exports are manual downloads; there is no automatic or cloud backup.',
  'Restore replaces all current data. Combining two backups (merge) is not supported.',
  'No installable or offline package has been produced or verified.',
  'Printing uses the browser print dialog; there is no built-in PDF export or saved print file.',
  'Wrapped progress uses every gift as its denominator, so 100% may not be reachable for digital or retailer-direct gifts.',
];

const dataTools = [
  {
    icon: Download,
    title: 'Backup and restore',
    description: 'Download a complete JSON copy or restore one with a preview and confirmation.',
  },
  {
    icon: FileSpreadsheet,
    title: 'CSV export',
    description: 'Export the active season, with an optional sensitive-column switch.',
  },
  {
    icon: Sparkles,
    title: 'Sample data',
    description: 'Try a flagged example season, then remove it without touching real records.',
  },
  {
    icon: RotateCcw,
    title: 'Reset planner',
    description: 'Erase this browser’s planner data with explicit confirmation.',
  },
];

function statusTone(status: MilestoneStatus): BadgeTone {
  return status === 'Complete' ? 'success' : 'neutral';
}

function SettingsHeader() {
  return (
    <PageHeader
      eyebrow="Preferences and information"
      title="Settings"
      description="Choose how the planner looks and displays money, check local storage health, and see what this build includes."
      badge={<Badge tone="gold">Milestone {APP_MILESTONE} preview</Badge>}
    />
  );
}

export function SettingsPage() {
  const active = useActiveSeason();

  if (active.loading) {
    return (
      <div className={styles.page}>
        <SettingsHeader />
        <Card>
          <CardContent className={styles.loadingCard} role="status" aria-live="polite">
            <span className={styles.loadingDot} aria-hidden="true" />
            Loading your settings…
          </CardContent>
        </Card>
      </div>
    );
  }

  if (active.error || !active.data) {
    const appError = toAppError(active.error);

    return (
      <ErrorState
        title="Your settings could not be loaded."
        description={
          appError.recovery ??
          'Your data has not been changed. Reload the app and try again. If the problem continues, do not clear site data.'
        }
        actions={<Button onClick={() => window.location.reload()}>Reload app</Button>}
      />
    );
  }

  const { settings } = active.data;

  return (
    <div className={styles.page}>
      <SettingsHeader />

      <AppearanceSettings settings={settings} />

      <StorageDiagnostics />

      <Card>
        <CardHeader>
          <Badge tone="evergreen">
            <Database size={12} aria-hidden="true" />
            Your data
          </Badge>
          <CardTitle as="h2">Backups, exports, and resets</CardTitle>
          <CardDescription>
            These tools live on the Seasons &amp; archives page, next to the data they protect.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className={styles.toolLinks}>
            {dataTools.map((tool) => {
              const Icon = tool.icon;

              return (
                <li key={tool.title}>
                  <Link className={styles.toolLink} to="/seasons#data-tools">
                    <span className={styles.toolIcon} aria-hidden="true">
                      <Icon />
                    </span>
                    <span className={styles.toolCopy}>
                      <strong>{tool.title}</strong>
                      <span>{tool.description}</span>
                    </span>
                    <ArrowRight className={styles.toolArrow} size={16} aria-hidden="true" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Badge tone="evergreen">
            <Database size={12} aria-hidden="true" />
            Build roadmap
          </Badge>
          <CardTitle as="h2">Twelve milestones, one verified step at a time</CardTitle>
          <CardDescription>
            A milestone is complete only when its acceptance criteria and verification commands
            pass. This table is project information, not user data.
          </CardDescription>
        </CardHeader>
        <CardContent className={styles.tableContent}>
          <Table label="Christmas Gift Tracker build roadmap">
            <TableHead>
              <TableRow>
                <TableHeaderCell>#</TableHeaderCell>
                <TableHeaderCell>Milestone</TableHeaderCell>
                <TableHeaderCell>Primary focus</TableHeaderCell>
                <TableHeaderCell>Status</TableHeaderCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {milestones.map((milestone) => (
                <TableRow key={milestone.number}>
                  <TableCell>
                    <span className={styles.milestoneNumber}>{milestone.number}</span>
                  </TableCell>
                  <TableCell>
                    <span className={styles.milestoneTitle}>{milestone.title}</span>
                  </TableCell>
                  <TableCell>{milestone.focus}</TableCell>
                  <TableCell>
                    <Badge tone={statusTone(milestone.status)}>
                      {milestone.status === 'Complete' ? (
                        <Check size={11} aria-hidden="true" />
                      ) : null}
                      {milestone.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className={styles.twoColumn}>
        <Card>
          <CardHeader>
            <Badge tone="neutral">This build</Badge>
            <CardTitle as="h2">Honest specifics</CardTitle>
            <CardDescription>What is running today, without implied features.</CardDescription>
          </CardHeader>
          <CardContent>
            <dl className={styles.metaList}>
              {buildFacts.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card className={styles.privacyCard}>
          <CardHeader>
            <span className={styles.privacyIcon} aria-hidden="true">
              <ShieldCheck />
            </span>
            <CardTitle as="h2">Local-first progress</CardTitle>
            <CardDescription>
              Your planner lives in this browser’s IndexedDB. Themes, currency display, seasons,
              people, gifts, and ideas all stay on this device.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className={styles.privacyText}>
              Startup creates only safe settings and diagnostics. It does not create a season, seed
              sample gifts, or delete records. A season exists only after you explicitly create or
              restore one. Dashboard totals are calculated from saved records and are never stored
              as a competing source of truth. Diagnostics show counts and integrity issues only — no
              names, addresses, or notes. No account and no network request are required.
            </p>
            <div className={styles.claims}>
              <strong>Claims we will not make until verified</strong>
              <span>Data is backed up automatically</span>
              <span>Works fully offline with no setup</span>
              <span>Safe against a cleared browser profile</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <Badge tone="burgundy">
            <TriangleAlert size={12} aria-hidden="true" />
            Known limitations
          </Badge>
          <CardTitle as="h2">What is intentionally missing</CardTitle>
          <CardDescription>
            Each limitation maps to a later milestone in the roadmap above.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className={styles.limitations}>
            {limitations.map((limitation) => (
              <li key={limitation}>{limitation}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <p className={styles.footnote}>
        Milestone {APP_MILESTONE}: {APP_MILESTONE_LABEL}. Version {APP_VERSION}.
      </p>
    </div>
  );
}

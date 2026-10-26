import { Check, Database, ShieldCheck, TriangleAlert } from 'lucide-react';
import { Badge, type BadgeTone } from '../components/ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
} from '../components/ui/Table';
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
    status: 'Planned',
  },
  {
    number: '3',
    title: 'Recipients',
    focus: 'People, budget caps, and first-season setup',
    status: 'Planned',
  },
  {
    number: '4',
    title: 'Gifts',
    focus: 'Gift records, costs, statuses, stores, and safe deletion',
    status: 'Planned',
  },
  {
    number: '5',
    title: 'Budget engine and dashboard',
    focus: 'Pure calculations, live totals, and progress charts',
    status: 'Planned',
  },
  {
    number: '6',
    title: 'Idea Bank and Shopping List',
    focus: 'Idea conversion and a derived, grouped shopping list',
    status: 'Planned',
  },
  {
    number: '7',
    title: 'Search, filters, details',
    focus: 'Find and review records as the planner grows',
    status: 'Planned',
  },
  {
    number: '8',
    title: 'Seasons, archives, backup',
    focus: 'Yearly reuse, protected archives, JSON backup, CSV export',
    status: 'Planned',
  },
  {
    number: '9',
    title: 'Professional UI',
    focus: 'Themes, responsive polish, accessibility, and print styles',
    status: 'Planned',
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
  ['Version', 'v0.1.0 · Milestone 1'],
  ['Framework', 'React 19 + TypeScript + Vite'],
  ['Styling', 'CSS Modules + design tokens'],
  ['Storage', 'Not implemented — Milestone 2'],
  ['Theme', 'Light theme only — dark mode in Milestone 9'],
  ['Offline', 'Not yet packaged — Milestone 10'],
  ['Data', 'No customer data is created or stored in this build'],
];

const limitations = [
  'No persistence yet: refreshing the app cannot lose data because none is entered.',
  'Feature pages are deliberate placeholders with no sample records.',
  'The theme is light only until Milestone 9.',
  'No installable or offline package has been produced or verified.',
  'No backup, restore, or CSV export exists yet.',
];

function statusTone(status: MilestoneStatus): BadgeTone {
  return status === 'Complete' ? 'success' : 'neutral';
}

export function SettingsPage() {
  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Preferences and information"
        title="Settings"
        description="What this build includes, what it deliberately leaves for later, and how the product will protect your data."
        badge={<Badge tone="gold">Milestone 1 preview</Badge>}
      />

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
            <CardTitle as="h2">Local-first intent</CardTitle>
            <CardDescription>
              The launch edition is designed to work without an account and keep planning data in
              the browser.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className={styles.privacyText}>
              That architecture is defined, but storage, backup, and offline delivery are not
              implemented yet. This preview makes no claim that the product is offline-capable or
              that it persists data.
            </p>
            <div className={styles.claims}>
              <strong>Claims we will not make until verified</strong>
              <span>Works fully offline</span>
              <span>Data is backed up</span>
              <span>Safe to use for a real Christmas plan</span>
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
    </div>
  );
}

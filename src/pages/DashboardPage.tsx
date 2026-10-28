import {
  ArrowRight,
  CalendarDays,
  Check,
  Clock3,
  Gift,
  Lightbulb,
  PackageCheck,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useActiveSeason } from '../app/providers/useActiveSeason';
import { Badge } from '../components/ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { buttonStyles } from '../components/ui/buttonStyles';
import { formatDateOnly } from '../domain/dates';
import { formatMoney } from '../domain/money';
import { APP_MILESTONE } from '../lib/appInfo';
import styles from './DashboardPage.module.css';

const capabilities = [
  {
    icon: Wallet,
    milestone: 'M5',
    title: 'Budget clarity',
    description:
      'Know the difference between what you planned, what you actually spent, and what is left.',
  },
  {
    icon: PackageCheck,
    milestone: 'Available now',
    title: 'Gift progress',
    description:
      'See bought, wrapped, and sent at a glance — three explicit states, not one vague checkbox.',
  },
  {
    icon: Users,
    milestone: 'Available now',
    title: 'Recipient view',
    description:
      'Give every person an optional budget cap; planned, spent, and remaining values fill in from gifts.',
  },
  {
    icon: Lightbulb,
    milestone: 'M6',
    title: 'Ideas to errands',
    description:
      'Capture ideas, promote them to gifts, and walk into the shop with a list grouped by store.',
  },
];

const foundation = [
  'Explicit first-season setup that never invents a season',
  'Recipient profiles with caps, notes, and safe deletion',
  'Gift records with costs, links, statuses, and confirmed deletion',
  'Warm design tokens and reusable, accessible components',
  'Validated local storage with typed repositories and transactions',
];

const nextSteps = [
  {
    number: '05',
    title: 'Budget engine and dashboard',
    description: 'One tested calculation layer, live totals, and progress charts.',
  },
  {
    number: '06',
    title: 'Idea Bank and Shopping List',
    description: 'Turn saved ideas into gifts and group errands by store.',
  },
  {
    number: '07',
    title: 'Search and details',
    description: 'Find people and records as the planner grows.',
  },
  {
    number: '08',
    title: 'Seasons and archives',
    description: 'Reuse the planner each year and protect past Christmas records.',
  },
];

export function DashboardPage() {
  const active = useActiveSeason();
  const season = active.data?.season ?? null;
  const settings = active.data?.settings ?? null;

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Your Christmas plan, at a glance."
        badge={<Badge tone="gold">Milestone 4 preview</Badge>}
        actions={
          <Link className={buttonStyles({ variant: 'secondary', size: 'sm' })} to="/settings">
            View build roadmap
          </Link>
        }
      />

      <section className={styles.hero} aria-labelledby="hero-title">
        <div className={styles.heroCopy}>
          <p className={styles.heroEyebrow}>
            <Sparkles size={15} aria-hidden="true" />
            Gift tracking is ready
          </p>
          <h2 id="hero-title">Make room for a calmer Christmas.</h2>
          <p className={styles.heroText}>
            Start with the people on your list, then record each gift, its costs, and its purchase
            status. Planned and spent figures update as your gift list grows; the full budget view
            comes next.
          </p>
          <div className={styles.heroActions}>
            <Link className={buttonStyles({ variant: 'inverse' })} to="/gifts">
              Open gifts
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
            <Link className={buttonStyles({ variant: 'ghost-inverse' })} to="/settings">
              View build roadmap
            </Link>
          </div>
        </div>

        <div className={styles.heroVisual} aria-hidden="true">
          <div className={styles.orbit}>
            <div className={styles.medallion}>
              <Gift size={58} strokeWidth={1.25} />
            </div>
          </div>
          <span className={styles.floatingTagTop}>
            <Users size={14} />
            Recipients ready
          </span>
          <span className={styles.floatingTagBottom}>
            <Gift size={14} />
            Gifts ready
          </span>
        </div>
      </section>

      <section className={styles.capabilities} aria-labelledby="capabilities-title">
        <div className={styles.sectionIntro}>
          <div>
            <p className={styles.eyebrow}>The road ahead</p>
            <h2 id="capabilities-title">Built around the way December actually feels.</h2>
          </div>
          <p>
            Recipients and gifts are available now. Budgets, ideas, and shopping lists arrive in the
            next milestones — each built on the same tested local foundation.
          </p>
        </div>

        <div className={styles.capabilityGrid}>
          {capabilities.map((capability) => {
            const Icon = capability.icon;
            return (
              <Card key={capability.title} className={styles.capabilityCard}>
                <CardContent className={styles.capabilityContent}>
                  <div className={styles.capabilityTop}>
                    <span className={styles.iconTile} aria-hidden="true">
                      <Icon size={21} strokeWidth={1.8} />
                    </span>
                    <Badge tone="gold">{capability.milestone}</Badge>
                  </div>
                  <div>
                    <h3 className={styles.capabilityTitle}>{capability.title}</h3>
                    <p className={styles.capabilityText}>{capability.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <div className={styles.lowerGrid}>
        <Card>
          <CardHeader>
            <Badge tone="success">
              <Check size={12} aria-hidden="true" />
              Milestone {APP_MILESTONE}
            </Badge>
            <CardTitle as="h2">Your Christmas plan can start here</CardTitle>
            <CardDescription>
              A season, recipient list, and gift records are live, backed by validated local storage
              and safe deletion.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className={styles.checkList}>
              {foundation.map((item) => (
                <li key={item}>
                  <span className={styles.checkIcon} aria-hidden="true">
                    <Check size={12} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Badge tone="evergreen">
              <Clock3 size={12} aria-hidden="true" />
              Up next
            </Badge>
            <CardTitle as="h2">From gifts to budgets</CardTitle>
            <CardDescription>The build advances one verified capability at a time.</CardDescription>
          </CardHeader>
          <CardContent>
            <ol className={styles.nextList}>
              {nextSteps.map((step) => (
                <li key={step.number}>
                  <span className={styles.nextNumber} aria-hidden="true">
                    {step.number}
                  </span>
                  <div>
                    <h3 className={styles.nextTitle}>{step.title}</h3>
                    <p className={styles.nextText}>{step.description}</p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </div>

      <Card className={styles.seasonCard}>
        {active.loading ? (
          <CardContent className={styles.seasonLoading} role="status" aria-live="polite">
            <span className={styles.seasonLoadingDot} aria-hidden="true" />
            Loading your season…
          </CardContent>
        ) : active.error ? (
          <EmptyState
            icon={<CalendarDays />}
            title="Your season could not be loaded"
            description="Your records have not been changed. Reload the app and try again; do not clear site data while troubleshooting."
            action={
              <Link className={buttonStyles({ variant: 'secondary', size: 'sm' })} to="/settings">
                See data guidance
              </Link>
            }
          />
        ) : season ? (
          <CardContent className={styles.seasonReady}>
            <span className={styles.seasonIcon} aria-hidden="true">
              <CalendarDays />
            </span>
            <div className={styles.seasonCopy}>
              <p className={styles.seasonEyebrow}>
                {season.status === 'archived' ? 'Archived season' : 'Active season'}
              </p>
              <h2>{season.name}</h2>
              <p>
                {formatDateOnly(season.holidayDate, settings?.locale ?? 'en-US')}
                <span aria-hidden="true"> · </span>
                {season.budgetMinor === null
                  ? 'No overall budget set'
                  : `${formatMoney(season.budgetMinor, {
                      fractionDigits: settings?.fractionDigits ?? 2,
                      currencySymbol: settings?.currencySymbol ?? '$',
                      locale: settings?.locale ?? 'en-US',
                    })} overall budget`}
              </p>
            </div>
            <Link className={buttonStyles({ variant: 'secondary', size: 'sm' })} to="/recipients">
              {season.status === 'archived' ? 'View recipients' : 'Manage recipients'}
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </CardContent>
        ) : (
          <EmptyState
            icon={<CalendarDays />}
            title="No active season yet"
            description="Create a season to give your recipients, gifts, and budget a home. This build never creates a season or sample person for you."
            action={
              <Link className={buttonStyles({ variant: 'secondary', size: 'sm' })} to="/onboarding">
                Create your first season
              </Link>
            }
          />
        )}
      </Card>
    </div>
  );
}

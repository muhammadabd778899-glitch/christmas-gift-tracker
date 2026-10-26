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
import { Badge } from '../components/ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { PageHeader } from '../components/ui/PageHeader';
import { buttonStyles } from '../components/ui/buttonStyles';
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
    milestone: 'M4–5',
    title: 'Gift progress',
    description:
      'See bought, wrapped, and sent at a glance — three explicit states, not one vague checkbox.',
  },
  {
    icon: Users,
    milestone: 'M3',
    title: 'Recipient view',
    description:
      'Give every person an optional budget cap and a clear list of what they are receiving.',
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
  'Responsive shell with seven working destinations',
  'Warm design tokens and reusable, accessible components',
  'Keyboard access, focus handling, and mobile navigation',
  'Validated local storage with typed repositories and transactions',
  'Startup diagnostics, recovery guidance, and automated tests',
];

const nextSteps = [
  {
    number: '03',
    title: 'Recipients',
    description: 'People, budget caps, and the first season setup.',
  },
  {
    number: '04',
    title: 'Gifts',
    description: 'Costs, statuses, stores, links, and safe deletion.',
  },
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
];

export function DashboardPage() {
  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Your Christmas plan, at a glance."
        badge={<Badge tone="gold">Milestone 2 preview</Badge>}
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
            The local foundation is ready
          </p>
          <h2 id="hero-title">Make room for a calmer Christmas.</h2>
          <p className={styles.heroText}>
            One place for recipients, budgets, gift ideas, and the quiet satisfaction of knowing
            exactly what is left to do.
          </p>
          <div className={styles.heroActions}>
            <Link className={buttonStyles({ variant: 'inverse' })} to="/recipients">
              Explore the planner
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
            <Wallet size={14} />
            Budget in view
          </span>
          <span className={styles.floatingTagBottom}>
            <PackageCheck size={14} />
            Progress tracked
          </span>
        </div>
      </section>

      <section className={styles.capabilities} aria-labelledby="capabilities-title">
        <div className={styles.sectionIntro}>
          <div>
            <p className={styles.eyebrow}>What is coming</p>
            <h2 id="capabilities-title">Built around the way December actually feels.</h2>
          </div>
          <p>
            The shell holds a private local database now. The planning screens will fill it without
            turning the season into a spreadsheet.
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
            <CardTitle as="h2">The local foundation is in place</CardTitle>
            <CardDescription>
              Verified shell and storage work that the planning screens can stand on.
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
            <CardTitle as="h2">From shell to planner</CardTitle>
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
        <EmptyState
          icon={<CalendarDays />}
          title="No active season yet"
          description="Season setup arrives with Milestone 3. Storage is ready, but this build does not create a plan or sample data on your behalf."
          action={
            <Link className={buttonStyles({ variant: 'secondary', size: 'sm' })} to="/settings">
              See what is next
            </Link>
          }
        />
      </Card>
    </div>
  );
}

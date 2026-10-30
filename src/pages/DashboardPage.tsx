import { lazy, Suspense, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleAlert,
  Download,
  Gift as GiftIcon,
  Info,
  PackageCheck,
  Pencil,
  Plus,
  Send,
  ShoppingBag,
  Sparkles,
  TriangleAlert,
  Users,
  Wallet,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/ui/Card';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { PageHeader } from '../components/ui/PageHeader';
import { buttonStyles } from '../components/ui/buttonStyles';
import {
  buildDashboardModel,
  calculateCountdown,
  formatRatioPercent,
  type DashboardFinding,
} from '../domain/calculations/dashboard';
import { formatDateOnly } from '../domain/dates';
import type { AppSettings } from '../domain/entities';
import { formatMoney } from '../domain/money';
import { APP_MILESTONE } from '../lib/appInfo';
import { toAppError } from '../storage/errors';
import { SeasonBudgetDialog } from '../features/dashboard/SeasonBudgetDialog';
import { useDashboardData } from '../features/dashboard/useDashboardData';
import { useLocalToday } from '../features/dashboard/useLocalToday';
import styles from './DashboardPage.module.css';

// Keep the chart library out of the initial chunk. The chart module is only
// requested when a season has gifts; totals and alerts render without it.
const BudgetActualChart = lazy(async () => {
  const module = await import('../features/dashboard/BudgetActualChart');
  return { default: module.BudgetActualChart };
});

function formatMoneyFor(settings: AppSettings, value: number | null): string {
  return formatMoney(value, {
    fractionDigits: settings.fractionDigits,
    currencySymbol: settings.currencySymbol,
    locale: settings.locale,
  });
}

function findingTone(finding: DashboardFinding): string {
  if (finding.severity === 'critical') return styles.alertCritical;
  if (finding.severity === 'warning') return styles.alertWarning;
  return styles.alertInfo;
}

function findingIcon(finding: DashboardFinding) {
  switch (finding.kind) {
    case 'spent_over_budget':
      return <CircleAlert size={20} />;
    case 'bought_without_cost':
      return <GiftIcon size={20} />;
    case 'recipient_over_cap':
      return <Users size={20} />;
    case 'planned_over_budget':
      return <TriangleAlert size={20} />;
    default:
      return <Info size={20} />;
  }
}

interface ProgressRowProps {
  label: string;
  count: number;
  total: number;
  ratio: number | null;
  icon: ReactNode;
  fillClassName: string;
}

function ProgressRow({ label, count, total, ratio, icon, fillClassName }: ProgressRowProps) {
  const percent = ratio === null ? null : Math.round(ratio * 100);

  return (
    <div className={styles.progressItem}>
      <div className={styles.progressTop}>
        <span className={styles.progressLabel}>
          <span className={styles.progressIcon} aria-hidden="true">
            {icon}
          </span>
          {label}
        </span>
        <span className={styles.progressCounts}>
          {count} / {total}
          <strong>{formatRatioPercent(ratio)}</strong>
        </span>
      </div>
      <div
        className={styles.progressTrack}
        role="progressbar"
        aria-label={`${label} progress`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent ?? undefined}
        aria-valuetext={
          percent === null
            ? `No gifts yet for ${label.toLowerCase()} progress`
            : `${count} of ${total} gifts, ${formatRatioPercent(ratio)}`
        }
      >
        <span
          className={`${styles.progressFill} ${fillClassName}`}
          style={{ width: `${percent ?? 0}%` }}
        />
      </div>
    </div>
  );
}

export function DashboardPage() {
  const data = useDashboardData();
  const today = useLocalToday();
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const payload = data.data;
  const model = useMemo(
    () =>
      payload?.season
        ? buildDashboardModel(payload.season, payload.gifts, payload.recipients)
        : null,
    [payload],
  );

  if (data.loading) {
    return (
      <div className={styles.page}>
        <PageHeader
          eyebrow="Overview"
          title="Dashboard"
          description="Your Christmas plan, at a glance."
          badge={<Badge tone="gold">Milestone {APP_MILESTONE} preview</Badge>}
        />
        <Card>
          <CardContent className={styles.loadingCard} role="status" aria-live="polite">
            <span className={styles.loadingDot} aria-hidden="true" />
            Loading your dashboard…
          </CardContent>
        </Card>
      </div>
    );
  }

  if (data.error || !payload) {
    const appError = toAppError(data.error);
    return (
      <ErrorState
        title="Your dashboard could not be loaded."
        description={
          appError.recovery ??
          'Your data has not been deleted. Reload the app and try again. If the problem continues, do not clear site data.'
        }
        actions={<Button onClick={() => window.location.reload()}>Reload app</Button>}
      />
    );
  }

  if (!payload.season || !model) {
    return (
      <div className={styles.page}>
        <PageHeader
          eyebrow="Overview"
          title="Dashboard"
          description="Your Christmas plan, at a glance."
          badge={<Badge tone="gold">Milestone {APP_MILESTONE} preview</Badge>}
        />
        <Card>
          <CardContent>
            <EmptyState
              icon={<CalendarDays />}
              title="Create a season to begin"
              description="Budgets, gifts, and progress all belong to one Christmas season. This build does not create a season or sample records on its own."
              action={
                <div className={styles.emptyActions}>
                  <Link className={buttonStyles({ variant: 'primary' })} to="/onboarding">
                    Create your first season
                  </Link>
                  <Link className={buttonStyles({ variant: 'secondary' })} to="/seasons">
                    Seasons &amp; archives
                  </Link>
                </div>
              }
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  const { settings, season, recipients } = payload;
  const archived = season.status === 'archived';
  const money = (value: number | null) => formatMoneyFor(settings, value);
  const holidayLabel = formatDateOnly(season.holidayDate, settings.locale);
  const countdown = calculateCountdown(season.holidayDate, today);
  const totals = model.totals;
  const progress = model.progress;
  const firstStep = progress.total === 0;

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description={`Budget, progress, and gift status for ${season.name}.`}
        badge={
          archived ? (
            <Badge tone="neutral">Archived · read only</Badge>
          ) : season.isSample ? (
            <Badge tone="gold">
              <Sparkles size={12} aria-hidden="true" />
              Sample data
            </Badge>
          ) : (
            <Badge tone="gold">Milestone {APP_MILESTONE} preview</Badge>
          )
        }
      />

      {notice ? (
        <p className={styles.notice} role="status" aria-live="polite">
          {notice}
        </p>
      ) : null}

      <section className={styles.hero} aria-labelledby="dashboard-hero-title">
        <div className={styles.heroCopy}>
          <p className={styles.heroEyebrow}>
            <Sparkles size={15} aria-hidden="true" />
            {archived ? 'Archived season' : 'Active season'} · {holidayLabel}
          </p>
          <h2 id="dashboard-hero-title">{season.name}</h2>
          <p className={styles.heroText}>
            {archived
              ? 'This season is archived. Its gifts, budget, and progress stay visible, but editing is disabled until the season is restored.'
              : 'See the difference between what you planned, what you have paid, and what is left. Every figure comes from the gifts saved in this season.'}
          </p>
          <div className={styles.heroActions}>
            <Link className={buttonStyles({ variant: 'inverse' })} to="/gifts">
              {archived ? 'View gifts' : 'Add gift'}
              {archived ? (
                <ArrowRight size={17} aria-hidden="true" />
              ) : (
                <Plus size={17} aria-hidden="true" />
              )}
            </Link>
            <Link className={buttonStyles({ variant: 'ghost-inverse' })} to="/recipients">
              <Users size={17} aria-hidden="true" />
              {archived ? 'View recipients' : 'Add recipient'}
            </Link>
            <Link className={buttonStyles({ variant: 'ghost-inverse' })} to="/shopping">
              <ShoppingBag size={17} aria-hidden="true" />
              Shopping list
            </Link>
            <Link className={buttonStyles({ variant: 'ghost-inverse' })} to="/seasons">
              <Download size={17} aria-hidden="true" />
              Backup & archives
            </Link>
          </div>
        </div>

        <div className={styles.countdownCard} role="status" aria-live="polite">
          <p className={styles.countdownEyebrow}>
            <CalendarDays size={14} aria-hidden="true" />
            Christmas countdown
          </p>
          {countdown.state === 'future' ? (
            <div className={styles.countdownValue}>
              <strong>{countdown.days}</strong>
              <span>days</span>
            </div>
          ) : countdown.state === 'today' ? (
            <div className={styles.countdownValue}>
              <strong className={styles.countdownWord}>Today</strong>
            </div>
          ) : (
            <div className={styles.countdownValue}>
              <strong>{countdown.days}</strong>
              <span>days</span>
            </div>
          )}
          <p className={styles.countdownLabel}>
            {countdown.state === 'future'
              ? `until ${holidayLabel}`
              : countdown.state === 'today'
                ? `${holidayLabel} is here`
                : `since ${holidayLabel}`}
          </p>
          {countdown.state === 'past' && !archived ? (
            <p className={styles.countdownNote}>
              When you are ready, archive this season or start the next one from Seasons &amp;
              archives.
            </p>
          ) : null}
          {archived ? (
            <p className={styles.countdownNote}>Archived season · figures are read-only.</p>
          ) : null}
        </div>
      </section>

      {firstStep ? (
        <Card className={styles.firstStepCard}>
          <CardContent>
            <EmptyState
              icon={<GiftIcon />}
              title={archived ? 'No gifts in this archived season' : 'Start with your first gift'}
              description={
                archived
                  ? 'This archived season has no gifts stored, so there are no spending, progress, or chart figures to show.'
                  : 'Your season budget is the overall limit; planned spending is what you expect to spend; actual spending is what you have already paid. Add a recipient and a gift to begin.'
              }
              action={
                archived ? undefined : (
                  <div className={styles.firstStepActions}>
                    {recipients.length === 0 ? (
                      <Link className={buttonStyles({ variant: 'primary' })} to="/recipients">
                        <Users size={17} aria-hidden="true" />
                        Add a recipient first
                      </Link>
                    ) : (
                      <Link className={buttonStyles({ variant: 'primary' })} to="/gifts">
                        <Plus size={17} aria-hidden="true" />
                        Add your first gift
                      </Link>
                    )}
                    {season.budgetMinor === null ? (
                      <Button variant="secondary" onClick={() => setBudgetOpen(true)}>
                        <Wallet size={17} aria-hidden="true" />
                        Set a season budget
                      </Button>
                    ) : null}
                  </div>
                )
              }
            />
          </CardContent>
        </Card>
      ) : null}

      <section className={styles.summarySection} aria-labelledby="budget-summary-title">
        <div className={styles.sectionIntro}>
          <div>
            <p className={styles.eyebrow}>Money</p>
            <h2 id="budget-summary-title">Budget at a glance</h2>
          </div>
          <p>
            Planned is a forecast. Actual is money paid for bought gifts. Remaining and unallocated
            answer different questions, so they are shown separately.
          </p>
        </div>

        <div className={styles.summaryGrid}>
          <Card className={styles.metricCard}>
            <CardContent className={styles.metricContent}>
              <h3 className={styles.metricLabel}>
                <span className={styles.metricIcon} aria-hidden="true">
                  <Wallet size={18} />
                </span>
                Season budget
              </h3>
              <p className={totals.budgetMinor === null ? styles.metricEmpty : styles.metricValue}>
                {totals.budgetMinor === null ? 'Not set' : money(totals.budgetMinor)}
              </p>
              <p className={styles.metricDetail}>
                The optional overall limit for {season.name}, separate from recipient caps.
              </p>
              {archived ? (
                <p className={styles.readOnlyNote}>Read-only archived season</p>
              ) : (
                <Button
                  className={styles.metricAction}
                  variant="secondary"
                  size="sm"
                  aria-haspopup="dialog"
                  onClick={() => setBudgetOpen(true)}
                >
                  <Pencil size={15} aria-hidden="true" />
                  {totals.budgetMinor === null ? 'Set budget' : 'Edit budget'}
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className={styles.metricCard}>
            <CardContent className={styles.metricContent}>
              <h3 className={styles.metricLabel}>
                <span className={styles.metricIcon} aria-hidden="true">
                  <GiftIcon size={18} />
                </span>
                Planned spending
              </h3>
              <p className={styles.metricValue}>{money(totals.plannedTotalMinor)}</p>
              <p className={styles.metricDetail}>
                Sum of every gift&apos;s planned budget, bought or not.
              </p>
              {totals.budgetMinor === null ? (
                <p className={styles.metricMuted}>Set a season budget to compare.</p>
              ) : totals.plannedOverBudget ? (
                <p className={styles.metricCritical}>
                  <TriangleAlert size={15} aria-hidden="true" />
                  {money(totals.plannedOverBudgetMinor)} above budget
                </p>
              ) : (
                <p className={styles.metricSuccess}>
                  <CheckCircle2 size={15} aria-hidden="true" />
                  Within budget
                </p>
              )}
            </CardContent>
          </Card>

          <Card className={styles.metricCard}>
            <CardContent className={styles.metricContent}>
              <h3 className={styles.metricLabel}>
                <span className={styles.metricIcon} aria-hidden="true">
                  <ShoppingBag size={18} />
                </span>
                Actual spending
              </h3>
              <p className={styles.metricValue}>{money(totals.actualSpentMinor)}</p>
              <p className={styles.metricDetail}>
                Actual costs of bought gifts with a recorded cost. Missing costs add zero.
              </p>
              {totals.budgetMinor === null ? (
                <p className={styles.metricMuted}>Set a season budget to compare.</p>
              ) : totals.spentOverBudget ? (
                <p className={styles.metricCritical}>
                  <CircleAlert size={15} aria-hidden="true" />
                  {money(totals.spentOverBudgetMinor)} over budget
                </p>
              ) : (
                <p className={styles.metricSuccess}>
                  <CheckCircle2 size={15} aria-hidden="true" />
                  Within budget
                </p>
              )}
            </CardContent>
          </Card>

          <Card className={styles.metricCard}>
            <CardContent className={styles.metricContent}>
              <h3 className={styles.metricLabel}>
                <span className={styles.metricIcon} aria-hidden="true">
                  <Wallet size={18} />
                </span>
                Remaining budget
              </h3>
              <p className={styles.metricValue}>
                {totals.remainingMinor === null ? 'Not set' : money(totals.remainingMinor)}
              </p>
              <p className={styles.metricDetail}>Season budget minus actual spending.</p>
              {totals.remainingMinor === null ? (
                <p className={styles.metricMuted}>Set a season budget to see what is left.</p>
              ) : totals.remainingMinor < 0 ? (
                <p className={styles.metricCritical}>
                  <Badge tone="burgundy">Over budget</Badge>
                  {money(Math.abs(totals.remainingMinor))} more spent than budgeted
                </p>
              ) : (
                <p className={styles.metricSuccess}>
                  <CheckCircle2 size={15} aria-hidden="true" />
                  {money(totals.remainingMinor)} still available
                </p>
              )}
            </CardContent>
          </Card>

          <Card className={styles.metricCard}>
            <CardContent className={styles.metricContent}>
              <h3 className={styles.metricLabel}>
                <span className={styles.metricIcon} aria-hidden="true">
                  <PackageCheck size={18} />
                </span>
                Unallocated budget
              </h3>
              <p className={styles.metricValue}>
                {totals.unallocatedMinor === null ? 'Not set' : money(totals.unallocatedMinor)}
              </p>
              <p className={styles.metricDetail}>Season budget minus planned spending.</p>
              {totals.unallocatedMinor === null ? (
                <p className={styles.metricMuted}>Set a season budget to see the plan balance.</p>
              ) : totals.unallocatedMinor < 0 ? (
                <p className={styles.metricWarning}>
                  <Badge tone="gold">Plan over budget</Badge>
                  {money(Math.abs(totals.unallocatedMinor))} more planned than budgeted
                </p>
              ) : (
                <p className={styles.metricSuccess}>
                  <CheckCircle2 size={15} aria-hidden="true" />
                  {money(totals.unallocatedMinor)} not yet allocated
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </section>

      {!firstStep && !archived && model.findings.length > 0 ? (
        <section className={styles.alertSection} aria-labelledby="dashboard-alerts-title">
          <div className={styles.sectionIntro}>
            <div>
              <p className={styles.eyebrow}>Data quality</p>
              <h2 id="dashboard-alerts-title">Needs attention</h2>
            </div>
            <p>
              These checks come from your saved gifts. Nothing has been changed or estimated
              automatically.
            </p>
          </div>
          <ul className={styles.alertList}>
            {model.findings.map((finding) => (
              <li key={finding.kind} className={`${styles.alert} ${findingTone(finding)}`}>
                <span className={styles.alertIcon} aria-hidden="true">
                  {findingIcon(finding)}
                </span>
                <div className={styles.alertBody}>
                  <FindingCopy finding={finding} money={money} />
                  {finding.kind === 'recipient_over_cap' ? (
                    <ul className={styles.alertRecipients}>
                      {finding.recipients.map((recipient) => (
                        <li key={recipient.recipientId}>
                          <strong>{recipient.name}</strong> · {money(recipient.exceededByMinor)}{' '}
                          over cap
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  <Link
                    className={styles.alertLink}
                    to={finding.kind === 'recipient_over_cap' ? '/recipients' : '/gifts'}
                  >
                    {finding.kind === 'recipient_over_cap' ? 'Review recipients' : 'Review gifts'}
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {!firstStep ? (
        <div className={styles.insightGrid}>
          <Card>
            <CardHeader>
              <Badge tone="evergreen">Progress</Badge>
              <CardTitle as="h2">Gift progress</CardTitle>
              <CardDescription>
                Bought, wrapped, and sent are separate states. Each percentage uses every gift in
                the season as its denominator.
              </CardDescription>
            </CardHeader>
            <CardContent className={styles.progressList}>
              <ProgressRow
                label="Bought"
                count={progress.bought}
                total={progress.total}
                ratio={progress.boughtRatio}
                icon={<ShoppingBag size={16} />}
                fillClassName={styles.progressBought}
              />
              <ProgressRow
                label="Wrapped"
                count={progress.wrapped}
                total={progress.total}
                ratio={progress.wrappedRatio}
                icon={<PackageCheck size={16} />}
                fillClassName={styles.progressWrapped}
              />
              <ProgressRow
                label="Sent"
                count={progress.sent}
                total={progress.total}
                ratio={progress.sentRatio}
                icon={<Send size={16} />}
                fillClassName={styles.progressSent}
              />
            </CardContent>
            <CardFooter>
              <p className={styles.progressNote}>
                Digital and retailer-direct gifts still count toward wrapped progress. A &ldquo;does
                not need wrapping&rdquo; exemption is not part of this build, so 100% may not be
                reachable.
              </p>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <Badge tone="gold">By recipient</Badge>
              <CardTitle as="h2">Planned vs actual spending</CardTitle>
              <CardDescription>
                Recipients with a gift or a cap are shown. Bars and the table use the same amounts.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {model.chart.length > 0 ? (
                <Suspense
                  fallback={
                    <p className={styles.chartLoading} role="status">
                      Loading chart…
                    </p>
                  }
                >
                  <BudgetActualChart data={model.chart} settings={settings} />
                </Suspense>
              ) : (
                <EmptyState
                  icon={<Users />}
                  title="No chart data yet"
                  description="Add a recipient with a cap or a gift to compare planned and actual spending."
                />
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {budgetOpen && !archived ? (
        <SeasonBudgetDialog
          season={season}
          settings={settings}
          onClose={() => setBudgetOpen(false)}
          onSaved={(message) => {
            setBudgetOpen(false);
            setNotice(message);
          }}
        />
      ) : null}
    </div>
  );
}

interface FindingCopyProps {
  finding: DashboardFinding;
  money: (value: number | null) => string;
}

function FindingCopy({ finding, money }: FindingCopyProps) {
  switch (finding.kind) {
    case 'spent_over_budget':
      return (
        <>
          <h3>Actual spending is over budget</h3>
          <p>
            You have spent {money(finding.amountMinor)} more than the season budget. Remaining shows
            the negative balance instead of hiding it.
          </p>
        </>
      );
    case 'bought_without_cost':
      return (
        <>
          <h3>Bought gifts without a cost</h3>
          <p>
            {finding.count} bought {finding.count === 1 ? 'gift has' : 'gifts have'} no actual cost.
            {finding.count === 1 ? ' It counts' : ' They count'} as zero spending until a cost is
            recorded.
          </p>
        </>
      );
    case 'recipient_over_cap':
      return (
        <>
          <h3>Recipient caps exceeded</h3>
          <p>
            {finding.recipients.length}{' '}
            {finding.recipients.length === 1 ? 'recipient is' : 'recipients are'} above their
            optional cap.
          </p>
        </>
      );
    case 'planned_over_budget':
      return (
        <>
          <h3>Your plan is over budget</h3>
          <p>
            Planned spending is {money(finding.amountMinor)} above the season budget. This is a
            forecast, not money spent.
          </p>
        </>
      );
    default:
      return (
        <>
          <h3>Gifts without a planned budget</h3>
          <p>
            {finding.count} {finding.count === 1 ? 'gift has' : 'gifts have'} no planned budget.
            {finding.count === 1 ? ' It adds' : ' They add'} zero to planned spending rather than a
            guessed amount.
          </p>
        </>
      );
  }
}

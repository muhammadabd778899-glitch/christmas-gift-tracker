import { useEffect, useState, type FormEvent } from 'react';
import {
  ArrowRight,
  CalendarDays,
  Check,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { ErrorState } from '../components/ui/ErrorState';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { buttonStyles } from '../components/ui/buttonStyles';
import { useActiveSeason } from '../app/providers/useActiveSeason';
import { useRepositories } from '../app/providers/storageContext';
import { defaultSeasonName, formatDateOnly, upcomingChristmasDate } from '../domain/dates';
import { ValidationError } from '../domain/errors';
import { formatMoney, parseMoneyInput } from '../domain/money';
import { errorMessageFrom, fieldErrorsFrom, type FieldErrors } from '../lib/formErrors';
import styles from './SeasonSetupPage.module.css';

interface SetupValues {
  name: string;
  holidayDate: string;
  budget: string;
}

function initialValues(): SetupValues {
  const holidayDate = upcomingChristmasDate();
  const year = Number(holidayDate.slice(0, 4));

  return {
    name: defaultSeasonName(year),
    holidayDate,
    budget: '',
  };
}

export function SeasonSetupPage() {
  const repositories = useRepositories();
  const navigate = useNavigate();
  const active = useActiveSeason();
  const [values, setValues] = useState<SetupValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (Object.keys(errors).length === 0) {
      return;
    }

    const firstInvalid = document.querySelector<HTMLElement>('[aria-invalid="true"]');
    firstInvalid?.focus();
  }, [errors]);

  if (active.loading) {
    return (
      <div className={styles.page}>
        <PageHeader
          eyebrow="First season"
          title="Setting the scene"
          description="Preparing your local planner."
        />
        <Card>
          <CardContent className={styles.loading} role="status" aria-live="polite">
            <span className={styles.loadingDot} aria-hidden="true" />
            Loading your season…
          </CardContent>
        </Card>
      </div>
    );
  }

  if (active.error || !active.data) {
    return (
      <ErrorState
        title="We could not load your season."
        description="Your data has not been changed. Reload the app and try again. If this continues, do not clear site data."
        actions={<Button onClick={() => window.location.reload()}>Reload app</Button>}
      />
    );
  }

  const { settings, season } = active.data;

  if (season) {
    const archived = season.status === 'archived';

    return (
      <div className={styles.page}>
        <PageHeader
          eyebrow="First season"
          title={archived ? 'This season is archived' : 'Your season is ready'}
          description={
            archived
              ? 'Archived seasons are read-only. Season restoration arrives with the archive tools in Milestone 8.'
              : 'You have already set up an active season. Add the people you are planning for next.'
          }
          badge={
            <Badge tone={archived ? 'neutral' : 'success'}>
              <Check size={12} aria-hidden="true" />
              {archived ? 'Archived' : 'Active'}
            </Badge>
          }
          actions={
            <Link className={buttonStyles({ variant: 'primary' })} to="/recipients">
              {archived ? 'View recipients' : 'Manage recipients'}
              <ArrowRight size={17} aria-hidden="true" />
            </Link>
          }
        />

        <Card className={styles.readyCard}>
          <div className={styles.readyIcon} aria-hidden="true">
            <CalendarDays />
          </div>
          <div className={styles.readyCopy}>
            <p className={styles.readyEyebrow}>Current season</p>
            <h2>{season.name}</h2>
            <p>
              {formatDateOnly(season.holidayDate, settings.locale)}
              <span aria-hidden="true"> · </span>
              {season.budgetMinor === null
                ? 'No overall budget set'
                : `${formatMoney(season.budgetMinor, {
                    fractionDigits: settings.fractionDigits,
                    currencySymbol: settings.currencySymbol,
                    locale: settings.locale,
                  })} season budget`}
            </p>
          </div>
        </Card>

        <p className={styles.smallPrint}>
          The app did not create this season automatically. It exists because someone completed this
          setup and chose to create it.
        </p>
      </div>
    );
  }

  const setField = (field: keyof SetupValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) {
        return current;
      }
      const next = { ...current };
      delete next[field];
      return next;
    });
    setFormError(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    let budgetMinor: number | null;

    try {
      budgetMinor = parseMoneyInput(values.budget, {
        fractionDigits: settings.fractionDigits,
        currencySymbol: settings.currencySymbol,
      });
    } catch (error) {
      if (error instanceof ValidationError) {
        setErrors({ budget: error.issues[0]?.message ?? error.message });
      } else {
        setErrors({ budget: 'Enter a valid amount or leave it blank.' });
      }
      return;
    }

    setSaving(true);

    try {
      await repositories.seasons.create({
        name: values.name,
        holidayDate: values.holidayDate,
        budgetMinor,
      });

      navigate('/recipients', {
        replace: true,
        state: {
          notice: `${values.name.trim()} is ready. Add the first person you are planning for.`,
        },
      });
    } catch (error) {
      const nextErrors = fieldErrorsFrom(error);
      const mappedErrors: FieldErrors = {};

      if (nextErrors.name) mappedErrors.name = nextErrors.name;
      if (nextErrors.holidayDate) mappedErrors.holidayDate = nextErrors.holidayDate;
      if (nextErrors.budgetMinor) mappedErrors.budget = nextErrors.budgetMinor;

      if (Object.keys(mappedErrors).length > 0) {
        setErrors(mappedErrors);
        setSaving(false);
      } else {
        setFormError(
          errorMessageFrom(
            error,
            'The season could not be created. Your other data has not been changed.',
          ),
        );
        setSaving(false);
      }
    }
  };

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="First season"
        title="Set the scene for this Christmas"
        description="Create one season to hold your recipients, gifts, and budget. It is stored only on this device."
        badge={<Badge tone="gold">One small setup step</Badge>}
      />

      <div className={styles.layout}>
        <Card className={styles.formCard}>
          <CardHeader>
            <Badge tone="evergreen">
              <Sparkles size={12} aria-hidden="true" />
              Start here
            </Badge>
            <CardTitle as="h2">Your first season</CardTitle>
            <CardDescription>
              These three details are enough to begin. Season editing arrives with the archive tools
              in Milestone 8.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className={styles.form} onSubmit={handleSubmit} noValidate>
              {formError ? (
                <p className={styles.formError} role="alert">
                  {formError}
                </p>
              ) : null}

              <Input
                id="season-name"
                label="Season name"
                value={values.name}
                onChange={(event) => setField('name', event.target.value)}
                error={errors.name}
                hint="Use the year or a name that means something to you."
                maxLength={80}
                autoComplete="off"
                required
              />

              <Input
                id="season-holiday-date"
                label="Holiday date"
                type="date"
                value={values.holidayDate}
                onChange={(event) => setField('holidayDate', event.target.value)}
                error={errors.holidayDate}
                hint="Christmas Day is suggested, but any date works."
                required
              />

              <Input
                id="season-budget"
                label="Overall season budget (optional)"
                value={values.budget}
                onChange={(event) => setField('budget', event.target.value)}
                error={errors.budget}
                hint={`Leave blank if you have not decided. Amounts use ${settings.currencyCode} (${settings.currencySymbol}).`}
                inputMode="decimal"
                placeholder="For example, 500.00"
                autoComplete="off"
              />

              <div className={styles.formActions}>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Creating season…' : 'Create season'}
                  {!saving ? <ArrowRight size={17} aria-hidden="true" /> : null}
                </Button>
                <span className={styles.safeNote}>
                  <ShieldCheck size={15} aria-hidden="true" />
                  No account, sample people, or gifts will be created.
                </span>
              </div>
            </form>
          </CardContent>
        </Card>

        <aside className={styles.aside} aria-labelledby="setup-next">
          <div className={styles.asideTop}>
            <span className={styles.asideIcon} aria-hidden="true">
              <Users />
            </span>
            <p className={styles.asideEyebrow}>What comes next</p>
            <h2 id="setup-next">People, then presents.</h2>
            <p>
              Once the season exists, you can add the people you are planning for. Gifts arrive in
              the next milestone.
            </p>
          </div>

          <ol className={styles.steps}>
            <li>
              <span className={styles.stepIcon} aria-hidden="true">
                <CalendarDays size={16} />
              </span>
              <div>
                <strong>Create the season</strong>
                <span>Name, date, and an optional overall budget.</span>
              </div>
            </li>
            <li>
              <span className={styles.stepIcon} aria-hidden="true">
                <Users size={16} />
              </span>
              <div>
                <strong>Add recipients</strong>
                <span>Each person can have an optional cap and notes.</span>
              </div>
            </li>
            <li>
              <span className={styles.stepIcon} aria-hidden="true">
                <Wallet size={16} />
              </span>
              <div>
                <strong>Plan with real totals</strong>
                <span>Spending will be calculated from gifts, never typed as a summary.</span>
              </div>
            </li>
          </ol>

          <p className={styles.asideFoot}>
            Nothing leaves this browser. Creating a season will not delete any archived season
            already stored here.
          </p>
        </aside>
      </div>
    </div>
  );
}

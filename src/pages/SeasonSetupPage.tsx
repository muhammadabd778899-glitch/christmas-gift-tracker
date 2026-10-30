import { useEffect, useState, type FormEvent } from 'react';
import {
  Archive,
  ArrowRight,
  CalendarDays,
  Check,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { ErrorState } from '../components/ui/ErrorState';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { Select } from '../components/ui/Select';
import { buttonStyles } from '../components/ui/buttonStyles';
import { useActiveSeason } from '../app/providers/useActiveSeason';
import { useRepositories } from '../app/providers/storageContext';
import { defaultSeasonName, formatDateOnly, upcomingChristmasDate } from '../domain/dates';
import type { ThemePreference } from '../domain/entities';
import { ValidationError } from '../domain/errors';
import { CURRENCY_PRESETS, DEFAULT_CURRENCY, formatMoney, parseMoneyInput } from '../domain/money';
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
  const location = useLocation();
  const active = useActiveSeason();
  const notice = (location.state as { notice?: string } | null)?.notice ?? null;
  const [values, setValues] = useState<SetupValues>(initialValues);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [draftTheme, setDraftTheme] = useState<ThemePreference | null>(null);
  const [draftCurrencyCode, setDraftCurrencyCode] = useState<string | null>(null);
  const [includeSample, setIncludeSample] = useState(false);

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
              ? 'Archived seasons are read-only. Restore this season from Seasons & archives when you want to edit it.'
              : 'You have already set up an active season. Add the people you are planning for next.'
          }
          badge={
            <Badge tone={archived ? 'neutral' : 'success'}>
              <Check size={12} aria-hidden="true" />
              {archived ? 'Archived' : 'Active'}
            </Badge>
          }
          actions={
            <div className={styles.headerActions}>
              <Link className={buttonStyles({ variant: 'secondary' })} to="/seasons">
                <Archive size={16} aria-hidden="true" />
                Seasons &amp; archives
              </Link>
              <Link className={buttonStyles({ variant: 'primary' })} to="/recipients">
                {archived ? 'View recipients' : 'Manage recipients'}
                <ArrowRight size={17} aria-hidden="true" />
              </Link>
            </div>
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

  const theme = draftTheme ?? settings.theme;
  const currencyCode = draftCurrencyCode ?? settings.currencyCode;
  const currency =
    CURRENCY_PRESETS.find((preset) => preset.code === currencyCode) ?? DEFAULT_CURRENCY;

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
        fractionDigits: currency.fractionDigits,
        currencySymbol: currency.symbol,
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

      return;
    }

    let preferencesSaved = true;

    try {
      await repositories.settings.update({
        theme,
        currencyCode: currency.code,
        currencySymbol: currency.symbol,
        fractionDigits: currency.fractionDigits,
        hasCompletedOnboarding: true,
      });
    } catch {
      preferencesSaved = false;
    }

    let sampleNote: string | null = null;

    if (includeSample) {
      try {
        const result = await repositories.data.loadSampleData();
        sampleNote = result.created
          ? 'A flagged sample season was added as archived.'
          : 'Sample data was already loaded.';
      } catch {
        sampleNote =
          'The sample season could not be loaded; you can add it later from Seasons & archives.';
      }
    }

    const noticeParts = [`${values.name.trim()} is ready.`];

    if (!preferencesSaved) {
      noticeParts.push('Your theme or currency choice could not be saved; set them in Settings.');
    }

    if (sampleNote) {
      noticeParts.push(sampleNote);
    }

    navigate('/', { replace: true, state: { notice: noticeParts.join(' ') } });
  };

  return (
    <div className={styles.page}>
      {notice ? (
        <p className={styles.notice} role="status" aria-live="polite">
          {notice}
        </p>
      ) : null}
      <PageHeader
        eyebrow="First season"
        title="Set the scene for this Christmas"
        description="Welcome. Create one season to hold your recipients, gifts, and budget. Everything you save stays in this browser — no account, no uploads."
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
              These three details are enough to begin. You can edit them later from Seasons &amp;
              archives.
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
                hint={`Leave blank if you have not decided. Amounts use ${currency.code} (${currency.symbol}).`}
                inputMode="decimal"
                placeholder="For example, 500.00"
                autoComplete="off"
              />

              <fieldset className={styles.preferences}>
                <legend>Preferences</legend>
                <p>Defaults are fine. You can change both later in Settings.</p>
                <div className={styles.preferenceGrid}>
                  <Select
                    id="setup-theme"
                    label="Theme"
                    value={theme}
                    onChange={(event) => setDraftTheme(event.target.value as ThemePreference)}
                    hint="System follows this device’s light or dark setting."
                  >
                    <option value="system">System</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </Select>
                  <Select
                    id="setup-currency"
                    label="Currency"
                    value={currency.code}
                    onChange={(event) => setDraftCurrencyCode(event.target.value)}
                    hint="Display-only. Presets set the symbol and decimal places."
                  >
                    {CURRENCY_PRESETS.map((preset) => (
                      <option key={preset.code} value={preset.code}>
                        {preset.code} — {preset.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </fieldset>

              <label className={styles.sampleRow}>
                <input
                  type="checkbox"
                  checked={includeSample}
                  onChange={(event) => setIncludeSample(event.target.checked)}
                  aria-label="Load the optional sample season"
                />
                <span>
                  <strong>Load the optional sample season</strong>
                  <span>
                    A flagged example with two people and three gifts. It is added as archived, so
                    it never changes your totals, and you can remove it anytime.
                  </span>
                </span>
              </label>

              <div className={styles.formActions}>
                <Button type="submit" disabled={saving}>
                  {saving ? 'Creating season…' : 'Create season'}
                  {!saving ? <ArrowRight size={17} aria-hidden="true" /> : null}
                </Button>
                <span className={styles.safeNote}>
                  <ShieldCheck size={15} aria-hidden="true" />
                  No account is created. Sample records load only if you tick the box.
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
              Once the season exists, add the people you are planning for. You can then record
              gifts, costs, and purchase status from the Gifts page.
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

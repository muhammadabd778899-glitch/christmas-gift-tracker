import { useEffect, useState } from 'react';
import { Coins, Download, Monitor, Moon, Palette, Sun } from 'lucide-react';
import { useRepositories } from '../../app/providers/storageContext';
import { useTheme } from '../../app/providers/useTheme';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../../components/ui/Card';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import type { AppSettings, FractionDigits, ThemePreference } from '../../domain/entities';
import { CURRENCY_PRESETS, formatMoney } from '../../domain/money';
import { downloadTextFile } from '../../lib/download';
import { errorMessageFrom, fieldErrorsFrom, type FieldErrors } from '../../lib/formErrors';
import styles from './AppearanceSettings.module.css';

const themeOptions: {
  value: ThemePreference;
  label: string;
  description: string;
  icon: typeof Sun;
}[] = [
  {
    value: 'light',
    label: 'Light',
    description: 'Warm paper, evergreen ink, and soft gold light.',
    icon: Sun,
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'Deep evergreen panels for low-light planning.',
    icon: Moon,
  },
  {
    value: 'system',
    label: 'System',
    description: 'Follow this device’s light or dark setting.',
    icon: Monitor,
  },
];

const fractionOptions: FractionDigits[] = [0, 1, 2, 3];

interface CurrencyDraft {
  currencyCode: string;
  currencySymbol: string;
  fractionDigits: FractionDigits;
}

function presetFor(draft: CurrencyDraft): string {
  const match = CURRENCY_PRESETS.find(
    (preset) =>
      preset.code === draft.currencyCode &&
      preset.symbol === draft.currencySymbol &&
      preset.fractionDigits === draft.fractionDigits,
  );

  return match?.code ?? 'custom';
}

function validateCurrency(draft: CurrencyDraft): FieldErrors {
  const errors: FieldErrors = {};
  const code = draft.currencyCode.trim().toUpperCase();
  const symbol = draft.currencySymbol.trim();

  if (!/^[A-Z]{3}$/.test(code)) {
    errors.currencyCode = 'Use a three-letter currency code, such as USD.';
  }

  if (symbol.length === 0) {
    errors.currencySymbol = 'Enter a currency symbol.';
  } else if (symbol.length > 4) {
    errors.currencySymbol = 'The currency symbol must be 4 characters or fewer.';
  }

  if (![0, 1, 2, 3].includes(draft.fractionDigits)) {
    errors.fractionDigits = 'Choose between 0 and 3 decimal places.';
  }

  return errors;
}

interface AppearanceSettingsProps {
  settings: AppSettings;
}

export function AppearanceSettings({ settings }: AppearanceSettingsProps) {
  const repositories = useRepositories();
  const { setPreference } = useTheme();
  const [themeBusy, setThemeBusy] = useState(false);
  const [themeMessage, setThemeMessage] = useState<string | null>(null);
  const [themeError, setThemeError] = useState(false);

  const [preset, setPreset] = useState(() => presetFor(settings));
  const [currencyCode, setCurrencyCode] = useState(settings.currencyCode);
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol);
  const [fractionDigits, setFractionDigits] = useState<FractionDigits>(settings.fractionDigits);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingCurrency, setPendingCurrency] = useState<CurrencyDraft | null>(null);
  const [backingUp, setBackingUp] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);

  const draft: CurrencyDraft = {
    currencyCode: currencyCode.trim().toUpperCase(),
    currencySymbol: currencySymbol.trim(),
    fractionDigits,
  };
  const changed =
    draft.currencyCode !== settings.currencyCode ||
    draft.currencySymbol !== settings.currencySymbol ||
    draft.fractionDigits !== settings.fractionDigits;

  useEffect(() => {
    if (!themeMessage) {
      return;
    }

    const timer = window.setTimeout(() => setThemeMessage(null), 4000);
    return () => window.clearTimeout(timer);
  }, [themeMessage]);

  async function chooseTheme(next: ThemePreference) {
    setThemeBusy(true);
    setThemeError(false);
    setThemeMessage(null);

    try {
      await setPreference(next);
      setThemeMessage(
        `${themeOptions.find((option) => option.value === next)?.label} theme saved.`,
      );
    } catch (error) {
      setThemeError(true);
      setThemeMessage(errorMessageFrom(error, 'The theme could not be saved. Try again.'));
    } finally {
      setThemeBusy(false);
    }
  }

  function choosePreset(code: string) {
    setPreset(code);
    setStatus(null);
    setFormError(null);

    if (code === 'custom') {
      return;
    }

    const presetDefinition = CURRENCY_PRESETS.find((option) => option.code === code);
    if (!presetDefinition) {
      return;
    }

    setCurrencyCode(presetDefinition.code);
    setCurrencySymbol(presetDefinition.symbol);
    setFractionDigits(presetDefinition.fractionDigits);
    setFieldErrors({});
  }

  function editDraft(update: () => void) {
    update();
    setPreset('custom');
    setStatus(null);
    setFormError(null);
    setFieldErrors({});
  }

  async function saveCurrency(value: CurrencyDraft) {
    setSaving(true);
    setFormError(null);

    try {
      await repositories.settings.update(value);
      setConfirmOpen(false);
      setPendingCurrency(null);
      setStatus('Currency display saved. Stored amounts were not converted.');
    } catch (error) {
      setFieldErrors(fieldErrorsFrom(error));
      setFormError(errorMessageFrom(error, 'The currency display could not be saved.'));
    } finally {
      setSaving(false);
    }
  }

  async function submitCurrency() {
    const errors = validateCurrency(draft);
    setFieldErrors(errors);
    setFormError(null);
    setStatus(null);

    if (Object.keys(errors).length > 0) {
      return;
    }

    if (!changed) {
      setStatus('These currency display settings are already saved.');
      return;
    }

    try {
      if (await repositories.data.hasMonetaryData()) {
        setPendingCurrency(draft);
        setConfirmOpen(true);
        return;
      }
    } catch (error) {
      setFormError(
        errorMessageFrom(error, 'The saved amounts could not be checked. Nothing was changed.'),
      );
      return;
    }

    await saveCurrency(draft);
  }

  async function downloadBackup() {
    setBackingUp(true);
    setBackupMessage(null);

    try {
      const backup = await repositories.data.exportBackup();
      downloadTextFile(backup.filename, backup.content, 'application/json');
      setBackupMessage('Backup downloaded. Stored values are unchanged.');
    } catch (error) {
      setBackupMessage(errorMessageFrom(error, 'The backup could not be downloaded.'));
    } finally {
      setBackingUp(false);
    }
  }

  const preview = formatMoney(123_456, {
    fractionDigits: draft.fractionDigits,
    currencySymbol: draft.currencySymbol || settings.currencySymbol,
    locale: settings.locale,
  });

  return (
    <div className={styles.stack}>
      <Card>
        <CardHeader>
          <Badge tone="evergreen">
            <Palette size={12} aria-hidden="true" />
            Appearance
          </Badge>
          <CardTitle as="h2">Theme</CardTitle>
          <CardDescription>
            The choice is saved in this browser’s local database. System follows this device until
            you pick a fixed theme.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <fieldset className={styles.themeFieldset} disabled={themeBusy}>
            <legend className={styles.legend}>Colour theme</legend>
            <div className={styles.themeOptions}>
              {themeOptions.map((option) => {
                const Icon = option.icon;
                const checked = settings.theme === option.value;

                return (
                  <label
                    key={option.value}
                    className={styles.themeOption}
                    data-checked={checked || undefined}
                  >
                    <input
                      className={styles.radio}
                      type="radio"
                      name="theme"
                      value={option.value}
                      checked={checked}
                      onChange={() => void chooseTheme(option.value)}
                    />
                    <span className={styles.themeIcon} aria-hidden="true">
                      <Icon />
                    </span>
                    <span className={styles.themeCopy}>
                      <strong>{option.label}</strong>
                      <span>{option.description}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>
          {themeMessage ? (
            <p
              className={themeError ? styles.error : styles.success}
              role={themeError ? 'alert' : 'status'}
            >
              {themeMessage}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Badge tone="gold">
            <Coins size={12} aria-hidden="true" />
            Currency
          </Badge>
          <CardTitle as="h2">Currency display</CardTitle>
          <CardDescription>
            Choose how saved amounts are shown. This is display-only: changing it never converts or
            rewrites stored values.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className={styles.currencyForm}>
            <Select
              id="currency-preset"
              label="Currency"
              value={preset}
              onChange={(event) => choosePreset(event.target.value)}
              hint="Pick a common currency or set a custom code and symbol."
            >
              {CURRENCY_PRESETS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.code} — {option.label}
                </option>
              ))}
              <option value="custom">Custom currency</option>
            </Select>

            <div className={styles.currencyRow}>
              <Input
                id="currency-code"
                label="Currency code"
                value={currencyCode}
                onChange={(event) => editDraft(() => setCurrencyCode(event.target.value))}
                error={fieldErrors.currencyCode}
                hint="Three letters, such as USD."
                maxLength={3}
                autoComplete="off"
                spellCheck={false}
              />
              <Input
                id="currency-symbol"
                label="Symbol"
                value={currencySymbol}
                onChange={(event) => editDraft(() => setCurrencySymbol(event.target.value))}
                error={fieldErrors.currencySymbol}
                hint="Up to four characters."
                maxLength={4}
                autoComplete="off"
              />
              <Select
                id="currency-digits"
                label="Decimal places"
                value={String(fractionDigits)}
                onChange={(event) =>
                  editDraft(() => setFractionDigits(Number(event.target.value) as FractionDigits))
                }
                error={fieldErrors.fractionDigits}
              >
                {fractionOptions.map((digits) => (
                  <option key={digits} value={digits}>
                    {digits}
                  </option>
                ))}
              </Select>
            </div>

            <div className={styles.preview} aria-live="polite">
              <span className={styles.previewLabel}>Preview</span>
              <strong>{preview}</strong>
              <span>
                {draft.currencyCode || '—'} · {draft.fractionDigits} decimal place
                {draft.fractionDigits === 1 ? '' : 's'}
              </span>
            </div>

            {formError ? (
              <p className={styles.error} role="alert">
                {formError}
              </p>
            ) : null}
            {status ? (
              <p className={styles.success} role="status">
                {status}
              </p>
            ) : null}

            <div className={styles.actions}>
              <Button onClick={() => void submitCurrency()} disabled={saving}>
                {saving ? 'Saving…' : 'Save currency display'}
              </Button>
              <span className={styles.smallPrint}>
                Existing amounts keep their stored minor-unit values.
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={confirmOpen}
        onClose={() => (saving ? undefined : setConfirmOpen(false))}
        title="Change how money is displayed?"
        description="Saved seasons, caps, costs, and ideas already contain monetary values."
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={() => void downloadBackup()} disabled={backingUp}>
              <Download size={16} aria-hidden="true" />
              {backingUp ? 'Preparing…' : 'Download backup'}
            </Button>
            <Button
              onClick={() => (pendingCurrency ? void saveCurrency(pendingCurrency) : undefined)}
              disabled={saving || !pendingCurrency}
            >
              {saving ? 'Saving…' : 'Save display settings'}
            </Button>
          </>
        }
      >
        <div className={styles.confirmBody}>
          <p>
            This changes only how amounts are formatted. It does not convert currencies, change any
            stored value, or rewrite existing gifts and budgets.
          </p>
          <p>
            Consider downloading a backup first so you have a recovery copy of the current data.
          </p>
          {backupMessage ? (
            <p className={styles.smallPrint} role="status">
              {backupMessage}
            </p>
          ) : null}
        </div>
      </Dialog>
    </div>
  );
}

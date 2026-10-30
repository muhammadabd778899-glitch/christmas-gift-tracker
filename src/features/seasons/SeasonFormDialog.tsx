import { useEffect, useId, useState, type FormEvent } from 'react';
import { Archive, Copy } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { defaultSeasonName, formatDateOnly, upcomingChristmasDate } from '../../domain/dates';
import type { AppSettings, Season, SeasonId } from '../../domain/entities';
import { ValidationError } from '../../domain/errors';
import { formatMinorUnitsForInput, parseMoneyInput } from '../../domain/money';
import { errorMessageFrom, fieldErrorsFrom, type FieldErrors } from '../../lib/formErrors';
import { useRepositories } from '../../app/providers/storageContext';
import styles from './SeasonDialogs.module.css';

export interface CopySource {
  id: SeasonId;
  name: string;
  recipientCount: number;
}

interface SeasonFormDialogProps {
  season: Season | null;
  activeSeason: Season | null;
  copySources: CopySource[];
  settings: AppSettings;
  onClose: () => void;
  onSaved: (message: string) => void;
}

interface FormValues {
  name: string;
  holidayDate: string;
  budget: string;
  copyRecipients: boolean;
  copyFromId: string;
  archiveCurrent: boolean;
}

function createValues(copySources: CopySource[]): FormValues {
  const holidayDate = upcomingChristmasDate();
  const year = Number(holidayDate.slice(0, 4));

  return {
    name: defaultSeasonName(year),
    holidayDate,
    budget: '',
    copyRecipients: false,
    copyFromId: copySources[0]?.id ?? '',
    archiveCurrent: false,
  };
}

function editValues(season: Season, settings: AppSettings): FormValues {
  return {
    name: season.name,
    holidayDate: season.holidayDate,
    budget: formatMinorUnitsForInput(season.budgetMinor, settings.fractionDigits),
    copyRecipients: false,
    copyFromId: '',
    archiveCurrent: false,
  };
}

export function SeasonFormDialog({
  season,
  activeSeason,
  copySources,
  settings,
  onClose,
  onSaved,
}: SeasonFormDialogProps) {
  const repositories = useRepositories();
  const formId = useId().replaceAll(':', '');
  const editing = season !== null;
  const [values, setValues] = useState<FormValues>(() =>
    season ? editValues(season, settings) : createValues(copySources),
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (Object.keys(errors).length === 0) {
      return;
    }

    document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [errors]);

  const setField = <K extends keyof FormValues>(field: K, value: FormValues[K]) => {
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

  const close = () => {
    if (!saving) {
      onClose();
    }
  };

  const needsArchiveConsent = !editing && activeSeason !== null;
  const submitDisabled =
    saving ||
    (!editing && needsArchiveConsent && !values.archiveCurrent) ||
    (values.copyRecipients && !values.copyFromId);

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
      setErrors({
        budget:
          error instanceof ValidationError
            ? (error.issues[0]?.message ?? error.message)
            : 'Enter a valid amount or leave it blank.',
      });
      return;
    }

    setSaving(true);

    try {
      if (season) {
        await repositories.seasons.update(season.id, {
          name: values.name,
          holidayDate: values.holidayDate,
          budgetMinor,
        });
        onSaved(`${values.name.trim()} was updated.`);
        return;
      }

      const created = await repositories.seasons.create(
        {
          name: values.name,
          holidayDate: values.holidayDate,
          budgetMinor,
        },
        {
          copyRecipientsFromId:
            values.copyRecipients && values.copyFromId
              ? (values.copyFromId as SeasonId)
              : undefined,
          archiveCurrent: needsArchiveConsent ? values.archiveCurrent : false,
        },
      );

      const parts = [`${created.name} is active.`];

      if (needsArchiveConsent && activeSeason) {
        parts.push(`${activeSeason.name} was archived, not deleted.`);
      }
      if (values.copyRecipients) {
        parts.push('Recipients were copied without gifts or ideas.');
      }

      onSaved(parts.join(' '));
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
          errorMessageFrom(error, 'The season could not be saved. Your data has not been changed.'),
        );
        setSaving(false);
      }
    }
  };

  return (
    <Dialog
      open
      onClose={close}
      title={editing ? 'Edit season' : 'Create a season'}
      description={
        editing
          ? 'Season details are used on the dashboard, exports, and backups.'
          : 'Each season has its own recipients, gifts, ideas, and budget. Creating one never deletes another.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={submitDisabled}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Create season'}
          </Button>
        </>
      }
    >
      <form id={formId} className={styles.form} onSubmit={handleSubmit} noValidate>
        {formError ? (
          <p className={styles.formError} role="alert">
            {formError}
          </p>
        ) : null}

        <Input
          id="season-form-name"
          label="Season name"
          value={values.name}
          onChange={(event) => setField('name', event.target.value)}
          error={errors.name}
          hint="Use the year or a name that means something to you. Up to 80 characters."
          autoComplete="off"
          required
        />

        <Input
          id="season-form-date"
          label="Holiday date"
          type="date"
          value={values.holidayDate}
          onChange={(event) => setField('holidayDate', event.target.value)}
          error={errors.holidayDate}
          hint={`Christmas Day is suggested. Shown as ${formatDateOnly(values.holidayDate, settings.locale)} when valid.`}
          required
        />

        <Input
          id="season-form-budget"
          label="Overall season budget (optional)"
          value={values.budget}
          onChange={(event) => setField('budget', event.target.value)}
          error={errors.budget}
          hint={`Leave blank for no overall limit. Amounts use ${settings.currencyCode} (${settings.currencySymbol}).`}
          inputMode="decimal"
          placeholder="For example, 500.00"
          autoComplete="off"
        />

        {!editing && copySources.length > 0 ? (
          <fieldset className={styles.choiceGroup}>
            <legend>Start from another season</legend>
            <label className={styles.checkboxRow}>
              <input
                type="checkbox"
                checked={values.copyRecipients}
                aria-label="Copy recipient names, relationships, caps, and notes"
                onChange={(event) => {
                  setField('copyRecipients', event.target.checked);
                  if (!event.target.checked) {
                    setField('copyFromId', '');
                  } else if (!values.copyFromId) {
                    setField('copyFromId', copySources[0]?.id ?? '');
                  }
                }}
              />
              <span>
                <strong>Copy recipient names, relationships, caps, and notes</strong>
                <span>Gifts and ideas are never copied. New recipient IDs are created.</span>
              </span>
            </label>

            {values.copyRecipients ? (
              <Select
                id="season-copy-source"
                label="Copy recipients from"
                value={values.copyFromId}
                onChange={(event) => setField('copyFromId', event.target.value)}
                containerClassName={styles.choiceField}
              >
                {copySources.map((source) => (
                  <option key={source.id} value={source.id}>
                    {source.name} · {source.recipientCount}{' '}
                    {source.recipientCount === 1 ? 'recipient' : 'recipients'}
                  </option>
                ))}
              </Select>
            ) : null}
          </fieldset>
        ) : null}

        {needsArchiveConsent && activeSeason ? (
          <div className={styles.callout}>
            <span className={styles.calloutIcon} aria-hidden="true">
              <Archive size={18} />
            </span>
            <div>
              <strong>Archive the current season first</strong>
              <p>
                {activeSeason.name} is active. Creating this season archives it in the same step.
                Nothing is deleted, and you can restore it later.
              </p>
              <label className={styles.checkboxRow}>
                <input
                  type="checkbox"
                  checked={values.archiveCurrent}
                  aria-label={`Archive ${activeSeason.name} and make this season active`}
                  onChange={(event) => setField('archiveCurrent', event.target.checked)}
                />
                <span>
                  <strong>Archive {activeSeason.name} and make this season active</strong>
                </span>
              </label>
            </div>
          </div>
        ) : !editing ? (
          <p className={styles.simpleNote}>
            <Copy size={15} aria-hidden="true" />
            This season will become active. No existing season is changed.
          </p>
        ) : null}
      </form>
    </Dialog>
  );
}

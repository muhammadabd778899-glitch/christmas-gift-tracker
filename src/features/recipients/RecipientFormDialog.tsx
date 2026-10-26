import { useEffect, useId, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Textarea } from '../../components/ui/Textarea';
import type { AppSettings, Recipient, Season } from '../../domain/entities';
import { ValidationError } from '../../domain/errors';
import { formatMinorUnitsForInput, parseMoneyInput } from '../../domain/money';
import { errorMessageFrom, fieldErrorsFrom, type FieldErrors } from '../../lib/formErrors';
import { useRepositories } from '../../app/providers/storageContext';
import styles from './RecipientDialogs.module.css';

interface RecipientFormDialogProps {
  recipient: Recipient | null;
  season: Season;
  settings: AppSettings;
  onClose: () => void;
  onSaved: (message: string) => void;
}

interface FormValues {
  name: string;
  relationship: string;
  budgetCap: string;
  notes: string;
}

function initialValues(recipient: Recipient | null, settings: AppSettings): FormValues {
  if (!recipient) {
    return { name: '', relationship: '', budgetCap: '', notes: '' };
  }

  return {
    name: recipient.name,
    relationship: recipient.relationship ?? '',
    budgetCap: formatMinorUnitsForInput(recipient.budgetCapMinor, settings.fractionDigits),
    notes: recipient.notes ?? '',
  };
}

export function RecipientFormDialog({
  recipient,
  season,
  settings,
  onClose,
  onSaved,
}: RecipientFormDialogProps) {
  const repositories = useRepositories();
  const formId = useId().replaceAll(':', '');
  const [values, setValues] = useState(() => initialValues(recipient, settings));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const editing = recipient !== null;

  useEffect(() => {
    if (Object.keys(errors).length === 0) {
      return;
    }

    const firstInvalid = document.querySelector<HTMLElement>('[aria-invalid="true"]');
    firstInvalid?.focus();
  }, [errors]);

  const setField = (field: keyof FormValues, value: string) => {
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    let budgetCapMinor: number | null;

    try {
      budgetCapMinor = parseMoneyInput(values.budgetCap, {
        fractionDigits: settings.fractionDigits,
        currencySymbol: settings.currencySymbol,
      });
    } catch (error) {
      setErrors({
        budgetCap:
          error instanceof ValidationError
            ? (error.issues[0]?.message ?? error.message)
            : 'Enter a valid amount or leave it blank.',
      });
      return;
    }

    setSaving(true);

    try {
      if (recipient) {
        await repositories.recipients.update(recipient.id, {
          name: values.name,
          relationship: values.relationship || null,
          budgetCapMinor,
          notes: values.notes || null,
        });
        onSaved(`${values.name.trim()} was updated.`);
      } else {
        await repositories.recipients.create({
          seasonId: season.id,
          name: values.name,
          relationship: values.relationship || null,
          budgetCapMinor,
          notes: values.notes || null,
        });
        onSaved(`${values.name.trim()} was added.`);
      }
    } catch (error) {
      const nextErrors = fieldErrorsFrom(error);
      const mappedErrors: FieldErrors = {};

      if (nextErrors.name) mappedErrors.name = nextErrors.name;
      if (nextErrors.relationship) mappedErrors.relationship = nextErrors.relationship;
      if (nextErrors.budgetCapMinor) mappedErrors.budgetCap = nextErrors.budgetCapMinor;
      if (nextErrors.notes) mappedErrors.notes = nextErrors.notes;

      if (Object.keys(mappedErrors).length > 0) {
        setErrors(mappedErrors);
      } else {
        setFormError(
          errorMessageFrom(
            error,
            'The recipient could not be saved. Your data has not been changed.',
          ),
        );
      }
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onClose={close}
      title={editing ? 'Edit recipient' : 'Add a recipient'}
      description={
        editing
          ? 'Changes are saved on this device and update the list immediately.'
          : 'Only a name is required. You can add a relationship, cap, and notes now or later.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add recipient'}
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
          id="recipient-name"
          label="Name"
          value={values.name}
          onChange={(event) => setField('name', event.target.value)}
          error={errors.name}
          hint="Duplicate names are allowed; each person keeps a separate record. Up to 80 characters."
          autoComplete="off"
          required
        />

        <Input
          id="recipient-relationship"
          label="Relationship (optional)"
          value={values.relationship}
          onChange={(event) => setField('relationship', event.target.value)}
          error={errors.relationship}
          hint="For example: partner, parent, friend, colleague."
          maxLength={40}
          autoComplete="off"
        />

        <Input
          id="recipient-cap"
          label="Budget cap (optional)"
          value={values.budgetCap}
          onChange={(event) => setField('budgetCap', event.target.value)}
          error={errors.budgetCap}
          hint={`Leave blank for no cap. Use ${settings.currencyCode} (${settings.currencySymbol}); zero is a real cap.`}
          inputMode="decimal"
          placeholder="For example, 150.00"
          autoComplete="off"
        />

        <Textarea
          id="recipient-notes"
          label="Notes (optional)"
          value={values.notes}
          onChange={(event) => setField('notes', event.target.value)}
          error={errors.notes}
          hint="Sizes, preferences, or gift ideas. This stays on this device."
          maxLength={2000}
          rows={4}
        />
      </form>
    </Dialog>
  );
}

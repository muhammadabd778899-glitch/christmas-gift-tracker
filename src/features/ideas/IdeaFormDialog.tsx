import { useEffect, useId, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import type { AppSettings, Idea, Recipient, Season } from '../../domain/entities';
import { ValidationError } from '../../domain/errors';
import { formatMinorUnitsForInput, parseMoneyInput } from '../../domain/money';
import { errorMessageFrom, fieldErrorsFrom, type FieldErrors } from '../../lib/formErrors';
import { useRepositories } from '../../app/providers/storageContext';
import styles from './IdeaFormDialog.module.css';

interface IdeaFormDialogProps {
  idea: Idea | null;
  season: Season;
  recipients: Recipient[];
  settings: AppSettings;
  onClose: () => void;
  onSaved: (message: string) => void;
}

interface FormValues {
  name: string;
  recipientId: string;
  category: string;
  store: string;
  purchaseUrl: string;
  estimatedPrice: string;
  notes: string;
}

function initialValues(idea: Idea | null, settings: AppSettings): FormValues {
  if (!idea) {
    return {
      name: '',
      recipientId: '',
      category: '',
      store: '',
      purchaseUrl: '',
      estimatedPrice: '',
      notes: '',
    };
  }

  return {
    name: idea.name,
    recipientId: idea.recipientId ?? '',
    category: idea.category ?? '',
    store: idea.store ?? '',
    purchaseUrl: idea.purchaseUrl ?? '',
    estimatedPrice: formatMinorUnitsForInput(idea.estimatedPriceMinor, settings.fractionDigits),
    notes: idea.notes ?? '',
  };
}

export function IdeaFormDialog({
  idea,
  season,
  recipients,
  settings,
  onClose,
  onSaved,
}: IdeaFormDialogProps) {
  const repositories = useRepositories();
  const formId = useId().replaceAll(':', '');
  const editing = idea !== null;
  const [values, setValues] = useState(() => initialValues(idea, settings));
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (Object.keys(errors).length === 0) {
      return;
    }

    document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
  }, [errors]);

  const setField = (field: keyof FormValues, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const key = field === 'estimatedPrice' ? 'estimatedPriceMinor' : field;
      if (!current[key]) {
        return current;
      }
      const next = { ...current };
      delete next[key];
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

    let estimatedPriceMinor: number | null;

    try {
      estimatedPriceMinor = parseMoneyInput(values.estimatedPrice, {
        fractionDigits: settings.fractionDigits,
        currencySymbol: settings.currencySymbol,
      });
    } catch (error) {
      setErrors({
        estimatedPriceMinor:
          error instanceof ValidationError
            ? (error.issues[0]?.message ?? error.message)
            : 'Enter a valid amount or leave it blank.',
      });
      return;
    }

    setSaving(true);

    try {
      const fields = {
        name: values.name,
        recipientId: values.recipientId || null,
        category: values.category || null,
        store: values.store || null,
        purchaseUrl: values.purchaseUrl || null,
        estimatedPriceMinor,
        notes: values.notes || null,
      };

      if (idea) {
        await repositories.ideas.update(idea.id, fields);
        onSaved(`${values.name.trim()} was updated.`);
      } else {
        await repositories.ideas.create({ seasonId: season.id, ...fields });
        onSaved(`${values.name.trim()} was added to the Idea Bank.`);
      }
    } catch (error) {
      const nextErrors = fieldErrorsFrom(error);
      const mappedErrors: FieldErrors = {};

      if (nextErrors.name) mappedErrors.name = nextErrors.name;
      if (nextErrors.recipientId) mappedErrors.recipientId = nextErrors.recipientId;
      if (nextErrors.category) mappedErrors.category = nextErrors.category;
      if (nextErrors.store) mappedErrors.store = nextErrors.store;
      if (nextErrors.purchaseUrl) mappedErrors.purchaseUrl = nextErrors.purchaseUrl;
      if (nextErrors.estimatedPriceMinor) {
        mappedErrors.estimatedPriceMinor = nextErrors.estimatedPriceMinor;
      }
      if (nextErrors.notes) mappedErrors.notes = nextErrors.notes;

      if (Object.keys(mappedErrors).length > 0) {
        setErrors(mappedErrors);
      } else {
        setFormError(
          errorMessageFrom(error, 'The idea could not be saved. Your data has not been changed.'),
        );
      }
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onClose={close}
      title={editing ? 'Edit idea' : 'Add an idea'}
      description={
        editing
          ? 'Changes are saved on this device and update the Idea Bank immediately.'
          : 'Ideas are possibilities, not gifts yet. They do not affect budgets or the shopping list until you convert one.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add idea'}
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
          id="idea-name"
          label="Idea name"
          value={values.name}
          onChange={(event) => setField('name', event.target.value)}
          error={errors.name}
          hint="Required. Up to 120 characters."
          autoComplete="off"
          required
        />

        <Select
          id="idea-recipient"
          label="Recipient (optional)"
          value={values.recipientId}
          onChange={(event) => setField('recipientId', event.target.value)}
          error={errors.recipientId}
          hint="You can leave this blank and choose a recipient when you convert the idea."
        >
          <option value="">No recipient yet</option>
          {recipients.map((recipient) => (
            <option key={recipient.id} value={recipient.id}>
              {recipient.name}
            </option>
          ))}
        </Select>

        <div className={styles.twoCol}>
          <Input
            id="idea-category"
            label="Category (optional)"
            value={values.category}
            onChange={(event) => setField('category', event.target.value)}
            error={errors.category}
            hint="For example: books, clothing, tech."
            maxLength={40}
            autoComplete="off"
          />
          <Input
            id="idea-store"
            label="Store (optional)"
            value={values.store}
            onChange={(event) => setField('store', event.target.value)}
            error={errors.store}
            hint="Used when this idea becomes a shopping-list item."
            maxLength={80}
            autoComplete="off"
          />
        </div>

        <Input
          id="idea-url"
          label="Purchase link (optional)"
          value={values.purchaseUrl}
          onChange={(event) => setField('purchaseUrl', event.target.value)}
          error={errors.purchaseUrl}
          hint="A complete http:// or https:// link. It opens in a new tab."
          inputMode="url"
          autoComplete="off"
        />

        <Input
          id="idea-price"
          label="Estimated price (optional)"
          value={values.estimatedPrice}
          onChange={(event) => setField('estimatedPrice', event.target.value)}
          error={errors.estimatedPriceMinor}
          hint={`Copied to the gift's planned budget when converted. Use ${settings.currencyCode} (${settings.currencySymbol}).`}
          inputMode="decimal"
          placeholder="For example, 25.00"
          autoComplete="off"
        />

        <Textarea
          id="idea-notes"
          label="Notes (optional)"
          value={values.notes}
          onChange={(event) => setField('notes', event.target.value)}
          error={errors.notes}
          hint="Sizes, colours, or why this idea fits. This stays on this device."
          maxLength={2000}
          rows={4}
        />
      </form>
    </Dialog>
  );
}

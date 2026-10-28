import { useEffect, useId, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import type { AppSettings, Season } from '../../domain/entities';
import { ValidationError } from '../../domain/errors';
import { formatMinorUnitsForInput, parseMoneyInput } from '../../domain/money';
import { errorMessageFrom, fieldErrorsFrom } from '../../lib/formErrors';
import { useRepositories } from '../../app/providers/storageContext';
import styles from './SeasonBudgetDialog.module.css';

interface SeasonBudgetDialogProps {
  season: Season;
  settings: AppSettings;
  onClose: () => void;
  onSaved: (message: string) => void;
}

export function SeasonBudgetDialog({
  season,
  settings,
  onClose,
  onSaved,
}: SeasonBudgetDialogProps) {
  const repositories = useRepositories();
  const formId = useId().replaceAll(':', '');
  const [budget, setBudget] = useState(() =>
    formatMinorUnitsForInput(season.budgetMinor, settings.fractionDigits),
  );
  const [budgetError, setBudgetError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (budgetError) {
      document.getElementById('season-budget')?.focus();
    }
  }, [budgetError]);

  const close = () => {
    if (!saving) {
      onClose();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBudgetError(null);
    setFormError(null);

    let budgetMinor: number | null;

    try {
      budgetMinor = parseMoneyInput(budget, {
        fractionDigits: settings.fractionDigits,
        currencySymbol: settings.currencySymbol,
      });
    } catch (error) {
      setBudgetError(
        error instanceof ValidationError
          ? (error.issues[0]?.message ?? error.message)
          : 'Enter a valid amount or leave it blank.',
      );
      return;
    }

    setSaving(true);

    try {
      await repositories.seasons.update(season.id, { budgetMinor });
      onSaved(budgetMinor === null ? 'Season budget removed.' : 'Season budget updated.');
    } catch (error) {
      const fieldErrors = fieldErrorsFrom(error);
      if (fieldErrors.budgetMinor) {
        setBudgetError(fieldErrors.budgetMinor);
      } else {
        setFormError(
          errorMessageFrom(error, 'The budget could not be saved. Your data has not been changed.'),
        );
      }
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onClose={close}
      title={season.budgetMinor === null ? 'Set season budget' : 'Edit season budget'}
      description="An overall limit for the whole season. It is separate from each recipient's optional cap."
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={saving}>
            {saving ? 'Saving…' : 'Save budget'}
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
          id="season-budget"
          label="Overall season budget (optional)"
          value={budget}
          onChange={(event) => {
            setBudget(event.target.value);
            setBudgetError(null);
            setFormError(null);
          }}
          error={budgetError ?? undefined}
          hint={`Leave blank for no overall limit. Use ${settings.currencyCode} (${settings.currencySymbol}); zero is a real limit.`}
          inputMode="decimal"
          placeholder="For example, 500.00"
          autoComplete="off"
        />

        <p className={styles.note}>
          Planned spending is what you expect gifts to cost. Actual spending is what you have paid
          for bought gifts. Neither is changed when you edit this limit.
        </p>
      </form>
    </Dialog>
  );
}

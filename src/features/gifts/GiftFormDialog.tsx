import { useEffect, useId, useState, type FormEvent } from 'react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Textarea } from '../../components/ui/Textarea';
import type { AppSettings, Gift, Recipient, Season } from '../../domain/entities';
import { localToday } from '../../domain/dates';
import { ValidationError } from '../../domain/errors';
import { formatMinorUnitsForInput, parseMoneyInput } from '../../domain/money';
import { errorMessageFrom, fieldErrorsFrom, type FieldErrors } from '../../lib/formErrors';
import { useRepositories } from '../../app/providers/storageContext';
import styles from './GiftFormDialog.module.css';

interface GiftFormDialogProps {
  gift: Gift | null; // null = adding new
  season: Season;
  recipients: Recipient[];
  settings: AppSettings;
  defaultRecipientId?: string;
  onClose: () => void;
  onSaved: (message: string) => void;
}

interface FormValues {
  name: string;
  recipientId: string;
  category: string;
  store: string;
  purchaseUrl: string;
  plannedBudget: string;
  actualCost: string;
  bought: boolean;
  boughtOn: string;
  wrapped: boolean;
  wrappedOn: string;
  sent: boolean;
  sentOn: string;
  deliveryMethod: string;
  address: string;
  notes: string;
}

function initialValues(
  gift: Gift | null,
  settings: AppSettings,
  defaultRecipientId: string,
): FormValues {
  if (!gift) {
    return {
      name: '',
      recipientId: defaultRecipientId,
      category: '',
      store: '',
      purchaseUrl: '',
      plannedBudget: '',
      actualCost: '',
      bought: false,
      boughtOn: '',
      wrapped: false,
      wrappedOn: '',
      sent: false,
      sentOn: '',
      deliveryMethod: '',
      address: '',
      notes: '',
    };
  }

  return {
    name: gift.name,
    recipientId: gift.recipientId,
    category: gift.category ?? '',
    store: gift.store ?? '',
    purchaseUrl: gift.purchaseUrl ?? '',
    plannedBudget: formatMinorUnitsForInput(gift.plannedBudgetMinor, settings.fractionDigits),
    actualCost: formatMinorUnitsForInput(gift.actualCostMinor, settings.fractionDigits),
    bought: gift.bought,
    boughtOn: gift.boughtOn ?? '',
    wrapped: gift.wrapped,
    wrappedOn: gift.wrappedOn ?? '',
    sent: gift.sent,
    sentOn: gift.sentOn ?? '',
    deliveryMethod: gift.deliveryMethod ?? '',
    address: gift.address ?? '',
    notes: gift.notes ?? '',
  };
}

export function GiftFormDialog({
  gift,
  season,
  recipients,
  settings,
  defaultRecipientId = '',
  onClose,
  onSaved,
}: GiftFormDialogProps) {
  const repositories = useRepositories();
  const formId = useId().replaceAll(':', '');
  const editing = gift !== null;

  const firstRecipientId = recipients[0]?.id ?? '';
  const resolvedDefault = defaultRecipientId || firstRecipientId;

  const [values, setValues] = useState<FormValues>(() =>
    initialValues(gift, settings, resolvedDefault),
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [pendingUnbuy, setPendingUnbuy] = useState(false);

  useEffect(() => {
    if (Object.keys(errors).length === 0) return;
    const firstInvalid = document.querySelector<HTMLElement>('[aria-invalid="true"]');
    firstInvalid?.focus();
  }, [errors]);

  const setField = <K extends keyof FormValues>(field: K, value: FormValues[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field as string]) return current;
      const next = { ...current };
      delete next[field as string];
      return next;
    });
    setFormError(null);
  };

  // Status dates follow their status. Clearing Bought also clears the two
  // dependent statuses, but only after the inline confirmation is accepted.
  const applyBought = (checked: boolean) => {
    setValues((current) => ({
      ...current,
      bought: checked,
      boughtOn: checked ? current.boughtOn || localToday() : '',
      wrapped: checked ? current.wrapped : false,
      wrappedOn: checked ? current.wrappedOn : '',
      sent: checked ? current.sent : false,
      sentOn: checked ? current.sentOn : '',
    }));
    setPendingUnbuy(false);
    setErrors((current) => {
      const next = { ...current };
      delete next.bought;
      delete next.boughtOn;
      delete next.wrapped;
      delete next.wrappedOn;
      delete next.sent;
      delete next.sentOn;
      return next;
    });
    setFormError(null);
  };

  const requestBoughtChange = (checked: boolean) => {
    if (!checked && (values.wrapped || values.sent)) {
      setPendingUnbuy(true);
      return;
    }
    applyBought(checked);
  };

  const setWrapped = (checked: boolean) => {
    setValues((current) => ({
      ...current,
      wrapped: checked,
      wrappedOn: checked ? current.wrappedOn || localToday() : '',
    }));
    setFieldError('wrapped');
    setFieldError('wrappedOn');
  };

  const setSent = (checked: boolean) => {
    setValues((current) => ({
      ...current,
      sent: checked,
      sentOn: checked ? current.sentOn || localToday() : '',
    }));
    setFieldError('sent');
    setFieldError('sentOn');
  };

  const setFieldError = (field: string) => {
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
    setFormError(null);
  };

  const close = () => {
    if (!saving) onClose();
  };

  const parseMoney = (raw: string, fieldName: string): number | null | false => {
    try {
      return parseMoneyInput(raw, {
        fractionDigits: settings.fractionDigits,
        currencySymbol: settings.currencySymbol,
      });
    } catch (error) {
      setErrors((prev) => ({
        ...prev,
        [fieldName]:
          error instanceof ValidationError
            ? (error.issues[0]?.message ?? error.message)
            : 'Enter a valid amount or leave it blank.',
      }));
      return false;
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    // Parse money fields first; abort if either is invalid
    const plannedBudgetMinor = parseMoney(values.plannedBudget, 'plannedBudget');
    if (plannedBudgetMinor === false) return;

    const actualCostMinor = parseMoney(values.actualCost, 'actualCost');
    if (actualCostMinor === false) return;

    setSaving(true);

    try {
      const commonFields = {
        name: values.name,
        category: values.category || null,
        store: values.store || null,
        purchaseUrl: values.purchaseUrl || null,
        plannedBudgetMinor: plannedBudgetMinor ?? null,
        actualCostMinor: actualCostMinor ?? null,
        bought: values.bought,
        boughtOn: values.bought ? values.boughtOn || null : null,
        wrapped: values.wrapped,
        wrappedOn: values.wrapped ? values.wrappedOn || null : null,
        sent: values.sent,
        sentOn: values.sent ? values.sentOn || null : null,
        deliveryMethod: (values.deliveryMethod || null) as Gift['deliveryMethod'],
        address: values.address || null,
        notes: values.notes || null,
      };

      if (editing) {
        const updated = await repositories.gifts.update(gift.id, {
          ...commonFields,
          recipientId: values.recipientId as Gift['recipientId'],
        });
        onSaved(`${updated.name} was updated.`);
      } else {
        const created = await repositories.gifts.create({
          seasonId: season.id,
          recipientId: values.recipientId as Gift['recipientId'],
          ...commonFields,
        });
        onSaved(`${created.name} was added.`);
      }
    } catch (error) {
      const nextErrors = fieldErrorsFrom(error);
      const mappedErrors: FieldErrors = {};

      if (nextErrors.name) mappedErrors.name = nextErrors.name;
      if (nextErrors.recipientId) mappedErrors.recipientId = nextErrors.recipientId;
      if (nextErrors.category) mappedErrors.category = nextErrors.category;
      if (nextErrors.store) mappedErrors.store = nextErrors.store;
      if (nextErrors.purchaseUrl) mappedErrors.purchaseUrl = nextErrors.purchaseUrl;
      if (nextErrors.plannedBudgetMinor) mappedErrors.plannedBudget = nextErrors.plannedBudgetMinor;
      if (nextErrors.actualCostMinor) mappedErrors.actualCost = nextErrors.actualCostMinor;
      if (nextErrors.bought) mappedErrors.bought = nextErrors.bought;
      if (nextErrors.boughtOn) mappedErrors.boughtOn = nextErrors.boughtOn;
      if (nextErrors.wrapped) mappedErrors.wrapped = nextErrors.wrapped;
      if (nextErrors.wrappedOn) mappedErrors.wrappedOn = nextErrors.wrappedOn;
      if (nextErrors.sent) mappedErrors.sent = nextErrors.sent;
      if (nextErrors.sentOn) mappedErrors.sentOn = nextErrors.sentOn;
      if (nextErrors.deliveryMethod) mappedErrors.deliveryMethod = nextErrors.deliveryMethod;
      if (nextErrors.address) mappedErrors.address = nextErrors.address;
      if (nextErrors.notes) mappedErrors.notes = nextErrors.notes;

      if (Object.keys(mappedErrors).length > 0) {
        setErrors(mappedErrors);
      } else {
        setFormError(
          errorMessageFrom(error, 'The gift could not be saved. Your data has not been changed.'),
        );
      }
      setSaving(false);
    }
  };

  const currencyHint = `${settings.currencyCode} (${settings.currencySymbol}). Leave blank if unknown.`;
  const canSubmit = !saving && recipients.length > 0;

  return (
    <Dialog
      open
      onClose={close}
      variant="drawer"
      title={editing ? 'Edit gift' : 'Add a gift'}
      description={
        editing
          ? 'Changes are saved on this device and update the list immediately.'
          : 'Only a name and recipient are required. Add costs and status now or later.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={!canSubmit}>
            {saving ? 'Saving…' : editing ? 'Save changes' : 'Add gift'}
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

        {recipients.length === 0 ? (
          <p className={styles.formError} role="alert">
            Add a recipient for this season before saving a gift.
          </p>
        ) : null}

        {/* ── Core ────────────────────────────────────── */}
        <fieldset className={styles.section}>
          <legend className={styles.sectionTitle}>Gift details</legend>

          <Input
            id="gift-name"
            label="Gift name"
            value={values.name}
            onChange={(e) => setField('name', e.target.value)}
            error={errors.name}
            hint="What are you planning to give? Up to 120 characters."
            autoComplete="off"
            required
          />

          <Select
            id="gift-recipient"
            label="Recipient"
            value={values.recipientId}
            onChange={(e) => setField('recipientId', e.target.value)}
            error={errors.recipientId}
            required
          >
            {recipients.length === 0 ? (
              <option value="">No recipients — add one first</option>
            ) : (
              <>
                <option value="">Select a recipient…</option>
                {recipients.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                    {r.relationship ? ` (${r.relationship})` : ''}
                  </option>
                ))}
              </>
            )}
          </Select>

          <div className={styles.twoCol}>
            <Input
              id="gift-category"
              label="Category (optional)"
              value={values.category}
              onChange={(e) => setField('category', e.target.value)}
              error={errors.category}
              hint="E.g. Clothing, Books, Toys."
              maxLength={40}
              autoComplete="off"
            />

            <Input
              id="gift-store"
              label="Store (optional)"
              value={values.store}
              onChange={(e) => setField('store', e.target.value)}
              error={errors.store}
              hint="Where to buy it."
              maxLength={80}
              autoComplete="off"
            />
          </div>

          <Input
            id="gift-url"
            label="Purchase link (optional)"
            value={values.purchaseUrl}
            onChange={(e) => setField('purchaseUrl', e.target.value)}
            error={errors.purchaseUrl}
            hint="Full https:// URL to the product page."
            type="url"
            autoComplete="off"
            inputMode="url"
          />
        </fieldset>

        {/* ── Money ───────────────────────────────────── */}
        <fieldset className={styles.section}>
          <legend className={styles.sectionTitle}>Budget &amp; cost</legend>

          <div className={styles.twoCol}>
            <Input
              id="gift-planned-budget"
              label="Planned budget (optional)"
              value={values.plannedBudget}
              onChange={(e) => setField('plannedBudget', e.target.value)}
              error={errors.plannedBudget}
              hint={currencyHint}
              inputMode="decimal"
              placeholder="0.00"
              autoComplete="off"
            />

            <Input
              id="gift-actual-cost"
              label="Actual cost (optional)"
              value={values.actualCost}
              onChange={(e) => setField('actualCost', e.target.value)}
              error={errors.actualCost}
              hint={currencyHint}
              inputMode="decimal"
              placeholder="0.00"
              autoComplete="off"
            />
          </div>
        </fieldset>

        {/* ── Status ──────────────────────────────────── */}
        <fieldset className={styles.section}>
          <legend className={styles.sectionTitle}>Status</legend>

          <div className={styles.statusGrid}>
            <div className={styles.statusItem}>
              <label className={styles.checkLabel}>
                <input
                  id="gift-bought"
                  type="checkbox"
                  checked={values.bought}
                  onChange={(e) => requestBoughtChange(e.target.checked)}
                  className={styles.checkInput}
                />
                Bought
              </label>
              <Input
                id="gift-bought-on"
                label="Bought date (optional)"
                type="date"
                value={values.boughtOn}
                onChange={(e) => setField('boughtOn', e.target.value)}
                error={errors.boughtOn}
                disabled={!values.bought}
                containerClassName={styles.dateField}
              />
            </div>

            <div className={styles.statusItem}>
              <label
                className={`${styles.checkLabel} ${!values.bought ? styles.checkDisabled : ''}`}
              >
                <input
                  id="gift-wrapped"
                  type="checkbox"
                  checked={values.wrapped}
                  disabled={!values.bought}
                  onChange={(e) => setWrapped(e.target.checked)}
                  className={styles.checkInput}
                />
                Wrapped
              </label>
              <Input
                id="gift-wrapped-on"
                label="Wrapped date (optional)"
                type="date"
                value={values.wrappedOn}
                onChange={(e) => setField('wrappedOn', e.target.value)}
                error={errors.wrappedOn}
                disabled={!values.bought || !values.wrapped}
                containerClassName={styles.dateField}
              />
            </div>

            <div className={styles.statusItem}>
              <label
                className={`${styles.checkLabel} ${!values.bought ? styles.checkDisabled : ''}`}
              >
                <input
                  id="gift-sent"
                  type="checkbox"
                  checked={values.sent}
                  disabled={!values.bought}
                  onChange={(e) => setSent(e.target.checked)}
                  className={styles.checkInput}
                />
                Sent
              </label>
              <Input
                id="gift-sent-on"
                label="Sent date (optional)"
                type="date"
                value={values.sentOn}
                onChange={(e) => setField('sentOn', e.target.value)}
                error={errors.sentOn}
                disabled={!values.bought || !values.sent}
                containerClassName={styles.dateField}
              />
            </div>
          </div>

          <p className={styles.statusHint}>
            Wrapping is optional before sending. A retailer-direct gift can be bought and sent
            without being wrapped.
          </p>

          {pendingUnbuy ? (
            <div className={styles.unbuyConfirm} role="alert">
              <div>
                <strong>Un-buy this gift?</strong>
                <p>Wrapped and Sent will also be cleared, along with all three status dates.</p>
              </div>
              <div className={styles.unbuyActions}>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setPendingUnbuy(false)}
                >
                  Keep as bought
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => applyBought(false)}
                >
                  Un-buy and clear
                </Button>
              </div>
            </div>
          ) : null}

          {values.bought && !values.actualCost.trim() ? (
            <p className={styles.costWarning} role="note">
              This gift is marked bought without an actual cost. It will count as zero spending
              until a cost is added.
            </p>
          ) : null}

          {errors.wrapped ||
          errors.wrappedOn ||
          errors.sent ||
          errors.sentOn ||
          errors.bought ||
          errors.boughtOn ? (
            <p className={styles.statusError} role="alert">
              {errors.bought ??
                errors.boughtOn ??
                errors.wrapped ??
                errors.wrappedOn ??
                errors.sent ??
                errors.sentOn}
            </p>
          ) : null}
        </fieldset>

        {/* ── Delivery ────────────────────────────────── */}
        <fieldset className={styles.section}>
          <legend className={styles.sectionTitle}>Delivery</legend>

          <Select
            id="gift-delivery-method"
            label="Delivery method (optional)"
            value={values.deliveryMethod}
            onChange={(e) => setField('deliveryMethod', e.target.value)}
            error={errors.deliveryMethod}
          >
            <option value="">Not specified</option>
            <option value="hand_delivered">Hand delivered</option>
            <option value="shipped">Shipped</option>
            <option value="digital">Digital</option>
            <option value="retailer_direct">Retailer direct</option>
            <option value="other">Other</option>
          </Select>

          <Textarea
            id="gift-address"
            label="Delivery address (optional)"
            value={values.address}
            onChange={(e) => setField('address', e.target.value)}
            error={errors.address}
            hint="Stored only on this device. Up to 500 characters."
            maxLength={500}
            rows={3}
          />
        </fieldset>

        {/* ── Notes ───────────────────────────────────── */}
        <fieldset className={styles.section}>
          <legend className={styles.sectionTitle}>Notes</legend>
          <Textarea
            id="gift-notes"
            label="Notes (optional)"
            value={values.notes}
            onChange={(e) => setField('notes', e.target.value)}
            error={errors.notes}
            hint="Sizes, colour preferences, anything useful. Up to 2000 characters."
            maxLength={2000}
            rows={4}
          />
        </fieldset>
      </form>
    </Dialog>
  );
}

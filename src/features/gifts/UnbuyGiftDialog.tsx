import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import type { Gift } from '../../domain/entities';
import { errorMessageFrom } from '../../lib/formErrors';
import { useRepositories } from '../../app/providers/storageContext';
import styles from './UnbuyGiftDialog.module.css';

interface UnbuyGiftDialogProps {
  gift: Gift;
  onClose: () => void;
  onUnbought: (message: string) => void;
}

export function UnbuyGiftDialog({ gift, onClose, onUnbought }: UnbuyGiftDialogProps) {
  const repositories = useRepositories();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (!saving) onClose();
  };

  const handleUnbuy = async () => {
    setError(null);
    setSaving(true);

    try {
      await repositories.gifts.setPurchaseState(gift.id, { bought: false });
      onUnbought(`${gift.name} was marked not bought. Wrapped and Sent were cleared.`);
    } catch (err) {
      setError(
        errorMessageFrom(err, 'The gift could not be changed. Your data has not been updated.'),
      );
      setSaving(false);
    }
  };

  return (
    <Dialog
      open
      onClose={close}
      title={`Un-buy "${gift.name}"?`}
      description="Un-buying clears Bought, Wrapped, and Sent and removes all three status dates."
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={saving}>
            Keep as bought
          </Button>
          <Button
            variant="primary"
            onClick={handleUnbuy}
            disabled={saving}
            className={styles.unbuyButton}
          >
            {saving ? 'Updating…' : 'Un-buy gift'}
          </Button>
        </>
      }
    >
      <div className={styles.body}>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        <p className={styles.explainer}>
          Use this only if the purchase did not happen or was reversed. The gift record and its
          costs stay in your plan; only the progress states are cleared.
        </p>

        <ul className={styles.statusList}>
          <li>Bought will be unchecked.</li>
          <li>Wrapped and Sent will be unchecked.</li>
          <li>Recorded status dates will be removed.</li>
        </ul>
      </div>
    </Dialog>
  );
}

import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import type { Gift, Recipient } from '../../domain/entities';
import { errorMessageFrom } from '../../lib/formErrors';
import { useRepositories } from '../../app/providers/storageContext';
import styles from './DeleteGiftDialog.module.css';

interface DeleteGiftDialogProps {
  gift: Gift;
  recipient: Recipient | undefined;
  onClose: () => void;
  onDeleted: (message: string) => void;
}

export function DeleteGiftDialog({ gift, recipient, onClose, onDeleted }: DeleteGiftDialogProps) {
  const repositories = useRepositories();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (!deleting) onClose();
  };

  const handleDelete = async () => {
    setError(null);
    setDeleting(true);

    try {
      await repositories.gifts.delete(gift.id);
      const recipientName = recipient?.name ?? 'Unknown recipient';
      onDeleted(`${gift.name} was deleted from ${recipientName}'s gifts.`);
    } catch (err) {
      setError(
        errorMessageFrom(err, 'The gift could not be deleted. Your data has not been changed.'),
      );
      setDeleting(false);
    }
  };

  const recipientName = recipient?.name ?? 'this recipient';

  return (
    <Dialog
      open
      onClose={close}
      title={`Delete "${gift.name}"?`}
      description={`This removes the gift from ${recipientName}'s list. This action cannot be undone.`}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleDelete}
            disabled={deleting}
            className={styles.deleteButton}
          >
            {deleting ? 'Deleting…' : 'Delete gift'}
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

        <div className={styles.giftSummary}>
          <p className={styles.giftName}>{gift.name}</p>
          {gift.store ? (
            <p className={styles.detail}>
              <span className={styles.label}>Store</span> {gift.store}
            </p>
          ) : null}
          {recipient ? (
            <p className={styles.detail}>
              <span className={styles.label}>For</span> {recipient.name}
            </p>
          ) : null}
          {gift.sourceIdeaId ? (
            <p className={styles.ideaNote}>
              This gift came from the Idea Bank. Deleting it will reopen the original idea.
            </p>
          ) : null}
        </div>
      </div>
    </Dialog>
  );
}

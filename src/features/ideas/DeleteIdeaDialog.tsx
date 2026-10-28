import { useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import type { Idea, Recipient } from '../../domain/entities';
import { errorMessageFrom } from '../../lib/formErrors';
import { useRepositories } from '../../app/providers/storageContext';
import styles from './DeleteIdeaDialog.module.css';

interface DeleteIdeaDialogProps {
  idea: Idea;
  recipient: Recipient | null;
  onClose: () => void;
  onDeleted: (message: string) => void;
}

export function DeleteIdeaDialog({ idea, recipient, onClose, onDeleted }: DeleteIdeaDialogProps) {
  const repositories = useRepositories();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const converted = idea.status === 'converted';

  const close = () => {
    if (!deleting) {
      onClose();
    }
  };

  const handleDelete = async () => {
    setError(null);
    setDeleting(true);

    try {
      await repositories.ideas.delete(idea.id);
      onDeleted(
        converted
          ? `${idea.name} was deleted. Its gift was kept and is no longer linked to an idea.`
          : `${idea.name} was deleted from the Idea Bank.`,
      );
    } catch (err) {
      setError(
        errorMessageFrom(err, 'The idea could not be deleted. Your data has not been changed.'),
      );
      setDeleting(false);
    }
  };

  return (
    <Dialog
      open
      onClose={close}
      title={`Delete "${idea.name}"?`}
      description="This permanently deletes the idea. It cannot be undone."
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
            {deleting ? 'Deleting…' : 'Delete idea'}
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

        <div className={styles.summary}>
          <p className={styles.name}>{idea.name}</p>
          {recipient ? (
            <p className={styles.detail}>
              <span className={styles.label}>For</span> {recipient.name}
            </p>
          ) : null}
          {idea.store ? (
            <p className={styles.detail}>
              <span className={styles.label}>Store</span> {idea.store}
            </p>
          ) : null}
        </div>

        {converted ? (
          <p className={styles.ideaNote}>
            This idea has already been converted. Its gift will stay in the gift list and will no
            longer show an Idea Bank source.
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}

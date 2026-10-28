import { useId, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Select } from '../../components/ui/Select';
import { buttonStyles } from '../../components/ui/buttonStyles';
import type { Idea, Recipient, RecipientId } from '../../domain/entities';
import { errorMessageFrom } from '../../lib/formErrors';
import { useRepositories } from '../../app/providers/storageContext';
import styles from './ConvertIdeaDialog.module.css';

interface ConvertIdeaDialogProps {
  idea: Idea;
  recipients: Recipient[];
  onClose: () => void;
  onConverted: (message: string) => void;
}

export function ConvertIdeaDialog({
  idea,
  recipients,
  onClose,
  onConverted,
}: ConvertIdeaDialogProps) {
  const repositories = useRepositories();
  const formId = useId().replaceAll(':', '');
  const [recipientId, setRecipientId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [converting, setConverting] = useState(false);

  const close = () => {
    if (!converting) {
      onClose();
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!recipientId) {
      setError('Choose a recipient before converting this idea.');
      return;
    }

    setConverting(true);

    try {
      const recipient = recipients.find((candidate) => candidate.id === recipientId);
      await repositories.ideas.convert(idea.id, recipientId as RecipientId);
      onConverted(
        `${idea.name} was converted to a gift${recipient ? ` for ${recipient.name}` : ''}.`,
      );
    } catch (err) {
      setError(errorMessageFrom(err, 'The idea could not be converted. Your data is unchanged.'));
      setConverting(false);
    }
  };

  return (
    <Dialog
      open
      onClose={close}
      title="Convert idea to a gift"
      description="A recipient is required. The idea stays in the bank as a converted record linked to the new gift."
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={converting}>
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={converting || recipients.length === 0}>
            {converting ? 'Converting…' : 'Convert to gift'}
          </Button>
        </>
      }
    >
      <form id={formId} className={styles.form} onSubmit={handleSubmit} noValidate>
        {error ? (
          <p className={styles.error} role="alert">
            {error}
          </p>
        ) : null}

        <div className={styles.ideaSummary}>
          <p className={styles.ideaName}>{idea.name}</p>
          {idea.store ? <p className={styles.detail}>{idea.store}</p> : null}
          <p className={styles.note}>
            Name, category, store, link, estimated price, and notes are copied into the gift. The
            gift starts unbought with no actual cost.
          </p>
        </div>

        {recipients.length === 0 ? (
          <div className={styles.emptyRecipients}>
            <p>Add a recipient first, then return to convert this idea.</p>
            <Link className={buttonStyles({ variant: 'secondary', size: 'sm' })} to="/recipients">
              Add a recipient
            </Link>
          </div>
        ) : (
          <Select
            id="convert-recipient"
            label="Recipient"
            value={recipientId}
            onChange={(event) => {
              setRecipientId(event.target.value);
              setError(null);
            }}
            hint="The recipient must belong to the active season."
            required
          >
            <option value="">Choose a recipient</option>
            {recipients.map((recipient) => (
              <option key={recipient.id} value={recipient.id}>
                {recipient.name}
              </option>
            ))}
          </Select>
        )}
      </form>
    </Dialog>
  );
}

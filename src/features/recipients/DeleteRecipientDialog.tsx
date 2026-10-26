import { useState } from 'react';
import { AlertTriangle, ArrowRightLeft, Trash2, Users } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import type { Recipient, RecipientId } from '../../domain/entities';
import { errorMessageFrom } from '../../lib/formErrors';
import { useRepositories } from '../../app/providers/storageContext';
import { useLiveQueryState } from '../../app/providers/useLiveQueryState';
import styles from './RecipientDialogs.module.css';

interface DeleteRecipientDialogProps {
  recipient: Recipient;
  otherRecipients: Recipient[];
  onClose: () => void;
  onDeleted: (message: string) => void;
}

interface DeleteImpact {
  giftCount: number;
  ideaCount: number;
}

type DeleteMode = 'reassign' | 'cascade';

export function DeleteRecipientDialog({
  recipient,
  otherRecipients,
  onClose,
  onDeleted,
}: DeleteRecipientDialogProps) {
  const repositories = useRepositories();
  const [mode, setMode] = useState<DeleteMode>(otherRecipients.length > 0 ? 'reassign' : 'cascade');
  const [targetId, setTargetId] = useState<string>(otherRecipients[0]?.id ?? '');
  const [confirmationName, setConfirmationName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const impact = useLiveQueryState<DeleteImpact>(async () => {
    const [gifts, ideas] = await Promise.all([
      repositories.gifts.listByRecipient(recipient.id),
      repositories.ideas.listBySeason(recipient.seasonId),
    ]);

    return {
      giftCount: gifts.length,
      ideaCount: ideas.filter((idea) => idea.recipientId === recipient.id).length,
    };
  }, [repositories, recipient.id, recipient.seasonId]);

  const giftCount = impact.data?.giftCount ?? 0;
  const hasGifts = giftCount > 0;
  const targetRecipient = otherRecipients.find((candidate) => candidate.id === targetId) ?? null;
  const cascadeConfirmed = confirmationName.trim() === recipient.name;
  const confirmDisabled =
    deleting ||
    impact.loading ||
    impact.error !== null ||
    (hasGifts && mode === 'cascade' && !cascadeConfirmed) ||
    (hasGifts && mode === 'reassign' && !targetRecipient);

  const close = () => {
    if (!deleting) {
      onClose();
    }
  };

  const handleDelete = async () => {
    setError(null);

    if (hasGifts && mode === 'reassign' && !targetRecipient) {
      setError('Choose another recipient for these gifts.');
      return;
    }

    setDeleting(true);

    try {
      const result = await repositories.recipients.deleteWithPolicy(
        recipient.id,
        hasGifts && mode === 'reassign'
          ? { type: 'reassign', targetRecipientId: targetRecipient?.id as RecipientId }
          : { type: 'cascade', confirmationName: recipient.name },
      );

      let message: string;

      if (result.reassignedGiftCount > 0) {
        message = `${recipient.name} was deleted. ${result.reassignedGiftCount} ${
          result.reassignedGiftCount === 1 ? 'gift was' : 'gifts were'
        } moved to ${targetRecipient?.name ?? 'another recipient'}.`;
      } else if (result.deletedGiftCount > 0) {
        message = `${recipient.name} and ${result.deletedGiftCount} ${
          result.deletedGiftCount === 1 ? 'gift were' : 'gifts were'
        } deleted.`;
      } else {
        message = `${recipient.name} was deleted.`;
      }

      if (result.unassignedIdeaCount > 0) {
        message += ` ${result.unassignedIdeaCount} ${
          result.unassignedIdeaCount === 1 ? 'idea is' : 'ideas are'
        } still in the Idea Bank without a recipient.`;
      }

      onDeleted(message);
    } catch (deleteError) {
      setError(
        errorMessageFrom(deleteError, 'The recipient could not be deleted. No changes were made.'),
      );
      setDeleting(false);
    }
  };

  const description = impact.loading
    ? 'Checking for linked gifts and ideas…'
    : impact.error
      ? 'This recipient could not be checked safely.'
      : hasGifts
        ? `This recipient has ${giftCount} ${giftCount === 1 ? 'gift' : 'gifts'}. Choose what happens to ${giftCount === 1 ? 'it' : 'them'} before deleting.`
        : 'This recipient has no gifts. You can delete them without touching any gift records.';

  return (
    <Dialog
      open
      onClose={close}
      title={`Delete ${recipient.name}?`}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={confirmDisabled}
            aria-busy={deleting}
          >
            {deleting
              ? 'Deleting…'
              : hasGifts && mode === 'reassign'
                ? 'Move gifts and delete'
                : hasGifts
                  ? 'Delete recipient and gifts'
                  : 'Delete recipient'}
          </Button>
        </>
      }
    >
      <div className={styles.deleteBody}>
        {impact.loading ? (
          <p className={styles.status} role="status">
            <span className={styles.statusDot} aria-hidden="true" />
            Checking linked records…
          </p>
        ) : null}

        {impact.error ? (
          <p className={styles.formError} role="alert">
            The linked records could not be loaded, so deletion is disabled. Reload the app and try
            again. No changes were made.
          </p>
        ) : null}

        {!impact.loading && !impact.error ? (
          <>
            <div className={styles.impactSummary}>
              <span className={styles.impactIcon} aria-hidden="true">
                {hasGifts ? <AlertTriangle /> : <Users />}
              </span>
              <div>
                <strong>
                  {hasGifts
                    ? `${giftCount} ${giftCount === 1 ? 'gift' : 'gifts'} linked`
                    : 'No gifts linked'}
                </strong>
                <span>
                  {(impact.data?.ideaCount ?? 0) > 0
                    ? `${impact.data?.ideaCount} ${
                        impact.data?.ideaCount === 1 ? 'idea' : 'ideas'
                      } will be kept and become unassigned.`
                    : 'No ideas are assigned to this recipient.'}
                </span>
              </div>
            </div>

            {hasGifts ? (
              <fieldset className={styles.choiceGroup}>
                <legend>What should happen to the gifts?</legend>

                <label
                  className={styles.choice}
                  data-disabled={otherRecipients.length === 0 || undefined}
                >
                  <input
                    type="radio"
                    name="delete-mode"
                    value="reassign"
                    checked={mode === 'reassign'}
                    onChange={() => setMode('reassign')}
                    disabled={otherRecipients.length === 0}
                  />
                  <span className={styles.choiceIcon} aria-hidden="true">
                    <ArrowRightLeft />
                  </span>
                  <span>
                    <strong>Move them to another recipient</strong>
                    <span>The gifts and their history stay in this season.</span>
                  </span>
                </label>

                {mode === 'reassign' && otherRecipients.length > 0 ? (
                  <Select
                    id="recipient-move-target"
                    label="Move gifts to"
                    value={targetId}
                    onChange={(event) => setTargetId(event.target.value)}
                    containerClassName={styles.choiceField}
                  >
                    {otherRecipients.map((candidate) => (
                      <option key={candidate.id} value={candidate.id}>
                        {candidate.name}
                      </option>
                    ))}
                  </Select>
                ) : null}

                {otherRecipients.length === 0 ? (
                  <p className={styles.choiceHint}>
                    There is no other recipient in this season. Add one first if you want to keep
                    these gifts.
                  </p>
                ) : null}

                <label className={styles.choice}>
                  <input
                    type="radio"
                    name="delete-mode"
                    value="cascade"
                    checked={mode === 'cascade'}
                    onChange={() => setMode('cascade')}
                  />
                  <span className={styles.choiceIconDanger} aria-hidden="true">
                    <Trash2 />
                  </span>
                  <span>
                    <strong>Delete the gifts too</strong>
                    <span>
                      This permanently deletes {giftCount} {giftCount === 1 ? 'gift' : 'gifts'} and
                      the recipient.
                    </span>
                  </span>
                </label>

                {mode === 'cascade' ? (
                  <div className={styles.confirmationField}>
                    <Input
                      id="recipient-delete-confirmation"
                      label={`Type “${recipient.name}” to confirm`}
                      value={confirmationName}
                      onChange={(event) => setConfirmationName(event.target.value)}
                      hint="This exact match is required for the destructive choice."
                      autoComplete="off"
                      spellCheck={false}
                    />
                  </div>
                ) : null}
              </fieldset>
            ) : (
              <p className={styles.simpleNote}>
                Deleting this recipient cannot be undone. No gifts or ideas will be deleted.
              </p>
            )}

            {error ? (
              <p className={styles.formError} role="alert">
                {error}
              </p>
            ) : null}
          </>
        ) : null}
      </div>
    </Dialog>
  );
}

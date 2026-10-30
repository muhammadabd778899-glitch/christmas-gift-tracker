import { useState } from 'react';
import { ArchiveRestore, Trash2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Dialog } from '../../components/ui/Dialog';
import { Input } from '../../components/ui/Input';
import type { Season } from '../../domain/entities';
import { errorMessageFrom } from '../../lib/formErrors';
import { useRepositories } from '../../app/providers/storageContext';
import styles from './SeasonDialogs.module.css';

interface ArchiveSeasonDialogProps {
  season: Season;
  giftCount: number;
  recipientCount: number;
  onClose: () => void;
  onArchived: (message: string) => void;
}

export function ArchiveSeasonDialog({
  season,
  giftCount,
  recipientCount,
  onClose,
  onArchived,
}: ArchiveSeasonDialogProps) {
  const repositories = useRepositories();
  const [error, setError] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);

  const close = () => {
    if (!archiving) {
      onClose();
    }
  };

  const handleArchive = async () => {
    setError(null);
    setArchiving(true);

    try {
      await repositories.seasons.archive(season.id);
      onArchived(
        `${season.name} was archived. It is now read-only and can be restored at any time.`,
      );
    } catch (archiveError) {
      setError(
        errorMessageFrom(archiveError, 'The season could not be archived. No changes were made.'),
      );
      setArchiving(false);
    }
  };

  return (
    <Dialog
      open
      onClose={close}
      title={`Archive ${season.name}?`}
      description="Archiving keeps every recipient, gift, and idea. It only makes the season read-only."
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={archiving}>
            Cancel
          </Button>
          <Button onClick={handleArchive} disabled={archiving}>
            {archiving ? 'Archiving…' : 'Archive season'}
          </Button>
        </>
      }
    >
      <div className={styles.confirmBody}>
        <ul className={styles.factList}>
          <li>
            <strong>{recipientCount}</strong>{' '}
            {recipientCount === 1 ? 'recipient stays' : 'recipients stay'} available for reference.
          </li>
          <li>
            <strong>{giftCount}</strong> {giftCount === 1 ? 'gift stays' : 'gifts stay'} saved and
            exportable.
          </li>
          <li>
            Editing is disabled until you restore the season. Restoring archives the season that is
            active at that time.
          </li>
        </ul>
        {error ? (
          <p className={styles.formError} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}

interface RestoreSeasonDialogProps {
  season: Season;
  activeSeason: Season | null;
  onClose: () => void;
  onRestored: (message: string) => void;
}

export function RestoreSeasonDialog({
  season,
  activeSeason,
  onClose,
  onRestored,
}: RestoreSeasonDialogProps) {
  const repositories = useRepositories();
  const [error, setError] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const close = () => {
    if (!restoring) {
      onClose();
    }
  };

  const handleRestore = async () => {
    setError(null);
    setRestoring(true);

    try {
      await repositories.seasons.restore(season.id);

      if (activeSeason && activeSeason.id !== season.id) {
        onRestored(
          `${season.name} is active again. ${activeSeason.name} was archived in the same step and nothing was deleted.`,
        );
      } else {
        onRestored(`${season.name} is active again.`);
      }
    } catch (restoreError) {
      setError(
        errorMessageFrom(restoreError, 'The season could not be restored. No changes were made.'),
      );
      setRestoring(false);
    }
  };

  const switching = activeSeason !== null && activeSeason.id !== season.id;

  return (
    <Dialog
      open
      onClose={close}
      title={`Restore ${season.name}?`}
      description={
        switching
          ? `${activeSeason.name} will be archived so that only one season is active. Nothing is deleted.`
          : 'This archived season will become active again and can be edited.'
      }
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={restoring}>
            Cancel
          </Button>
          <Button onClick={handleRestore} disabled={restoring}>
            <ArchiveRestore size={16} aria-hidden="true" />
            {restoring ? 'Restoring…' : switching ? 'Restore and switch' : 'Restore season'}
          </Button>
        </>
      }
    >
      <div className={styles.confirmBody}>
        {switching ? (
          <div className={styles.callout}>
            <span className={styles.calloutIcon} aria-hidden="true">
              <ArchiveRestore size={18} />
            </span>
            <div>
              <strong>This switches the active season</strong>
              <p>
                {activeSeason.name} becomes read-only and {season.name} becomes editable. Both
                seasons keep all of their records.
              </p>
            </div>
          </div>
        ) : null}
        {error ? (
          <p className={styles.formError} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}

interface DeleteSeasonDialogProps {
  season: Season;
  recipientCount: number;
  giftCount: number;
  ideaCount: number;
  onClose: () => void;
  onDeleted: (message: string) => void;
}

export function DeleteSeasonDialog({
  season,
  recipientCount,
  giftCount,
  ideaCount,
  onClose,
  onDeleted,
}: DeleteSeasonDialogProps) {
  const repositories = useRepositories();
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const confirmed = confirmation.trim() === season.name;

  const close = () => {
    if (!deleting) {
      onClose();
    }
  };

  const handleDelete = async () => {
    setError(null);

    if (!confirmed) {
      setError(`Type “${season.name}” exactly to delete it.`);
      return;
    }

    setDeleting(true);

    try {
      await repositories.seasons.delete(season.id, confirmation);
      onDeleted(
        `${season.name} and its records were deleted permanently. A backup is the only way to recover them.`,
      );
    } catch (deleteError) {
      setError(
        errorMessageFrom(deleteError, 'The season could not be deleted. No changes were made.'),
      );
      setDeleting(false);
    }
  };

  return (
    <Dialog
      open
      onClose={close}
      title={`Delete ${season.name}?`}
      description="This is irreversible. Only an archived season can be deleted."
      footer={
        <>
          <Button variant="secondary" onClick={close} disabled={deleting}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDelete}
            disabled={deleting || !confirmed}
            aria-busy={deleting}
          >
            <Trash2 size={16} aria-hidden="true" />
            {deleting ? 'Deleting…' : 'Delete season permanently'}
          </Button>
        </>
      }
    >
      <div className={styles.confirmBody}>
        <div className={styles.dangerSummary}>
          <span className={styles.dangerIcon} aria-hidden="true">
            <Trash2 size={18} />
          </span>
          <div>
            <strong>Everything in this season will be deleted</strong>
            <p>
              {recipientCount} {recipientCount === 1 ? 'recipient' : 'recipients'}, {giftCount}{' '}
              {giftCount === 1 ? 'gift' : 'gifts'}, and {ideaCount}{' '}
              {ideaCount === 1 ? 'idea' : 'ideas'}.
            </p>
          </div>
        </div>

        <Input
          id="season-delete-confirmation"
          label={`Type “${season.name}” to confirm`}
          value={confirmation}
          onChange={(event) => {
            setConfirmation(event.target.value);
            setError(null);
          }}
          hint="The match is case-sensitive and ignores only surrounding spaces."
          autoComplete="off"
          spellCheck={false}
        />

        {error ? (
          <p className={styles.formError} role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}

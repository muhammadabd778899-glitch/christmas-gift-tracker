import { useEffect, useRef, useState } from 'react';
import { CalendarDays, Lightbulb, Plus, Search } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { EmptyState } from '../components/ui/EmptyState';
import { ErrorState } from '../components/ui/ErrorState';
import { Input } from '../components/ui/Input';
import { PageHeader } from '../components/ui/PageHeader';
import { buttonStyles } from '../components/ui/buttonStyles';
import { filterIdeas } from '../domain/calculations/ideas';
import { formatDateOnly } from '../domain/dates';
import type { AppSettings, Gift, Idea, Recipient, RecipientId } from '../domain/entities';
import { errorMessageFrom } from '../lib/formErrors';
import { toAppError } from '../storage/errors';
import { useRepositories } from '../app/providers/storageContext';
import { ConvertIdeaDialog } from '../features/ideas/ConvertIdeaDialog';
import { DeleteIdeaDialog } from '../features/ideas/DeleteIdeaDialog';
import { IdeaCard } from '../features/ideas/IdeaCard';
import { IdeaFormDialog } from '../features/ideas/IdeaFormDialog';
import { useIdeaPageData } from '../features/ideas/useIdeaPageData';
import styles from './IdeasPage.module.css';

interface IdeasLocationState {
  notice?: string;
}

export function IdeasPage() {
  const location = useLocation();
  const data = useIdeaPageData();
  const repositories = useRepositories();
  const [formIdea, setFormIdea] = useState<Idea | null | undefined>(undefined);
  const [convertIdea, setConvertIdea] = useState<Idea | null>(null);
  const [deleteIdea, setDeleteIdea] = useState<Idea | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [notice, setNotice] = useState<string | null>(
    (location.state as IdeasLocationState | null)?.notice ?? null,
  );
  const focusMainAfterNoticeRef = useRef(false);

  useEffect(() => {
    if (!notice) return;

    if (focusMainAfterNoticeRef.current) {
      focusMainAfterNoticeRef.current = false;
      document.getElementById('main-content')?.focus();
    }

    const timer = window.setTimeout(() => setNotice(null), 6000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  if (data.loading) {
    return (
      <div className={styles.page}>
        <PageHeader
          eyebrow="Before you buy"
          title="Idea Bank"
          description="Capture possibilities early, then promote the right ones into real gifts."
        />
        <div className={styles.loadingGrid} role="status" aria-live="polite">
          <span className="sr-only">Loading ideas…</span>
          {[0, 1, 2].map((item) => (
            <div key={item} className={styles.skeletonCard} aria-hidden="true">
              <span className={styles.skeletonLineShort} />
              <span className={styles.skeletonLine} />
              <span className={styles.skeletonBlock} />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (data.error || !data.data) {
    const appError = toAppError(data.error);
    return (
      <ErrorState
        title="Your ideas could not be loaded."
        description={
          appError.recovery ??
          'Your data has not been deleted. Reload the app and try again. If the problem continues, do not clear site data.'
        }
        actions={<Button onClick={() => window.location.reload()}>Reload app</Button>}
      />
    );
  }

  const { settings, season, recipients, ideas, gifts } = data.data;
  const archived = season?.status === 'archived';
  const canEdit = season !== null && !archived;
  const seasonDate = season ? formatDateOnly(season.holidayDate, settings.locale) : null;
  const recipientsById = new Map(recipients.map((recipient) => [recipient.id, recipient]));
  const giftsById = new Map(gifts.map((gift) => [gift.id, gift]));
  const filteredIdeas = filterIdeas(ideas, recipients, query, gifts);
  const convertedCount = ideas.filter((idea) => idea.status === 'converted').length;
  const deleteLinkedGift = deleteIdea?.convertedGiftId
    ? (giftsById.get(deleteIdea.convertedGiftId) ?? null)
    : null;
  const deleteRecipientId = deleteLinkedGift?.recipientId ?? deleteIdea?.recipientId ?? null;

  const runConvert = async (idea: Idea, recipientId: RecipientId) => {
    setStatusError(null);
    setBusyId(idea.id);

    try {
      const recipient = recipientsById.get(recipientId);
      await repositories.ideas.convert(idea.id, recipientId);
      setConvertIdea(null);
      setNotice(
        `${idea.name} was converted to a gift${recipient ? ` for ${recipient.name}` : ''}.`,
      );
    } catch (error) {
      setStatusError(
        errorMessageFrom(error, 'The idea could not be converted. Your data is unchanged.'),
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleConvert = (idea: Idea) => {
    if (!idea.recipientId) {
      setConvertIdea(idea);
      return;
    }

    void runConvert(idea, idea.recipientId);
  };

  const handleReopen = async (idea: Idea) => {
    setStatusError(null);
    setBusyId(idea.id);

    try {
      await repositories.ideas.reopen(idea.id);
      setNotice(`${idea.name} was reopened in the Idea Bank.`);
    } catch (error) {
      setStatusError(
        errorMessageFrom(error, 'The idea could not be reopened. Your data is unchanged.'),
      );
    } finally {
      setBusyId(null);
    }
  };

  const headerActions = canEdit ? (
    <Button onClick={() => setFormIdea(null)}>
      <Plus size={17} aria-hidden="true" />
      Add idea
    </Button>
  ) : undefined;

  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow="Before you buy"
        title="Idea Bank"
        description={
          season
            ? `Possibilities for ${season.name}. Ideas stay out of budgets and the shopping list until you convert one.`
            : 'Ideas belong to a season. Create one before capturing possibilities.'
        }
        badge={
          season ? (
            archived ? (
              <Badge tone="neutral">Archived · read only</Badge>
            ) : (
              <Badge tone="gold">
                {ideas.length} {ideas.length === 1 ? 'idea' : 'ideas'}
                {convertedCount > 0 ? ` · ${convertedCount} converted` : ''}
              </Badge>
            )
          ) : undefined
        }
        actions={headerActions}
      />

      {notice ? (
        <p className={styles.notice} role="status" aria-live="polite">
          {notice}
        </p>
      ) : null}

      {statusError ? (
        <p className={styles.errorNotice} role="alert">
          {statusError}
        </p>
      ) : null}

      {!season ? (
        <EmptyState
          icon={<CalendarDays />}
          title="Create a season first"
          description="A season keeps one Christmas together: its people, gifts, ideas, and budget. Nothing is created for you automatically."
          action={
            <Link className={buttonStyles({ variant: 'primary' })} to="/onboarding">
              Create your first season
            </Link>
          }
        />
      ) : archived ? (
        <>
          <div className={styles.archivedBanner} role="status">
            <span className={styles.archivedIcon} aria-hidden="true">
              <CalendarDays size={18} />
            </span>
            <div>
              <strong>{season.name} is archived.</strong>
              <p>
                {seasonDate} · Ideas are read-only. Restore the season from Seasons &amp; archives
                to make changes.
              </p>
            </div>
          </div>

          {ideas.length === 0 ? (
            <EmptyState
              icon={<Lightbulb />}
              title="No ideas in this archived season"
              description="This season has no ideas stored. Nothing will be added while it is read-only."
            />
          ) : (
            <IdeaGrid
              ideas={ideas}
              recipientsById={recipientsById}
              giftsById={giftsById}
              settings={settings}
              readOnly
              busyId={busyId}
              onEdit={() => undefined}
              onConvert={() => undefined}
              onDelete={() => undefined}
              onReopen={() => undefined}
            />
          )}
        </>
      ) : ideas.length === 0 ? (
        <EmptyState
          icon={<Lightbulb />}
          title="No ideas yet"
          description={`Capture a possibility for ${season.name}. A name is enough; recipient, store, link, price, and notes are optional.`}
          action={
            <Button onClick={() => setFormIdea(null)}>
              <Plus size={17} aria-hidden="true" />
              Add your first idea
            </Button>
          }
        />
      ) : (
        <>
          <div className={styles.seasonStrip}>
            <span className={styles.seasonStripIcon} aria-hidden="true">
              <CalendarDays size={16} />
            </span>
            <span>
              <strong>{season.name}</strong>
              <span className={styles.seasonStripDivider} aria-hidden="true" />
              {seasonDate}
            </span>
            <span className={styles.seasonStripCount}>
              {ideas.length} {ideas.length === 1 ? 'idea' : 'ideas'}
            </span>
          </div>

          <div className={styles.searchBar}>
            <Input
              id="idea-search"
              type="search"
              label="Search ideas"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              hint="Matches idea name, recipient, category, and store."
              placeholder="Search the Idea Bank"
              autoComplete="off"
              containerClassName={styles.searchField}
            />
            <Button
              variant="secondary"
              onClick={() => setQuery('')}
              disabled={query.length === 0}
              className={styles.clearButton}
            >
              Clear search
            </Button>
          </div>

          {filteredIdeas.length === 0 ? (
            <EmptyState
              icon={<Search />}
              title="No ideas match your search"
              description={`Nothing in ${season.name} matches “${query.trim()}”. Clear the search to see every idea.`}
              action={
                <Button variant="secondary" onClick={() => setQuery('')}>
                  Clear search
                </Button>
              }
            />
          ) : (
            <IdeaGrid
              ideas={filteredIdeas}
              recipientsById={recipientsById}
              giftsById={giftsById}
              settings={settings}
              readOnly={false}
              busyId={busyId}
              onEdit={setFormIdea}
              onConvert={handleConvert}
              onDelete={setDeleteIdea}
              onReopen={(idea) => void handleReopen(idea)}
            />
          )}

          <p className={styles.footnote}>
            Converted ideas are kept for reference. They do not count toward budgets, progress, or
            the Shopping List; only the gift created from one does.
          </p>
        </>
      )}

      {formIdea !== undefined && season && !archived ? (
        <IdeaFormDialog
          idea={formIdea}
          season={season}
          recipients={recipients}
          settings={settings}
          onClose={() => setFormIdea(undefined)}
          onSaved={(message) => {
            setFormIdea(undefined);
            setNotice(message);
          }}
        />
      ) : null}

      {convertIdea ? (
        <ConvertIdeaDialog
          idea={convertIdea}
          recipients={recipients}
          onClose={() => setConvertIdea(null)}
          onConverted={(message) => {
            setConvertIdea(null);
            setNotice(message);
          }}
        />
      ) : null}

      {deleteIdea ? (
        <DeleteIdeaDialog
          idea={deleteIdea}
          recipient={deleteRecipientId ? (recipientsById.get(deleteRecipientId) ?? null) : null}
          onClose={() => setDeleteIdea(null)}
          onDeleted={(message) => {
            setDeleteIdea(null);
            setNotice(message);
          }}
        />
      ) : null}
    </div>
  );
}

interface IdeaGridProps {
  ideas: Idea[];
  recipientsById: Map<string, Recipient>;
  giftsById: Map<string, Gift>;
  settings: AppSettings;
  readOnly: boolean;
  busyId: string | null;
  onEdit: (idea: Idea) => void;
  onConvert: (idea: Idea) => void;
  onDelete: (idea: Idea) => void;
  onReopen: (idea: Idea) => void;
}

function IdeaGrid({
  ideas,
  recipientsById,
  giftsById,
  settings,
  readOnly,
  busyId,
  onEdit,
  onConvert,
  onDelete,
  onReopen,
}: IdeaGridProps) {
  return (
    <div className={styles.grid}>
      {ideas.map((idea) => {
        const linkedGift = idea.convertedGiftId
          ? (giftsById.get(idea.convertedGiftId) ?? null)
          : null;
        const recipientId = linkedGift?.recipientId ?? idea.recipientId;
        const recipient = recipientId ? (recipientsById.get(recipientId) ?? null) : null;

        return (
          <IdeaCard
            key={idea.id}
            idea={idea}
            recipient={recipient}
            settings={settings}
            linkedGiftExists={linkedGift !== null}
            readOnly={readOnly}
            busy={busyId === idea.id}
            onEdit={onEdit}
            onConvert={onConvert}
            onDelete={onDelete}
            onReopen={onReopen}
          />
        );
      })}
    </div>
  );
}

import { ExternalLink, Pencil, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { IconButton } from '../../components/ui/IconButton';
import type { AppSettings, Idea, Recipient } from '../../domain/entities';
import { formatMoney } from '../../domain/money';
import styles from './IdeaCard.module.css';

interface IdeaCardProps {
  idea: Idea;
  recipient: Recipient | null;
  settings: AppSettings;
  linkedGiftExists: boolean;
  readOnly: boolean;
  busy: boolean;
  onEdit: (idea: Idea) => void;
  onConvert: (idea: Idea) => void;
  onDelete: (idea: Idea) => void;
  onReopen: (idea: Idea) => void;
}

export function IdeaCard({
  idea,
  recipient,
  settings,
  linkedGiftExists,
  readOnly,
  busy,
  onEdit,
  onConvert,
  onDelete,
  onReopen,
}: IdeaCardProps) {
  const money = (value: number | null) =>
    formatMoney(value, {
      fractionDigits: settings.fractionDigits,
      currencySymbol: settings.currencySymbol,
      locale: settings.locale,
    });
  const converted = idea.status === 'converted';

  return (
    <article className={styles.card} aria-busy={busy || undefined}>
      <div className={styles.top}>
        <div className={styles.badges}>
          <Badge tone={converted ? 'success' : 'gold'}>
            {converted ? <Sparkles size={12} aria-hidden="true" /> : null}
            {converted ? 'Converted' : 'Idea'}
          </Badge>
          {idea.category ? <span className={styles.category}>{idea.category}</span> : null}
        </div>
        {!readOnly ? (
          <div className={styles.iconActions}>
            {!converted ? (
              <IconButton
                label={`Edit ${idea.name}`}
                icon={<Pencil />}
                onClick={() => onEdit(idea)}
                disabled={busy}
              />
            ) : null}
            <IconButton
              label={`Delete ${idea.name}`}
              icon={<Trash2 />}
              onClick={() => onDelete(idea)}
              disabled={busy}
            />
          </div>
        ) : null}
      </div>

      <div className={styles.body}>
        <h2 className={styles.name}>{idea.name}</h2>
        <p className={styles.recipient}>
          {recipient ? `For ${recipient.name}` : 'No recipient yet'}
          {idea.estimatedPriceMinor !== null ? (
            <>
              <span className={styles.dot} aria-hidden="true" />
              <span>{money(idea.estimatedPriceMinor)} estimated</span>
            </>
          ) : null}
        </p>

        {idea.store ? <p className={styles.meta}>{idea.store}</p> : null}

        {idea.purchaseUrl ? (
          <a
            className={styles.link}
            href={idea.purchaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Open link: ${idea.name}`}
          >
            <ExternalLink size={14} aria-hidden="true" />
            Open link
          </a>
        ) : null}

        {idea.notes ? <p className={styles.notes}>{idea.notes}</p> : null}

        {converted ? (
          <div className={styles.convertedBox}>
            {linkedGiftExists && idea.convertedGiftId ? (
              <>
                <p>This idea became a gift. Delete that gift to return the idea to the bank.</p>
                <Link
                  className={styles.giftLink}
                  to={`/gifts#gift-${idea.convertedGiftId}`}
                  aria-label={`View gift: converted from ${idea.name}`}
                >
                  View gift
                </Link>
              </>
            ) : (
              <>
                <p>The linked gift is missing, so this idea can be reopened.</p>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => onReopen(idea)}
                  disabled={readOnly || busy}
                >
                  <RefreshCw size={14} aria-hidden="true" />
                  Reopen idea
                </Button>
              </>
            )}
          </div>
        ) : readOnly ? null : (
          <div className={styles.actions}>
            <Button variant="secondary" size="sm" onClick={() => onConvert(idea)} disabled={busy}>
              {busy ? 'Converting…' : 'Convert to gift'}
            </Button>
            {!recipient ? (
              <span className={styles.convertHint}>You will choose a recipient next.</span>
            ) : null}
          </div>
        )}
      </div>
    </article>
  );
}

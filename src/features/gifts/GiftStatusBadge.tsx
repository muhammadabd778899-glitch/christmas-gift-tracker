import { Badge, type BadgeTone } from '../../components/ui/Badge';
import { giftStatus, giftStatusLabel } from '../../domain/calculations/gifts';
import type { Gift } from '../../domain/entities';

interface GiftStatusBadgeProps {
  gift: Pick<Gift, 'bought' | 'wrapped' | 'sent'>;
}

const STATUS_TONE: Record<ReturnType<typeof giftStatus>, BadgeTone> = {
  not_started: 'outline',
  bought: 'gold',
  wrapped: 'evergreen',
  sent: 'neutral',
};

export function GiftStatusBadge({ gift }: GiftStatusBadgeProps) {
  const status = giftStatus(gift);
  return <Badge tone={STATUS_TONE[status]}>{giftStatusLabel(gift)}</Badge>;
}

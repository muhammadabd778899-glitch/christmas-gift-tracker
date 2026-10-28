import type { Gift, Idea, Recipient } from '../entities';

/**
 * Simple, local search for the Idea Bank. Matching is case-insensitive and
 * substring-based over the fields a user can see on an idea card.
 */
export function filterIdeas(
  ideas: readonly Idea[],
  recipients: readonly Recipient[],
  query: string,
  gifts: readonly Gift[] = [],
): Idea[] {
  const needle = query.trim().toLocaleLowerCase();

  if (!needle) {
    return [...ideas];
  }

  const recipientsById = new Map(recipients.map((recipient) => [recipient.id, recipient]));
  const giftsById = new Map(gifts.map((gift) => [gift.id, gift]));

  return ideas.filter((idea) => {
    const linkedGift = idea.convertedGiftId ? giftsById.get(idea.convertedGiftId) : null;
    const recipientId = linkedGift?.recipientId ?? idea.recipientId;
    const recipient = recipientId ? recipientsById.get(recipientId) : null;
    const haystack = [idea.name, idea.category, idea.store, recipient?.name]
      .filter((value): value is string => Boolean(value))
      .join('\n')
      .toLocaleLowerCase();

    return haystack.includes(needle);
  });
}

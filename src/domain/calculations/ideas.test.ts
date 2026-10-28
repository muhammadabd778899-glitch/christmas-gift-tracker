import { describe, expect, it } from 'vitest';
import type { Idea } from '../entities';
import { makeGift, makeIdea, makeRecipient } from '../../test/fixtures';
import { filterIdeas } from './ideas';

function idea(id: string, overrides: Partial<Idea> = {}): Idea {
  return makeIdea({ id: id as Idea['id'], ...overrides });
}

describe('filterIdeas', () => {
  it('returns all ideas for an empty query', () => {
    const ideas = [idea('44444444-4444-4444-8444-000000000001')];
    expect(filterIdeas(ideas, [], '   ')).toEqual(ideas);
  });

  it('matches name, category, store, and recipient case-insensitively', () => {
    const recipient = makeRecipient({ name: 'Alex' });
    const ideas = [
      idea('44444444-4444-4444-8444-000000000001', {
        name: 'Book of walks',
        category: 'Books',
        store: 'Bookshop',
        recipientId: recipient.id,
      }),
      idea('44444444-4444-4444-8444-000000000002', {
        name: 'Warm scarf',
        category: 'Clothing',
        store: 'Market',
        recipientId: null,
      }),
    ];

    expect(filterIdeas(ideas, [recipient], 'book')).toHaveLength(1);
    expect(filterIdeas(ideas, [recipient], 'CLOTHING')[0].name).toBe('Warm scarf');
    expect(filterIdeas(ideas, [recipient], 'market')[0].name).toBe('Warm scarf');
    expect(filterIdeas(ideas, [recipient], 'alex')[0].name).toBe('Book of walks');
  });

  it('matches the recipient of a converted idea through its linked gift', () => {
    const alex = makeRecipient({ name: 'Alex' });
    const blair = makeRecipient({ name: 'Blair' });
    const gift = makeGift({ name: 'Book of walks', recipientId: blair.id });
    const converted = idea('44444444-4444-4444-8444-000000000001', {
      name: 'Book of walks',
      recipientId: null,
      status: 'converted',
      convertedGiftId: gift.id,
      convertedAt: '2026-10-28T12:00:00.000Z',
    });

    expect(filterIdeas([converted], [alex, blair], 'blair', [gift])).toEqual([converted]);
    expect(filterIdeas([converted], [alex, blair], 'alex', [gift])).toEqual([]);
  });

  it('returns no matches without changing the source list', () => {
    const ideas = [idea('44444444-4444-4444-8444-000000000001')];
    expect(filterIdeas(ideas, [], 'missing')).toEqual([]);
    expect(ideas).toHaveLength(1);
  });
});

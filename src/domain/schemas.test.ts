import { describe, expect, it } from 'vitest';
import { ValidationError } from './errors';
import {
  giftEntitySchema,
  ideaEntitySchema,
  parseWithSchema,
  recipientEntitySchema,
  seasonEntitySchema,
  settingsEntitySchema,
} from './schemas';
import { makeGift, makeIdea, makeRecipient, makeSeason, makeSettings } from '../test/fixtures';

describe('entity schemas', () => {
  it('accepts the normative entity shapes', () => {
    expect(seasonEntitySchema.safeParse(makeSeason()).success).toBe(true);
    expect(recipientEntitySchema.safeParse(makeRecipient()).success).toBe(true);
    expect(giftEntitySchema.safeParse(makeGift()).success).toBe(true);
    expect(ideaEntitySchema.safeParse(makeIdea()).success).toBe(true);
    expect(settingsEntitySchema.safeParse(makeSettings()).success).toBe(true);
  });

  it('enforces status invariants and timestamp order', () => {
    expect(giftEntitySchema.safeParse(makeGift({ wrapped: true })).success).toBe(false);
    expect(giftEntitySchema.safeParse(makeGift({ sent: true })).success).toBe(false);
    expect(
      giftEntitySchema.safeParse(
        makeGift({ wrappedOn: '2026-12-20', updatedAt: '2026-10-26T11:00:00.000Z' }),
      ).success,
    ).toBe(false);
    expect(
      seasonEntitySchema.safeParse(makeSeason({ status: 'archived', archivedAt: null })).success,
    ).toBe(false);
  });

  it('requires sourceIdeaId to be omitted rather than null', () => {
    expect(giftEntitySchema.safeParse({ ...makeGift(), sourceIdeaId: null }).success).toBe(false);
  });

  it('rejects unsafe money and invalid dates', () => {
    expect(recipientEntitySchema.safeParse(makeRecipient({ budgetCapMinor: -1 })).success).toBe(
      false,
    );
    expect(recipientEntitySchema.safeParse(makeRecipient({ budgetCapMinor: 1.5 })).success).toBe(
      false,
    );
    expect(
      recipientEntitySchema.safeParse(makeRecipient({ budgetCapMinor: 100_000_000_000 })).success,
    ).toBe(false);
    expect(seasonEntitySchema.safeParse(makeSeason({ holidayDate: '2026-02-30' })).success).toBe(
      false,
    );
  });

  it('rejects invalid URLs, locales, and currency settings', () => {
    expect(
      giftEntitySchema.safeParse(makeGift({ purchaseUrl: 'javascript:alert(1)' })).success,
    ).toBe(false);
    expect(
      giftEntitySchema.safeParse(makeGift({ purchaseUrl: 'https://user:pass@example.com' }))
        .success,
    ).toBe(false);
    expect(settingsEntitySchema.safeParse(makeSettings({ locale: 'not a locale' })).success).toBe(
      false,
    );
    expect(settingsEntitySchema.safeParse(makeSettings({ fractionDigits: 4 as 2 })).success).toBe(
      false,
    );
  });

  it('normalizes empty optional URLs to null', () => {
    const parsed = giftEntitySchema.parse(makeGift({ purchaseUrl: '' }));
    expect(parsed.purchaseUrl).toBeNull();
  });

  it('reports field details through ValidationError', () => {
    expect(() =>
      parseWithSchema(recipientEntitySchema, makeRecipient({ name: '   ' }), 'Invalid recipient.'),
    ).toThrowError(ValidationError);

    try {
      parseWithSchema(recipientEntitySchema, makeRecipient({ name: '   ' }), 'Invalid recipient.');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect((error as ValidationError).issues[0]?.path).toBe('name');
    }
  });
});

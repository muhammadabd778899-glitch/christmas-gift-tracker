import { z } from 'zod';
import type {
  AppSettings,
  DateOnly,
  DeliveryMethod,
  FractionDigits,
  Gift,
  GiftId,
  Idea,
  IdeaId,
  MetaKey,
  Recipient,
  RecipientId,
  Season,
  SeasonId,
  Timestamp,
} from './entities';
import { isValidDateOnly, isValidTimestamp } from './dates';
import { ValidationError, type ValidationIssue } from './errors';
import { isValidLocale, normalizeLocale } from './locale';
import { MAX_MINOR_UNITS } from './money';

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

const uuidSchema = z.string().regex(UUID_PATTERN, 'Enter a valid identifier.');

const seasonIdSchema = uuidSchema.transform((value) => value as SeasonId);
const recipientIdSchema = uuidSchema.transform((value) => value as RecipientId);
const giftIdSchema = uuidSchema.transform((value) => value as GiftId);
const ideaIdSchema = uuidSchema.transform((value) => value as IdeaId);

export const dateOnlySchema = z
  .string()
  .refine(isValidDateOnly, 'Enter a real date in YYYY-MM-DD format.');

export const timestampSchema = z
  .string()
  .refine(isValidTimestamp, 'Enter a valid UTC timestamp with milliseconds.');

export const minorUnitsSchema = z
  .number()
  .int('Use a whole number of minor units.')
  .min(0, 'Amounts cannot be negative.')
  .max(MAX_MINOR_UNITS, 'This amount is too large.')
  .refine(Number.isSafeInteger, 'This amount is too large.');

export const fractionDigitsSchema = z.union([
  z.literal(0),
  z.literal(1),
  z.literal(2),
  z.literal(3),
]) as z.ZodType<FractionDigits>;

export const themeSchema = z.enum(['light', 'dark', 'system']);

export const deliveryMethodSchema = z.enum([
  'hand_delivered',
  'shipped',
  'digital',
  'retailer_direct',
  'other',
]) as z.ZodType<DeliveryMethod>;

export const seasonStatusSchema = z.enum(['active', 'archived']);
export const ideaStatusSchema = z.enum(['active', 'converted']);

const nameSchema = (max: number, label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required.`)
    .max(max, `${label} must be ${max} characters or fewer.`);

const nullableText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} must be ${max} characters or fewer.`)
    .nullable()
    .transform((value) => (value === '' ? null : value));

const optionalText = (max: number, label: string) => nullableText(max, label).optional();

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      !url.username &&
      !url.password &&
      value.length <= 2048
    );
  } catch {
    return false;
  }
}

const nullableUrlSchema = z
  .string()
  .trim()
  .max(2048, 'The link must be 2048 characters or fewer.')
  .nullable()
  .transform((value) => (value === '' ? null : value))
  .refine(
    (value) => value === null || isHttpUrl(value),
    'Enter a complete http:// or https:// link.',
  ) as z.ZodType<string | null>;
const optionalUrlSchema = nullableUrlSchema.optional();

export const localeSchema = z
  .string()
  .trim()
  .max(35, 'The locale must be 35 characters or fewer.')
  .refine(isValidLocale, 'Enter a valid language and region tag.')
  .transform((value) => normalizeLocale(value));

const currencyCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z]{3}$/, 'Use a three-letter currency code.');

const currencySymbolSchema = z
  .string()
  .trim()
  .min(1, 'Enter a currency symbol.')
  .max(4, 'The currency symbol must be 4 characters or fewer.');

function addTimestampOrderIssue(
  value: { createdAt: string; updatedAt: string },
  context: z.RefinementCtx,
): void {
  if (
    isValidTimestamp(value.createdAt) &&
    isValidTimestamp(value.updatedAt) &&
    value.updatedAt < value.createdAt
  ) {
    context.addIssue({
      code: 'custom',
      path: ['updatedAt'],
      message: 'The last-updated time cannot be before the created time.',
    });
  }
}

export const seasonEntitySchema = z
  .object({
    id: seasonIdSchema,
    name: nameSchema(80, 'Season name'),
    holidayDate: dateOnlySchema,
    budgetMinor: minorUnitsSchema.nullable(),
    status: seasonStatusSchema,
    isSample: z.boolean(),
    archivedAt: timestampSchema.nullable(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict()
  .superRefine((season, context) => {
    addTimestampOrderIssue(season, context);

    if (season.status === 'archived' && season.archivedAt === null) {
      context.addIssue({
        code: 'custom',
        path: ['archivedAt'],
        message: 'An archived season needs an archive time.',
      });
    }

    if (season.status === 'active' && season.archivedAt !== null) {
      context.addIssue({
        code: 'custom',
        path: ['archivedAt'],
        message: 'An active season cannot have an archive time.',
      });
    }
  }) as z.ZodType<Season>;

export const recipientEntitySchema = z
  .object({
    id: recipientIdSchema,
    seasonId: seasonIdSchema,
    name: nameSchema(80, 'Recipient name'),
    relationship: nullableText(40, 'Relationship'),
    budgetCapMinor: minorUnitsSchema.nullable(),
    notes: nullableText(2000, 'Notes'),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict()
  .superRefine(addTimestampOrderIssue) as z.ZodType<Recipient>;

export const giftEntitySchema = z
  .object({
    id: giftIdSchema,
    seasonId: seasonIdSchema,
    recipientId: recipientIdSchema,
    name: nameSchema(120, 'Gift name'),
    category: nullableText(40, 'Category'),
    store: nullableText(80, 'Store'),
    purchaseUrl: nullableUrlSchema,
    plannedBudgetMinor: minorUnitsSchema.nullable(),
    actualCostMinor: minorUnitsSchema.nullable(),
    bought: z.boolean(),
    boughtOn: dateOnlySchema.nullable(),
    wrapped: z.boolean(),
    wrappedOn: dateOnlySchema.nullable(),
    sent: z.boolean(),
    sentOn: dateOnlySchema.nullable(),
    deliveryMethod: deliveryMethodSchema.nullable(),
    address: nullableText(500, 'Address'),
    notes: nullableText(2000, 'Notes'),
    sourceIdeaId: ideaIdSchema.optional(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict()
  .superRefine((gift, context) => {
    addTimestampOrderIssue(gift, context);

    if (gift.wrapped && !gift.bought) {
      context.addIssue({
        code: 'custom',
        path: ['wrapped'],
        message: 'A wrapped gift must also be marked bought.',
      });
    }

    if (gift.sent && !gift.bought) {
      context.addIssue({
        code: 'custom',
        path: ['sent'],
        message: 'A sent gift must also be marked bought.',
      });
    }

    if (!gift.bought && gift.boughtOn !== null) {
      context.addIssue({
        code: 'custom',
        path: ['boughtOn'],
        message: 'Clear the bought date before marking the gift not bought.',
      });
    }

    if (!gift.wrapped && gift.wrappedOn !== null) {
      context.addIssue({
        code: 'custom',
        path: ['wrappedOn'],
        message: 'Clear the wrapped date before marking the gift not wrapped.',
      });
    }

    if (!gift.sent && gift.sentOn !== null) {
      context.addIssue({
        code: 'custom',
        path: ['sentOn'],
        message: 'Clear the sent date before marking the gift not sent.',
      });
    }
  }) as z.ZodType<Gift>;

export const ideaEntitySchema = z
  .object({
    id: ideaIdSchema,
    seasonId: seasonIdSchema,
    recipientId: recipientIdSchema.nullable(),
    name: nameSchema(120, 'Idea name'),
    category: nullableText(40, 'Category'),
    store: nullableText(80, 'Store'),
    purchaseUrl: nullableUrlSchema,
    estimatedPriceMinor: minorUnitsSchema.nullable(),
    notes: nullableText(2000, 'Notes'),
    status: ideaStatusSchema,
    convertedGiftId: giftIdSchema.nullable(),
    convertedAt: timestampSchema.nullable(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict()
  .superRefine((idea, context) => {
    addTimestampOrderIssue(idea, context);

    if (idea.status === 'active' && (idea.convertedGiftId !== null || idea.convertedAt !== null)) {
      context.addIssue({
        code: 'custom',
        path: ['convertedGiftId'],
        message: 'An active idea cannot have a converted gift.',
      });
    }

    if (
      idea.status === 'converted' &&
      (idea.convertedGiftId === null || idea.convertedAt === null)
    ) {
      context.addIssue({
        code: 'custom',
        path: ['convertedGiftId'],
        message: 'A converted idea needs a gift and conversion time.',
      });
    }
  }) as z.ZodType<Idea>;

export const settingsEntitySchema = z
  .object({
    id: z.literal('app'),
    activeSeasonId: seasonIdSchema.nullable(),
    currencyCode: currencyCodeSchema,
    currencySymbol: currencySymbolSchema,
    fractionDigits: fractionDigitsSchema,
    locale: localeSchema,
    theme: themeSchema,
    hasCompletedOnboarding: z.boolean(),
    createdAt: timestampSchema,
    updatedAt: timestampSchema,
  })
  .strict()
  .superRefine(addTimestampOrderIssue) as z.ZodType<AppSettings>;

export const metaRecordSchema = z
  .object({
    key: z.enum([
      'schemaVersion',
      'databaseId',
      'appVersion',
      'lastOpenedAt',
      'lastMigration',
      'onboardingVersion',
    ]) as z.ZodType<MetaKey>,
    value: z.unknown(),
    updatedAt: timestampSchema,
  })
  .strict();

export const seasonCreateInputSchema = z
  .object({
    name: nameSchema(80, 'Season name'),
    holidayDate: dateOnlySchema,
    budgetMinor: minorUnitsSchema.nullable().optional(),
    status: seasonStatusSchema.optional(),
    isSample: z.boolean().optional(),
  })
  .strict();

export const seasonUpdateInputSchema = z
  .object({
    name: nameSchema(80, 'Season name').optional(),
    holidayDate: dateOnlySchema.optional(),
    budgetMinor: minorUnitsSchema.nullable().optional(),
  })
  .strict();

export const recipientCreateInputSchema = z
  .object({
    seasonId: seasonIdSchema,
    name: nameSchema(80, 'Recipient name'),
    relationship: optionalText(40, 'Relationship'),
    budgetCapMinor: minorUnitsSchema.nullable().optional(),
    notes: optionalText(2000, 'Notes'),
  })
  .strict();

export const recipientUpdateInputSchema = z
  .object({
    name: nameSchema(80, 'Recipient name').optional(),
    relationship: nullableText(40, 'Relationship').optional(),
    budgetCapMinor: minorUnitsSchema.nullable().optional(),
    notes: nullableText(2000, 'Notes').optional(),
  })
  .strict();

export const giftCreateInputSchema = z
  .object({
    seasonId: seasonIdSchema,
    recipientId: recipientIdSchema,
    name: nameSchema(120, 'Gift name'),
    category: optionalText(40, 'Category'),
    store: optionalText(80, 'Store'),
    purchaseUrl: optionalUrlSchema,
    plannedBudgetMinor: minorUnitsSchema.nullable().optional(),
    actualCostMinor: minorUnitsSchema.nullable().optional(),
    bought: z.boolean().optional().default(false),
    boughtOn: dateOnlySchema.nullable().optional(),
    wrapped: z.boolean().optional().default(false),
    wrappedOn: dateOnlySchema.nullable().optional(),
    sent: z.boolean().optional().default(false),
    sentOn: dateOnlySchema.nullable().optional(),
    deliveryMethod: deliveryMethodSchema.nullable().optional(),
    address: optionalText(500, 'Address'),
    notes: optionalText(2000, 'Notes'),
  })
  .strict();

export const giftUpdateInputSchema = z
  .object({
    recipientId: recipientIdSchema.optional(),
    name: nameSchema(120, 'Gift name').optional(),
    category: nullableText(40, 'Category').optional(),
    store: nullableText(80, 'Store').optional(),
    purchaseUrl: nullableUrlSchema.optional(),
    plannedBudgetMinor: minorUnitsSchema.nullable().optional(),
    actualCostMinor: minorUnitsSchema.nullable().optional(),
    bought: z.boolean().optional(),
    boughtOn: dateOnlySchema.nullable().optional(),
    wrapped: z.boolean().optional(),
    wrappedOn: dateOnlySchema.nullable().optional(),
    sent: z.boolean().optional(),
    sentOn: dateOnlySchema.nullable().optional(),
    deliveryMethod: deliveryMethodSchema.nullable().optional(),
    address: nullableText(500, 'Address').optional(),
    notes: nullableText(2000, 'Notes').optional(),
  })
  .strict();

export const giftPurchaseStateInputSchema = z
  .object({
    bought: z.boolean().optional(),
    boughtOn: dateOnlySchema.nullable().optional(),
    wrapped: z.boolean().optional(),
    wrappedOn: dateOnlySchema.nullable().optional(),
    sent: z.boolean().optional(),
    sentOn: dateOnlySchema.nullable().optional(),
  })
  .strict();

export const ideaCreateInputSchema = z
  .object({
    seasonId: seasonIdSchema,
    recipientId: recipientIdSchema.nullable().optional(),
    name: nameSchema(120, 'Idea name'),
    category: optionalText(40, 'Category'),
    store: optionalText(80, 'Store'),
    purchaseUrl: optionalUrlSchema,
    estimatedPriceMinor: minorUnitsSchema.nullable().optional(),
    notes: optionalText(2000, 'Notes'),
  })
  .strict();

export const ideaUpdateInputSchema = z
  .object({
    recipientId: recipientIdSchema.nullable().optional(),
    name: nameSchema(120, 'Idea name').optional(),
    category: nullableText(40, 'Category').optional(),
    store: nullableText(80, 'Store').optional(),
    purchaseUrl: nullableUrlSchema.optional(),
    estimatedPriceMinor: minorUnitsSchema.nullable().optional(),
    notes: nullableText(2000, 'Notes').optional(),
  })
  .strict();

export const settingsUpdateInputSchema = z
  .object({
    activeSeasonId: seasonIdSchema.nullable().optional(),
    currencyCode: currencyCodeSchema.optional(),
    currencySymbol: currencySymbolSchema.optional(),
    fractionDigits: fractionDigitsSchema.optional(),
    locale: localeSchema.optional(),
    theme: themeSchema.optional(),
    hasCompletedOnboarding: z.boolean().optional(),
  })
  .strict();

export type SeasonCreateInput = z.input<typeof seasonCreateInputSchema>;
export type SeasonUpdateInput = z.input<typeof seasonUpdateInputSchema>;
export type RecipientCreateInput = z.input<typeof recipientCreateInputSchema>;
export type RecipientUpdateInput = z.input<typeof recipientUpdateInputSchema>;
export type GiftCreateInput = z.input<typeof giftCreateInputSchema>;
export type GiftUpdateInput = z.input<typeof giftUpdateInputSchema>;
export type GiftPurchaseStateInput = z.input<typeof giftPurchaseStateInputSchema>;
export type IdeaCreateInput = z.input<typeof ideaCreateInputSchema>;
export type IdeaUpdateInput = z.input<typeof ideaUpdateInputSchema>;
export type SettingsUpdateInput = z.input<typeof settingsUpdateInputSchema>;

export function toValidationIssues(error: z.ZodError): ValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join('.') : 'record',
    message: issue.message,
  }));
}

export function parseWithSchema<T>(
  schema: z.ZodType<T>,
  value: unknown,
  message = 'Some fields need attention.',
): T {
  const result = schema.safeParse(value);

  if (!result.success) {
    throw new ValidationError(message, toValidationIssues(result.error));
  }

  return result.data;
}

export type { DateOnly, Timestamp };

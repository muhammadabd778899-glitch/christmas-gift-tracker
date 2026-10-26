export type SeasonId = string & { readonly __brand: 'SeasonId' };
export type RecipientId = string & { readonly __brand: 'RecipientId' };
export type GiftId = string & { readonly __brand: 'GiftId' };
export type IdeaId = string & { readonly __brand: 'IdeaId' };

export type DateOnly = string;
export type Timestamp = string;
export type MinorUnits = number;

export type SeasonStatus = 'active' | 'archived';
export type IdeaStatus = 'active' | 'converted';
export type ThemePreference = 'light' | 'dark' | 'system';
export type FractionDigits = 0 | 1 | 2 | 3;

export type DeliveryMethod = 'hand_delivered' | 'shipped' | 'digital' | 'retailer_direct' | 'other';

export interface Season {
  id: SeasonId;
  name: string;
  holidayDate: DateOnly;
  budgetMinor: MinorUnits | null;
  status: SeasonStatus;
  isSample: boolean;
  archivedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Recipient {
  id: RecipientId;
  seasonId: SeasonId;
  name: string;
  relationship: string | null;
  budgetCapMinor: MinorUnits | null;
  notes: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Gift {
  id: GiftId;
  seasonId: SeasonId;
  recipientId: RecipientId;
  name: string;
  category: string | null;
  store: string | null;
  purchaseUrl: string | null;
  plannedBudgetMinor: MinorUnits | null;
  actualCostMinor: MinorUnits | null;
  bought: boolean;
  boughtOn: DateOnly | null;
  wrapped: boolean;
  wrappedOn: DateOnly | null;
  sent: boolean;
  sentOn: DateOnly | null;
  deliveryMethod: DeliveryMethod | null;
  address: string | null;
  notes: string | null;
  sourceIdeaId?: IdeaId;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Idea {
  id: IdeaId;
  seasonId: SeasonId;
  recipientId: RecipientId | null;
  name: string;
  category: string | null;
  store: string | null;
  purchaseUrl: string | null;
  estimatedPriceMinor: MinorUnits | null;
  notes: string | null;
  status: IdeaStatus;
  convertedGiftId: GiftId | null;
  convertedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface AppSettings {
  id: 'app';
  activeSeasonId: SeasonId | null;
  currencyCode: string;
  currencySymbol: string;
  fractionDigits: FractionDigits;
  locale: string;
  theme: ThemePreference;
  hasCompletedOnboarding: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface MetaValues {
  schemaVersion: number;
  databaseId: string;
  appVersion: string;
  lastOpenedAt: Timestamp;
  lastMigration: {
    from: number;
    to: number;
    at: Timestamp;
  };
  onboardingVersion: number;
}

export type MetaKey = keyof MetaValues;

export type MetaRecord = {
  [K in MetaKey]: {
    key: K;
    value: MetaValues[K];
    updatedAt: Timestamp;
  };
}[MetaKey];

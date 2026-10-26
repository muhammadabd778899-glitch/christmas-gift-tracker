import { Gift } from 'lucide-react';
import { PlannedPage } from './PlannedPage';

export function GiftsPage() {
  return (
    <PlannedPage
      eyebrow="Core workflow"
      title="Gifts"
      description="Every gift, recipient, cost, and status in one calm list."
      milestone="Milestone 4"
      icon={Gift}
      features={[
        {
          title: 'Structured gift records',
          description:
            'Name, recipient, category, store, purchase link, delivery method, address, and notes — all in one place.',
        },
        {
          title: 'Money that adds up',
          description:
            'Planned budget and actual cost stored as integer minor units, never spreadsheet rounding.',
        },
        {
          title: 'Bought, wrapped, sent',
          description:
            'Three explicit statuses with sensible progression, dates, and clear indicators.',
        },
        {
          title: 'Safe edits',
          description:
            'Confirmation for destructive actions, protected status transitions, and automatic budget recalculation.',
        },
      ]}
      note="Gift management depends on the storage layer and recipient records, so it follows Milestones 2 and 3."
    />
  );
}

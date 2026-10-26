import { Users } from 'lucide-react';
import { PlannedPage } from './PlannedPage';

export function RecipientsPage() {
  return (
    <PlannedPage
      eyebrow="People"
      title="Recipients"
      description="Give every person a budget cap, a gift list, and a clear spending picture."
      milestone="Milestone 3"
      icon={Users}
      features={[
        {
          title: 'Recipient profiles',
          description:
            'Name, relationship, optional notes, and a stable identity — not a row in a spreadsheet.',
        },
        {
          title: 'Independent budget caps',
          description:
            'Set a cap per person without pretending it must add up to the season budget.',
        },
        {
          title: 'Calculated spending',
          description:
            'Planned and actual totals come from gift records, never from a manually typed summary.',
        },
        {
          title: 'Deliberate deletion',
          description:
            'Reassign gifts or explicitly cascade-delete them; ideas are preserved and become unassigned.',
        },
      ]}
      note="Recipients arrive after storage is proven, and include the minimal first-season setup needed to begin planning."
    />
  );
}

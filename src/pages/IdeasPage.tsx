import { Lightbulb } from 'lucide-react';
import { PlannedPage } from './PlannedPage';

export function IdeasPage() {
  return (
    <PlannedPage
      eyebrow="Before you buy"
      title="Idea Bank"
      description="Capture possibilities early, then promote the right ones into real gifts."
      milestone="Milestone 6"
      icon={Lightbulb}
      features={[
        {
          title: 'Low-pressure notes',
          description:
            'Store a gift idea, an intended recipient, a store or link, an estimated price, and notes.',
        },
        {
          title: 'One-click conversion',
          description:
            'Turn an idea into a gift atomically, with copied details and a link back to the original idea.',
        },
        {
          title: 'No duplicate gifts',
          description:
            'A unique source reference makes repeated clicks and interrupted retries safe.',
        },
        {
          title: 'Ideas stay recoverable',
          description:
            'Converting does not destroy the idea. Deleting the gift returns it to the bank.',
        },
      ]}
      note="The Idea Bank needs recipients and gifts to convert into, so it follows the core planning milestones."
    />
  );
}

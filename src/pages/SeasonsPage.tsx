import { Archive } from 'lucide-react';
import { PlannedPage } from './PlannedPage';

export function SeasonsPage() {
  return (
    <PlannedPage
      eyebrow="Year after year"
      title="Archives"
      description="Keep every Christmas intact, then start the next one without losing the last."
      milestone="Milestone 8"
      icon={Archive}
      features={[
        {
          title: 'Isolated seasons',
          description:
            'Each Christmas has its own recipients, gifts, ideas, budget, and holiday date.',
        },
        {
          title: 'Non-destructive archiving',
          description:
            'Completed seasons become read-only and remain available for reference and export.',
        },
        {
          title: 'Restore and switch',
          description:
            'Restore an archived season deliberately. The app never mixes two seasons by accident.',
        },
        {
          title: 'Backups and CSV',
          description:
            'Complete JSON backups, validated restore, and a spreadsheet-friendly gift export.',
        },
      ]}
      note="Season management is paired with backup and export so the product is genuinely reusable and recoverable."
    />
  );
}

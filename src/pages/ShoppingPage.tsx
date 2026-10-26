import { ShoppingBag } from 'lucide-react';
import { PlannedPage } from './PlannedPage';

export function ShoppingPage() {
  return (
    <PlannedPage
      eyebrow="Out the door"
      title="Shopping List"
      description="Everything still to buy, grouped by store and ready to print."
      milestone="Milestone 6"
      icon={ShoppingBag}
      features={[
        {
          title: 'Derived, never duplicated',
          description:
            'The list is generated from unbought gifts, so it can never drift out of sync with your records.',
        },
        {
          title: 'Grouped by store',
          description:
            'Aisles and errands make sense when gifts are grouped, with a clear section for missing stores.',
        },
        {
          title: 'Links and planned costs',
          description:
            'Open a product page, see the recipient, and know the planned budget before you buy.',
        },
        {
          title: 'Print-friendly',
          description:
            'A clean printed list with no navigation, filters, or buttons — just what you need in the shop.',
        },
      ]}
      note="Shopping is a view over gift data, so it ships with the Idea Bank after gifts and budgets are stable."
    />
  );
}

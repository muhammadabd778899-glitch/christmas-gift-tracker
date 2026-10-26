import type { LucideIcon } from 'lucide-react';
import { Check, ListChecks, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Badge } from '../components/ui/Badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/Card';
import { PageHeader } from '../components/ui/PageHeader';
import { buttonStyles } from '../components/ui/buttonStyles';
import styles from './PlannedPage.module.css';

export interface PlannedFeature {
  title: string;
  description: string;
}

interface PlannedPageProps {
  eyebrow: string;
  title: string;
  description: string;
  milestone: string;
  icon: LucideIcon;
  features: PlannedFeature[];
  note: string;
}

export function PlannedPage({
  eyebrow,
  title,
  description,
  milestone,
  icon: Icon,
  features,
  note,
}: PlannedPageProps) {
  return (
    <div className={styles.page}>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        badge={<Badge tone="gold">Planned · {milestone}</Badge>}
        actions={
          <Link className={buttonStyles({ variant: 'secondary', size: 'sm' })} to="/settings">
            View roadmap
          </Link>
        }
      />

      <div className={styles.layout}>
        <Card className={styles.featureCard}>
          <CardHeader>
            <Badge tone="evergreen">Page plan</Badge>
            <CardTitle as="h2">What this page will do</CardTitle>
            <CardDescription>
              The interface is wired and ready for its data layer. These are the capabilities
              planned for this section.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className={styles.features}>
              {features.map((feature, index) => (
                <li key={feature.title} className={styles.feature}>
                  <span className={styles.featureIndex} aria-hidden="true">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <div>
                    <h3 className={styles.featureTitle}>{feature.title}</h3>
                    <p className={styles.featureDescription}>{feature.description}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className={styles.statusCard}>
          <div className={styles.statusIcon} aria-hidden="true">
            <Icon />
          </div>
          <p className={styles.statusEyebrow}>Build status</p>
          <h2 className={styles.statusTitle}>{milestone}</h2>
          <p className={styles.statusText}>{note}</p>
          <span className={styles.statusPill}>
            <span className={styles.statusDot} aria-hidden="true" />
            Not implemented yet
          </span>
          <p className={styles.statusHint}>
            Nothing here pretends to work. The page will ship when its milestone passes its
            acceptance criteria.
          </p>
        </Card>
      </div>

      <div className={styles.checkStrip}>
        <span>
          <Check size={15} aria-hidden="true" />
          Wired into primary navigation
        </span>
        <span>
          <Check size={15} aria-hidden="true" />
          Responsive at every size
        </span>
        <span>
          <Check size={15} aria-hidden="true" />
          No sample data or hidden logic
        </span>
        <span>
          <ListChecks size={15} aria-hidden="true" />
          {milestone} acceptance criteria apply
        </span>
      </div>

      <div className={styles.footnote}>
        <Sparkles size={15} aria-hidden="true" />
        <p>
          Looking for the full sequence? The build roadmap in <Link to="/settings">Settings</Link>{' '}
          shows every milestone and what it delivers.
        </p>
      </div>
    </div>
  );
}

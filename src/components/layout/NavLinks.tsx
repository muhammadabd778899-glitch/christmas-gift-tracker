import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/cn';
import { navSections } from '../../app/navigation';
import styles from './NavLinks.module.css';

interface NavLinksProps {
  ariaLabel: string;
  tone?: 'dark' | 'light';
  onNavigate?: () => void;
}

export function NavLinks({ ariaLabel, tone = 'dark', onNavigate }: NavLinksProps) {
  return (
    <nav aria-label={ariaLabel} className={cn(styles.nav, styles[tone])}>
      {navSections.map((section) => (
        <div key={section.label} className={styles.section}>
          <p className={styles.sectionLabel}>{section.label}</p>
          <ul className={styles.list}>
            {section.items.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    onClick={onNavigate}
                    className={({ isActive }) => cn(styles.link, isActive && styles.active)}
                  >
                    <span className={styles.icon} aria-hidden="true">
                      <Icon size={18} strokeWidth={1.9} />
                    </span>
                    <span>{item.label}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

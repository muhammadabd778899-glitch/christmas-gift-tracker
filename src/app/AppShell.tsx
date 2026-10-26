import { useEffect, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AboutDialog } from './AboutDialog';
import { Header } from '../components/layout/Header';
import { MobileNav } from '../components/layout/MobileNav';
import { Sidebar } from '../components/layout/Sidebar';
import { APP_VERSION } from '../lib/appInfo';
import { getPageTitle } from './navigation';
import styles from './AppShell.module.css';

export function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);

  useEffect(() => {
    document.title = `${pageTitle} · Christmas Gift Tracker`;
  }, [pageTitle]);

  return (
    <div className={styles.shell}>
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <Sidebar />

      <div className={styles.column}>
        <Header onOpenNav={() => setMobileNavOpen(true)} onOpenAbout={() => setAboutOpen(true)} />

        <main id="main-content" className={styles.main} tabIndex={-1}>
          <Outlet />
        </main>

        <footer className={styles.footer}>
          <span>Christmas Gift Tracker</span>
          <span className={styles.footerDivider} aria-hidden="true" />
          <span>Built for calmer Christmases.</span>
          <span className={styles.footerVersion}>v{APP_VERSION}</span>
        </footer>
      </div>

      <MobileNav open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </div>
  );
}

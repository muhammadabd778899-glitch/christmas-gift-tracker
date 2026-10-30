import { useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AboutDialog } from './AboutDialog';
import { Header } from '../components/layout/Header';
import { MobileNav } from '../components/layout/MobileNav';
import { Sidebar } from '../components/layout/Sidebar';
import { APP_VERSION } from '../lib/appInfo';
import { getPageTitle } from './navigation';
import { ThemeController } from './ThemeController';
import styles from './AppShell.module.css';

export function AppShell() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const location = useLocation();
  const pageTitle = getPageTitle(location.pathname);
  const previousPathRef = useRef(location.pathname);

  useEffect(() => {
    document.title = `${pageTitle} · Christmas Gift Tracker`;
  }, [pageTitle]);

  useEffect(() => {
    if (previousPathRef.current === location.pathname) {
      return;
    }

    previousPathRef.current = location.pathname;

    if (window.scrollY > 0) {
      window.scrollTo(0, 0);
    }

    document.getElementById('main-content')?.focus({ preventScroll: true });
  }, [location.pathname]);

  useEffect(() => {
    if (!location.hash) {
      return;
    }

    const id = decodeURIComponent(location.hash.slice(1));
    if (!id) {
      return;
    }

    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    let cancelled = false;
    let frame = 0;
    let attempts = 0;

    const reveal = () => {
      if (cancelled) {
        return;
      }

      const target = document.getElementById(id);

      if (!target) {
        if (attempts >= 60) {
          return;
        }

        attempts += 1;
        frame = window.requestAnimationFrame(reveal);
        return;
      }

      if (typeof target.scrollIntoView === 'function') {
        target.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' });
      }

      target.focus({ preventScroll: true });
    };

    frame = window.requestAnimationFrame(reveal);

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [location.pathname, location.hash]);

  return (
    <div className={styles.shell}>
      <ThemeController />
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

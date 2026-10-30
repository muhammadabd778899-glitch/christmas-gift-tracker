import { useEffect, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable';

function isStandaloneDisplay(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };

  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    navigatorWithStandalone.standalone === true
  );
}

export interface InstallPromptState {
  canInstall: boolean;
  installed: boolean;
  install: () => Promise<InstallOutcome>;
}

export function useInstallPrompt(): InstallPromptState {
  const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(isStandaloneDisplay);

  useEffect(() => {
    const handlePrompt = (event: Event) => {
      event.preventDefault();
      setPromptEvent(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setPromptEvent(null);
      setInstalled(true);
    };
    const displayMode = window.matchMedia?.('(display-mode: standalone)');
    const handleDisplayMode = () => setInstalled(isStandaloneDisplay());

    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('appinstalled', handleInstalled);
    displayMode?.addEventListener?.('change', handleDisplayMode);

    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('appinstalled', handleInstalled);
      displayMode?.removeEventListener?.('change', handleDisplayMode);
    };
  }, []);

  async function install(): Promise<InstallOutcome> {
    if (!promptEvent) {
      return 'unavailable';
    }

    await promptEvent.prompt();
    const choice = await promptEvent.userChoice;
    setPromptEvent(null);

    if (choice.outcome === 'accepted') {
      setInstalled(true);
    }

    return choice.outcome;
  }

  return { canInstall: promptEvent !== null, installed, install };
}

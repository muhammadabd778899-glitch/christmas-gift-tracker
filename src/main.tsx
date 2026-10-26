import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App';
import { BootScreen } from './app/BootScreen';
import { StorageRecoveryPage } from './app/StorageRecoveryPage';
import { APP_VERSION } from './lib/appInfo';
import { toAppError } from './storage/errors';
import './styles/global.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Application root element was not found.');
}

const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <BootScreen />
  </StrictMode>,
);

async function startApplication() {
  try {
    const { initializeStorage } = await import('./storage/initialize');

    await initializeStorage({
      appVersion: APP_VERSION,
      locale: typeof navigator === 'undefined' ? undefined : navigator.language,
    });

    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  } catch (error) {
    root.render(
      <StrictMode>
        <StorageRecoveryPage error={toAppError(error)} />
      </StrictMode>,
    );
  }
}

void startApplication();

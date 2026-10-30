import { useRegisterSW } from 'virtual:pwa-register/react';

export interface PwaUpdate {
  needRefresh: boolean;
  offlineReady: boolean;
  dismiss: () => void;
  applyUpdate: () => Promise<void>;
}

export function usePwaUpdate(): PwaUpdate {
  const { needRefresh, offlineReady, updateServiceWorker } = useRegisterSW({
    onRegisterError(error) {
      console.warn('The offline cache could not be registered.', error);
    },
  });

  return {
    needRefresh: needRefresh[0],
    offlineReady: offlineReady[0],
    dismiss: () => {
      needRefresh[1](false);
      offlineReady[1](false);
    },
    applyUpdate: () => updateServiceWorker(true),
  };
}

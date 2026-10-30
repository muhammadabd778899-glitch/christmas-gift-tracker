type BooleanState = [boolean, (value: boolean) => void];

export interface StubRegisterSW {
  needRefresh: BooleanState;
  offlineReady: BooleanState;
  updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
}

export function useRegisterSW(): StubRegisterSW {
  return {
    needRefresh: [false, () => undefined],
    offlineReady: [false, () => undefined],
    updateServiceWorker: async () => undefined,
  };
}

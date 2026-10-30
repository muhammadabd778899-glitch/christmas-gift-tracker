export function isServiceWorkerSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.location.protocol !== 'file:' &&
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator
  );
}

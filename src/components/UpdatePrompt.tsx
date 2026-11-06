import { useRegisterSW } from 'virtual:pwa-register/react';

/** Shows a toast when a new version of the PWA is available or the app is ready offline. */
export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh && !offlineReady) return null;
  return (
    <div className="toast" role="status">
      <span>{needRefresh ? 'A new version is available.' : 'Ready to work offline.'}</span>
      {needRefresh && (
        <button className="btn small" onClick={() => updateServiceWorker(true)}>
          Reload
        </button>
      )}
      <button
        className="btn small ghost"
        onClick={() => {
          setNeedRefresh(false);
          setOfflineReady(false);
        }}
      >
        Close
      </button>
    </div>
  );
}

import { useEffect, useState } from 'react';
import { labelaryUrl, type LabelSettings } from '../lib/zpl';

/**
 * Renders a PNG preview of ZPL via the Labelary API (online only).
 * Debounced so we don't hammer the service while typing.
 */
export default function LabelPreview({ zpl, settings }: { zpl: string; settings: LabelSettings }) {
  const [src, setSrc] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!navigator.onLine) {
      setErr('Preview unavailable offline.');
      return;
    }
    let url: string | null = null;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        // Labelary renders one label; strip the quantity so it doesn't matter.
        const body = zpl.replace(/\^PQ[^\n^]*/g, '');
        const res = await fetch(labelaryUrl(settings), {
          method: 'POST',
          headers: { Accept: 'image/png', 'Content-Type': 'application/x-www-form-urlencoded' },
          body,
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(await res.text());
        url = URL.createObjectURL(await res.blob());
        setSrc(url);
        setErr(null);
      } catch (e) {
        if ((e as Error).name !== 'AbortError') setErr('Preview failed: ' + (e as Error).message);
      }
    }, 600);
    return () => {
      clearTimeout(t);
      ctrl.abort();
      if (url) URL.revokeObjectURL(url);
    };
  }, [zpl, settings]);

  return (
    <div className="label-preview">
      {src ? (
        <img
          src={src}
          alt="Label preview"
          style={{ aspectRatio: `${settings.widthIn} / ${settings.heightIn}` }}
        />
      ) : (
        <div className="label-placeholder" style={{ aspectRatio: `${settings.widthIn} / ${settings.heightIn}` }} />
      )}
      {err && <small className="muted">{err}</small>}
    </div>
  );
}

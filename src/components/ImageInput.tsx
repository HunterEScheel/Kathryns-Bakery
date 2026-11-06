import { useState } from 'react';
import { uploadImage } from '../lib/supabase';

export default function ImageInput({
  value,
  onChange,
  folder,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  folder: string;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  return (
    <div className="image-input">
      {value && <img src={value} alt="" />}
      <div className="row">
        <input
          type="file"
          accept="image/*"
          disabled={busy}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            setBusy(true);
            setErr(null);
            try {
              onChange(await uploadImage(f, folder));
            } catch (x) {
              setErr(x instanceof Error ? x.message : String(x));
            } finally {
              setBusy(false);
            }
          }}
        />
        {value && (
          <button type="button" className="btn small ghost" onClick={() => onChange(null)}>
            Remove
          </button>
        )}
      </div>
      {busy && <small className="muted">Uploading…</small>}
      {err && <small className="error-text">{err}</small>}
    </div>
  );
}

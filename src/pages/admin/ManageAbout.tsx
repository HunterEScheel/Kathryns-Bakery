import { useEffect, useState } from 'react';
import { bySection, deleteContent, getContent, saveContent } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { slugify } from '../../lib/format';
import type { SiteContent } from '../../lib/types';
import Loading from '../../components/Loading';
import ErrorNote from '../../components/ErrorNote';

/** The two sections the About page always leads with. They can be edited but not removed. */
const DEFAULTS: SiteContent[] = [
  { key: 'about', title: 'About Us', body: '' },
  { key: 'mission', title: 'Our Mission', body: '' },
];

interface Draft extends SiteContent {
  /** Not saved yet: its key is made from the title on save. */
  isNew?: boolean;
  /** Stable React key for unsaved sections. */
  tempId?: string;
}

/** Turn a title into a key that no other section uses ("events", "events-2", ...). */
function uniqueKey(title: string, taken: Set<string>) {
  const base = slugify(title) || 'section';
  let key = base;
  for (let n = 2; taken.has(key); n++) key = `${base}-${n}`;
  taken.add(key);
  return key;
}

export default function ManageAbout() {
  const { data, error, loading, reload } = useAsync(getContent);
  const [sections, setSections] = useState<Draft[]>([]);
  const [removed, setRemoved] = useState<string[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!data) return;
    const rows: Draft[] = [...data];
    for (const d of DEFAULTS) if (!rows.some((r) => r.key === d.key)) rows.push({ ...d });
    setSections(rows.sort(bySection));
    setRemoved([]);
  }, [data]);

  const update = (i: number, patch: Partial<Draft>) => {
    setMsg(null);
    setSections((cur) => cur.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  };

  function add() {
    setMsg(null);
    setSections((cur) => [...cur, { key: '', title: '', body: '', isNew: true, tempId: crypto.randomUUID() }]);
  }

  function remove(i: number) {
    const s = sections[i];
    const name = s.title.trim() || 'this section';
    if (!confirm(`Remove "${name}" from the About page? This happens when you click Save.`)) return;
    setMsg(null);
    if (!s.isNew) setRemoved((r) => [...r, s.key]);
    setSections((cur) => cur.filter((_, j) => j !== i));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setSaving(true);
    try {
      const taken = new Set(sections.filter((s) => !s.isNew).map((s) => s.key));
      const rows: SiteContent[] = sections.map((s) => ({
        key: s.isNew ? uniqueKey(s.title, taken) : s.key,
        title: s.title.trim(),
        body: s.body,
      }));
      await Promise.all(removed.map(deleteContent));
      await Promise.all(rows.map(saveContent));
      await reload();
      setMsg('Saved.');
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading && !data) return <Loading />;
  return (
    <form className="form" onSubmit={save}>
      <div className="row between wrap">
        <h1>About page</h1>
        <button type="button" className="btn ghost" onClick={add}>
          + Add section
        </button>
      </div>
      <p className="muted">
        Every section here shows on the About page. About Us and Our Mission come first; other sections follow in
        alphabetical order by the title they were created with.
      </p>
      <ErrorNote error={error || err} />
      {sections.map((s, i) => (
        <section key={s.tempId ?? s.key} className="card form">
          <div className="row between">
            <strong>{s.isNew ? 'New section' : s.title.trim() || s.key}</strong>
            {!DEFAULTS.some((d) => d.key === s.key) && (
              <button type="button" className="btn small ghost" onClick={() => remove(i)}>
                Remove
              </button>
            )}
          </div>
          <label>
            Heading
            <input required={s.isNew} value={s.title} onChange={(e) => update(i, { title: e.target.value })} />
          </label>
          <label>
            Text <small className="muted">(blank line = new paragraph)</small>
            <textarea rows={8} value={s.body} onChange={(e) => update(i, { body: e.target.value })} />
          </label>
        </section>
      ))}
      <div className="row">
        <button className="btn" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        {msg && <span className="ok-text">{msg}</span>}
      </div>
    </form>
  );
}

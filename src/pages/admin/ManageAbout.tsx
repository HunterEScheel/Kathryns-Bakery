import { useEffect, useState } from 'react';
import { getContent, saveContent } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import type { SiteContent } from '../../lib/types';
import Loading from '../../components/Loading';
import ErrorNote from '../../components/ErrorNote';

const KEYS = [
  { key: 'about', title: 'About Us' },
  { key: 'mission', title: 'Our Mission' },
];

export default function ManageAbout() {
  const { data, error, loading } = useAsync(getContent);
  const [draft, setDraft] = useState<Record<string, SiteContent>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    const d: Record<string, SiteContent> = {};
    for (const k of KEYS) d[k.key] = data.find((c) => c.key === k.key) ?? { key: k.key, title: k.title, body: '' };
    setDraft(d);
  }, [data]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    try {
      await Promise.all(Object.values(draft).map(saveContent));
      setMsg('Saved.');
    } catch (x) {
      setErr((x as Error).message);
    }
  }

  if (loading) return <Loading />;
  return (
    <form className="form" onSubmit={save}>
      <h1>About Us / Our Mission</h1>
      <ErrorNote error={error || err} />
      {KEYS.map(({ key }) =>
        draft[key] ? (
          <section key={key} className="card form">
            <label>
              Heading
              <input value={draft[key].title} onChange={(e) => setDraft({ ...draft, [key]: { ...draft[key], title: e.target.value } })} />
            </label>
            <label>
              Text <small className="muted">(blank line = new paragraph)</small>
              <textarea rows={8} value={draft[key].body} onChange={(e) => setDraft({ ...draft, [key]: { ...draft[key], body: e.target.value } })} />
            </label>
          </section>
        ) : null,
      )}
      <div className="row">
        <button className="btn">Save</button>
        {msg && <span className="ok-text">{msg}</span>}
      </div>
    </form>
  );
}

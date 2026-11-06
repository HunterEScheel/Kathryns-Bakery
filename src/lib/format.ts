export const money = (n: number | null | undefined) =>
  n == null ? '' : n.toLocaleString(undefined, { style: 'currency', currency: 'USD' });

export const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

export const isoDate = (d: Date) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};

export const addDays = (d: Date, days: number) => {
  const r = new Date(d);
  r.setDate(r.getDate() + days);
  return r;
};

export const prettyDate = (iso: string | null | undefined) =>
  iso ? new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString() : '';

/** "Mar 4", "Mar 4 – 6" or "Mar 30 – Apr 2"; adds the year when it isn't this year. */
export const dateRange = (start: string, end?: string | null) => {
  const s = new Date(start + 'T00:00:00');
  const e = end && end !== start ? new Date(end + 'T00:00:00') : null;
  const thisYear = new Date().getFullYear();
  const showYear = s.getFullYear() !== thisYear || (e != null && e.getFullYear() !== thisYear);
  const fmt = (x: Date) =>
    x.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(showYear ? { year: 'numeric' } : {}) });
  if (!e) return fmt(s);
  if (!showYear && s.getMonth() === e.getMonth()) return `${fmt(s)} – ${e.getDate()}`;
  return `${fmt(s)} – ${fmt(e)}`;
};

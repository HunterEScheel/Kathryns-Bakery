import { useState } from 'react';
import { deleteTimelineEvent, listTimeline, saveTimelineEvent } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { dateRange, isoDate } from '../../lib/format';
import type { TimelineEvent } from '../../lib/types';
import Loading from '../../components/Loading';
import ErrorNote from '../../components/ErrorNote';

/** Blank optional fields are stored as null. */
const text = (v: string | null | undefined) => v?.trim() || null;

export default function ManageTimeline() {
  const events = useAsync(() => listTimeline(false));
  const [editing, setEditing] = useState<Partial<TimelineEvent> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const today = isoDate(new Date());

  const status = (t: TimelineEvent) => (t.last_day < today ? 'past' : t.starts_on > today ? 'upcoming' : 'live');

  // Upcoming and current events first (soonest on top), then past events (most recent on top).
  const rows = [...(events.data ?? [])].sort((a, b) => {
    const pa = a.last_day < today;
    const pb = b.last_day < today;
    if (pa !== pb) return pa ? 1 : -1;
    return pa ? b.starts_on.localeCompare(a.starts_on) : a.starts_on.localeCompare(b.starts_on);
  });

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setErr(null);
    try {
      await saveTimelineEvent({
        ...editing,
        title: editing.title?.trim(),
        ends_on: editing.ends_on || null,
        time_label: text(editing.time_label),
        location: text(editing.location),
        description: text(editing.description),
      });
      setEditing(null);
      await events.reload();
    } catch (x) {
      setErr((x as Error).message);
    }
  }

  const set = (patch: Partial<TimelineEvent>) => setEditing((cur) => (cur ? { ...cur, ...patch } : cur));

  return (
    <>
      <div className="row between wrap">
        <h1>Timeline</h1>
        <button className="btn" onClick={() => setEditing({ title: '', starts_on: today })}>
          + Add event
        </button>
      </div>
      <p className="muted">
        Events show on the public Timeline until their last day is over, then drop off automatically. Past events stay
        here (faded) so you can copy or delete them.
      </p>
      {events.loading && <Loading />}
      <ErrorNote error={events.error || err} />
      {events.data && events.data.length === 0 && <p className="muted">No events yet.</p>}
      {rows.length > 0 && (
        <table className="table">
          <thead>
            <tr>
              <th>Event</th>
              <th>Dates</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((t) => (
              <tr key={t.id} className={status(t) === 'past' ? 'faded' : ''}>
                <td>
                  <strong>{t.title}</strong>
                  {(t.time_label || t.location) && (
                    <div className="muted small">{[t.time_label, t.location].filter(Boolean).join(' · ')}</div>
                  )}
                </td>
                <td className="nowrap">{dateRange(t.starts_on, t.ends_on)}</td>
                <td>
                  <span className={`badge ${status(t)}`}>{status(t)}</span>
                </td>
                <td className="actions">
                  <button className="btn small ghost" onClick={() => setEditing(t)}>
                    Edit
                  </button>
                  <button
                    className="btn small ghost"
                    onClick={() => {
                      // eslint-disable-next-line @typescript-eslint/no-unused-vars
                      const { id: _id, last_day: _l, ...copy } = t;
                      setEditing({ ...copy, starts_on: today, ends_on: null });
                    }}
                  >
                    Copy
                  </button>
                  <button
                    className="btn small ghost"
                    onClick={async () => {
                      if (!confirm(`Delete "${t.title}"?`)) return;
                      await deleteTimelineEvent(t.id).catch((x) => setErr(x.message));
                      await events.reload();
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {editing && (
        <dialog open className="modal">
          <form className="form card grid-form" onSubmit={save}>
            <h2 className="span-2">{editing.id ? 'Edit event' : 'New event'}</h2>
            <label className="span-2">
              Title
              <input required value={editing.title ?? ''} onChange={(e) => set({ title: e.target.value })} />
            </label>
            <label>
              Date (or first day)
              <input
                type="date"
                required
                value={editing.starts_on ?? ''}
                onChange={(e) => {
                  const starts_on = e.target.value;
                  set({ starts_on, ends_on: editing.ends_on && editing.ends_on < starts_on ? null : editing.ends_on });
                }}
              />
            </label>
            <label>
              Last day <small className="muted">(optional, for multi-day events)</small>
              <input
                type="date"
                min={editing.starts_on}
                value={editing.ends_on ?? ''}
                onChange={(e) => set({ ends_on: e.target.value || null })}
              />
            </label>
            <label>
              Time <small className="muted">(optional, e.g. 8am – 1pm)</small>
              <input value={editing.time_label ?? ''} onChange={(e) => set({ time_label: e.target.value })} />
            </label>
            <label>
              Location <small className="muted">(optional)</small>
              <input value={editing.location ?? ''} onChange={(e) => set({ location: e.target.value })} />
            </label>
            <label className="span-2">
              Details <small className="muted">(optional; blank line = new paragraph)</small>
              <textarea
                rows={5}
                value={editing.description ?? ''}
                onChange={(e) => set({ description: e.target.value })}
              />
            </label>
            <div className="row end span-2">
              <button type="button" className="btn ghost" onClick={() => setEditing(null)}>
                Cancel
              </button>
              <button className="btn">Save</button>
            </div>
          </form>
        </dialog>
      )}
    </>
  );
}

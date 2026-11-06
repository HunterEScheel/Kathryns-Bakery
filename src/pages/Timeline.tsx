import { listTimeline } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { dateRange, isoDate } from '../lib/format';
import Loading from '../components/Loading';
import ErrorNote from '../components/ErrorNote';

export default function Timeline() {
  // Past events are filtered out by date, so they disappear on their own once they're over.
  const { data, error, loading } = useAsync(() => listTimeline(true));
  const today = isoDate(new Date());

  return (
    <>
      <h1>Timeline</h1>
      <p className="lede">Markets, pop-ups, holiday pie orders and other things coming up at the bakery.</p>
      {loading && <Loading />}
      <ErrorNote error={error} />
      {data && data.length === 0 && <p className="muted">Nothing on the calendar right now. Check back soon!</p>}
      {data && data.length > 0 && (
        <ol className="timeline">
          {data.map((t) => {
            const now = t.starts_on <= today;
            return (
              <li key={t.id} className={now ? 'now' : ''}>
                <div className="timeline-date">
                  {dateRange(t.starts_on, t.ends_on)}
                  {now && <span className="badge live">{t.ends_on && t.ends_on !== t.starts_on ? 'On now' : 'Today'}</span>}
                </div>
                <article className="card timeline-card prose">
                  <h2>{t.title}</h2>
                  {(t.time_label || t.location) && (
                    <p className="muted small">{[t.time_label, t.location].filter(Boolean).join(' · ')}</p>
                  )}
                  {t.description?.split(/\n{2,}/).map((p, i) => <p key={i}>{p}</p>)}
                </article>
              </li>
            );
          })}
        </ol>
      )}
    </>
  );
}

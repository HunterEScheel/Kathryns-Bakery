import { getContent } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import Loading from '../components/Loading';
import ErrorNote from '../components/ErrorNote';
import type { SiteContent } from '../lib/types';

// Shown only when bakery_site_content has no rows yet.
const FALLBACK: SiteContent[] = [
  { key: 'about', title: 'About Us', body: 'Small-batch baking, made from scratch every morning.' },
  { key: 'mission', title: 'Our Mission', body: 'Simple, honest ingredients — labeled clearly so you always know what you are eating.' },
];

// "about" and "mission" lead; any other sections follow alphabetically by key.
const LEAD = ['about', 'mission'];
const rank = (k: string) => (LEAD.includes(k) ? LEAD.indexOf(k) : LEAD.length);
const bySection = (a: SiteContent, b: SiteContent) => rank(a.key) - rank(b.key) || a.key.localeCompare(b.key);

export default function About() {
  const { data, error, loading } = useAsync(getContent);
  const sections = data?.length ? [...data].sort(bySection) : FALLBACK;

  return (
    <>
      <section className="hero">
        <h1>Kathryn&rsquo;s Bakery</h1>
        <p className="lede">From-scratch breads, cookies and pastries — baked fresh in small batches.</p>
      </section>
      {loading ? (
        <Loading />
      ) : (
        <div className="grid two">
          {sections.map((c) => (
            <section key={c.key} className="card prose">
              {c.title && <h2>{c.title}</h2>}
              {c.body
                .split(/\n{2,}/)
                .map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
            </section>
          ))}
        </div>
      )}
      <ErrorNote error={error} />
    </>
  );
}

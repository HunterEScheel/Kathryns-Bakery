import { getContent } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import Loading from '../components/Loading';
import ErrorNote from '../components/ErrorNote';
import type { SiteContent } from '../lib/types';

// Shown only when bakery_site_content has no rows yet.
const FALLBACK: SiteContent[] = [
  { key: 'about', title: 'About Us', body: 'Small-batch, 100% gluten-free desserts, made from scratch.' },
  { key: 'mission', title: 'Our Mission', body: 'Simple, honest ingredients — labeled clearly so you always know what you are eating.' },
];

export default function About() {
  const { data, error, loading } = useAsync(getContent);
  const sections = data?.length ? data : FALLBACK;

  return (
    <>
      <section className="hero">
        <h1>Kathryn&rsquo;s Bakery</h1>
        <p className="lede">A dedicated gluten-free dessert bakery: cookies, brownies, bars, pies, banana bread and cheesecakes, baked from scratch in small batches.</p>
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

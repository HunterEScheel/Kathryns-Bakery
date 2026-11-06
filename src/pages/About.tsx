import { getContent } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import Loading from '../components/Loading';
import ErrorNote from '../components/ErrorNote';

const FALLBACK = {
  about: { title: 'About Us', body: 'Small-batch baking, made from scratch every morning.' },
  mission: { title: 'Our Mission', body: 'Simple, honest ingredients — labeled clearly so you always know what you are eating.' },
};

export default function About() {
  const { data, error, loading } = useAsync(getContent);
  const get = (k: 'about' | 'mission') => data?.find((c) => c.key === k) ?? FALLBACK[k];

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
          {(['about', 'mission'] as const).map((k) => (
            <section key={k} className="card prose">
              <h2>{get(k).title}</h2>
              {get(k)
                .body.split(/\n{2,}/)
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

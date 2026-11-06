import { Link } from 'react-router-dom';
import { listFeatured } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { money, prettyDate } from '../lib/format';
import Loading from '../components/Loading';
import ErrorNote from '../components/ErrorNote';

export default function Featured() {
  const { data, error, loading } = useAsync(() => listFeatured(true));
  return (
    <>
      <h1>Featured This Week</h1>
      {loading && <Loading />}
      <ErrorNote error={error} />
      {data && data.length === 0 && <p className="muted">Nothing featured right now — check back soon!</p>}
      <div className="grid cards">
        {data?.map((f) => (
          <article key={f.id} className="card product-card featured">
            {f.product?.image_url && <img src={f.product.image_url} alt={f.product.name} loading="lazy" />}
            <div className="card-body">
              <h2>{f.product?.name}</h2>
              {f.blurb && <p>{f.blurb}</p>}
              {!f.blurb && f.product?.description && <p>{f.product.description}</p>}
              <div className="row between">
                <strong className="price">{money(f.product?.price)}</strong>
                <small className="muted">through {prettyDate(f.ends_on)}</small>
              </div>
              <Link to={`/products#${f.product_id}`} className="small-link">
                Ingredients &amp; details →
              </Link>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}

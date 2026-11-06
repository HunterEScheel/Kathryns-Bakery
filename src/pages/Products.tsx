import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listProducts } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { money } from '../lib/format';
import { ingredientStatement } from '../lib/zpl';
import Loading from '../components/Loading';
import ErrorNote from '../components/ErrorNote';
import AllergenBadges from '../components/AllergenBadges';

export default function Products() {
  const { data, error, loading } = useAsync(listProducts);
  const [q, setQ] = useState('');
  const active = useMemo(
    () => (data ?? []).filter((p) => p.is_active && p.name.toLowerCase().includes(q.toLowerCase())),
    [data, q],
  );

  useEffect(() => {
    if (data && location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'smooth' });
  }, [data]);

  return (
    <>
      <div className="row between wrap">
        <h1>Products</h1>
        <input className="search" placeholder="Search products…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {loading && <Loading />}
      <ErrorNote error={error} />
      <div className="grid cards">
        {active.map((p) => {
          const st = p.recipe?.recipe_ingredients ? ingredientStatement(p.recipe.recipe_ingredients) : null;
          return (
            <article key={p.id} id={p.id} className="card product-card">
              {p.image_url && <img src={p.image_url} alt={p.name} loading="lazy" />}
              <div className="card-body">
                <div className="row between">
                  <h2>{p.name}</h2>
                  <strong className="price">{money(p.price)}</strong>
                </div>
                {p.description && <p>{p.description}</p>}
                {st && st.ingredients && (
                  <p className="ingredients">
                    <strong>Ingredients:</strong> {st.ingredients}
                  </p>
                )}
                {st && <AllergenBadges allergens={st.allergens} />}
                {p.recipe?.is_public && (
                  <Link className="small-link" to={`/recipes/${p.recipe.slug}`}>
                    See the recipe →
                  </Link>
                )}
              </div>
            </article>
          );
        })}
      </div>
      {data && active.length === 0 && <p className="muted">No products found.</p>}
    </>
  );
}

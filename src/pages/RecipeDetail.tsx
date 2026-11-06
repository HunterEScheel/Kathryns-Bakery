import { Link, useParams } from 'react-router-dom';
import { getRecipeBySlug } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { ingredientStatement } from '../lib/zpl';
import Loading from '../components/Loading';
import ErrorNote from '../components/ErrorNote';
import AllergenBadges from '../components/AllergenBadges';

export default function RecipeDetail() {
  const { slug = '' } = useParams();
  const { data: r, error, loading } = useAsync(() => getRecipeBySlug(slug), [slug]);

  if (loading) return <Loading />;
  if (error) return <ErrorNote error={error} />;
  if (!r)
    return (
      <p>
        Recipe not found. <Link to="/recipes">Back to recipes</Link>
      </p>
    );

  const st = ingredientStatement(r.recipe_ingredients ?? []);
  return (
    <article className="recipe">
      <Link to="/recipes" className="small-link">
        ← All recipes
      </Link>
      <h1>{r.name}</h1>
      {r.image_url && <img className="hero-img" src={r.image_url} alt={r.name} />}
      {r.description && <p className="lede">{r.description}</p>}
      {r.yield_qty != null && (
        <p className="muted">
          Yield: {r.yield_qty} {r.yield_unit}
        </p>
      )}
      <AllergenBadges allergens={st.allergens} />
      <div className="grid recipe-grid">
        <section className="card">
          <h2>Ingredients</h2>
          <ul className="ingredient-list">
            {r.recipe_ingredients?.map((ri) => (
              <li key={ri.id}>
                <span className="qty">
                  {ri.quantity ?? ''} {ri.unit ?? ''}
                </span>{' '}
                {ri.ingredient?.name}
                {ri.note && <span className="muted"> — {ri.note}</span>}
              </li>
            ))}
          </ul>
        </section>
        {r.instructions && (
          <section className="card prose">
            <h2>Method</h2>
            <ol>
              {r.instructions
                .split(/\n+/)
                .map((s) => s.replace(/^\s*\d+[.)]\s*/, '').trim())
                .filter(Boolean)
                .map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
            </ol>
          </section>
        )}
      </div>
    </article>
  );
}

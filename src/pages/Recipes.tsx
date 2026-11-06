import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { listIngredients, listRecipes } from '../lib/api';
import { useAsync } from '../lib/useAsync';
import { ingredientStatement } from '../lib/zpl';
import Loading from '../components/Loading';
import ErrorNote from '../components/ErrorNote';
import AllergenBadges from '../components/AllergenBadges';

export default function Recipes() {
  const recipes = useAsync(listRecipes);
  const ingredients = useAsync(listIngredients);
  const [tab, setTab] = useState<'recipes' | 'ingredients'>('recipes');
  const [q, setQ] = useState('');
  const [avoid, setAvoid] = useState<string[]>([]);

  const allAllergens = useMemo(
    () => [...new Set((ingredients.data ?? []).flatMap((i) => i.allergens))].sort(),
    [ingredients.data],
  );

  const shownRecipes = useMemo(
    () =>
      (recipes.data ?? []).filter((r) => {
        const st = ingredientStatement(r.recipe_ingredients ?? []);
        const text = (r.name + ' ' + st.ingredients).toLowerCase();
        return text.includes(q.toLowerCase()) && !st.allergens.some((a) => avoid.includes(a));
      }),
    [recipes.data, q, avoid],
  );

  const shownIngredients = useMemo(
    () => (ingredients.data ?? []).filter((i) => i.name.toLowerCase().includes(q.toLowerCase())),
    [ingredients.data, q],
  );

  return (
    <>
      <h1>Recipes &amp; Ingredients</h1>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'recipes'} onClick={() => setTab('recipes')}>
          Recipes
        </button>
        <button role="tab" aria-selected={tab === 'ingredients'} onClick={() => setTab('ingredients')}>
          Ingredient glossary
        </button>
      </div>
      <div className="row wrap filters">
        <input className="search" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
        {tab === 'recipes' && allAllergens.length > 0 && (
          <div className="row wrap">
            <span className="muted">Free from:</span>
            {allAllergens.map((a) => (
              <label key={a} className="chip">
                <input
                  type="checkbox"
                  checked={avoid.includes(a)}
                  onChange={(e) => setAvoid((v) => (e.target.checked ? [...v, a] : v.filter((x) => x !== a)))}
                />
                {a}
              </label>
            ))}
          </div>
        )}
      </div>

      {(recipes.loading || ingredients.loading) && <Loading />}
      <ErrorNote error={recipes.error || ingredients.error} />

      {tab === 'recipes' ? (
        <div className="grid cards">
          {shownRecipes.map((r) => {
            const st = ingredientStatement(r.recipe_ingredients ?? []);
            return (
              <Link key={r.id} to={`/recipes/${r.slug}`} className="card product-card linkcard">
                {r.image_url && <img src={r.image_url} alt={r.name} loading="lazy" />}
                <div className="card-body">
                  <h2>{r.name}</h2>
                  {r.description && <p>{r.description}</p>}
                  <p className="ingredients">{st.ingredients}</p>
                  <AllergenBadges allergens={st.allergens} />
                </div>
              </Link>
            );
          })}
          {recipes.data && shownRecipes.length === 0 && <p className="muted">No recipes match.</p>}
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Ingredient</th>
              <th>Allergens</th>
              <th>Notes</th>
            </tr>
          </thead>
          <tbody>
            {shownIngredients.map((i) => (
              <tr key={i.id}>
                <td>{i.name}</td>
                <td>
                  <AllergenBadges allergens={i.allergens} />
                </td>
                <td className="muted">{i.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

import { useState } from 'react';
import { deleteRecipe, listIngredients, listRecipes, saveIngredient, saveRecipe } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { slugify } from '../../lib/format';
import { ingredientStatement } from '../../lib/zpl';
import type { Recipe, RecipeIngredient } from '../../lib/types';
import Loading from '../../components/Loading';
import ErrorNote from '../../components/ErrorNote';
import ImageInput from '../../components/ImageInput';
import AllergenBadges from '../../components/AllergenBadges';

const UNITS = ['g', 'kg', 'oz', 'lb', 'ml', 'l', 'tsp', 'tbsp', 'cup', 'ea'];

export default function ManageRecipes() {
  const recipes = useAsync(listRecipes);
  const ingredients = useAsync(listIngredients);
  const [editing, setEditing] = useState<Partial<Recipe> | null>(null);
  const [lines, setLines] = useState<RecipeIngredient[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const open = (r: Partial<Recipe>) => {
    setEditing(r);
    setLines(r.recipe_ingredients?.map((x) => ({ ...x })) ?? []);
    setErr(null);
  };

  const ingById = new Map((ingredients.data ?? []).map((i) => [i.id, i]));
  const preview = ingredientStatement(lines.map((l) => ({ ...l, ingredient: ingById.get(l.ingredient_id) })));

  async function addNewIngredient(idx: number) {
    const name = prompt('New ingredient name');
    if (!name) return;
    try {
      const ing = await saveIngredient({ name, allergens: [], default_unit: 'g' });
      await ingredients.reload();
      setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, ingredient_id: ing.id, unit: ing.default_unit } : l)));
    } catch (x) {
      setErr((x as Error).message);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setErr(null);
    try {
      const valid = lines.filter((l) => l.ingredient_id);
      await saveRecipe({ ...editing, slug: editing.slug || slugify(editing.name ?? '') }, valid);
      setEditing(null);
      await recipes.reload();
    } catch (x) {
      setErr((x as Error).message);
    } finally {
      setSaving(false);
    }
  }

  const move = (i: number, d: -1 | 1) =>
    setLines((ls) => {
      const j = i + d;
      if (j < 0 || j >= ls.length) return ls;
      const c = [...ls];
      [c[i], c[j]] = [c[j], c[i]];
      return c;
    });

  if (editing)
    return (
      <form className="form card" onSubmit={save}>
        <h1>{editing.id ? `Edit ${editing.name}` : 'New recipe'}</h1>
        <div className="grid-form">
          <label>
            Name
            <input required value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
          </label>
          <label>
            URL slug
            <input
              value={editing.slug ?? ''}
              placeholder={slugify(editing.name ?? '')}
              onChange={(e) => setEditing({ ...editing, slug: slugify(e.target.value) })}
            />
          </label>
          <label>
            Yield
            <input
              type="number"
              step="any"
              value={editing.yield_qty ?? ''}
              onChange={(e) => setEditing({ ...editing, yield_qty: e.target.value ? Number(e.target.value) : null })}
            />
          </label>
          <label>
            Yield unit
            <input
              placeholder="cookies, loaves…"
              value={editing.yield_unit ?? ''}
              onChange={(e) => setEditing({ ...editing, yield_unit: e.target.value || null })}
            />
          </label>
          <label className="span-2">
            Description
            <textarea rows={2} value={editing.description ?? ''} onChange={(e) => setEditing({ ...editing, description: e.target.value || null })} />
          </label>
          <label className="check span-2">
            <input
              type="checkbox"
              checked={editing.is_public ?? true}
              onChange={(e) => setEditing({ ...editing, is_public: e.target.checked })}
            />{' '}
            Show this recipe publicly on the Recipes page
          </label>
          <div className="span-2">
            <span className="label-text">Photo</span>
            <ImageInput folder="recipes" value={editing.image_url ?? null} onChange={(url) => setEditing({ ...editing, image_url: url })} />
          </div>
        </div>

        <h2>Ingredients</h2>
        <p className="muted small">
          Enter heaviest first. When every line is in g/kg/oz/lb, labels sort by weight automatically.
        </p>
        <div className="table-wrap">
          <table className="table lines">
            <thead>
              <tr>
                <th />
                <th>Ingredient</th>
                <th>Qty</th>
                <th>Unit</th>
                <th>Note</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lines.map((l, i) => (
                <tr key={i}>
                  <td className="nowrap">
                    <button type="button" className="btn tiny ghost" onClick={() => move(i, -1)} aria-label="Move up">
                      ↑
                    </button>
                    <button type="button" className="btn tiny ghost" onClick={() => move(i, 1)} aria-label="Move down">
                      ↓
                    </button>
                  </td>
                  <td>
                    <select
                      required
                      value={l.ingredient_id}
                      onChange={(e) => {
                        if (e.target.value === '__new') return void addNewIngredient(i);
                        const ing = ingById.get(e.target.value);
                        setLines((ls) =>
                          ls.map((x, j) => (j === i ? { ...x, ingredient_id: e.target.value, unit: x.unit || ing?.default_unit || null } : x)),
                        );
                      }}
                    >
                      <option value="">Choose…</option>
                      {ingredients.data?.map((x) => (
                        <option key={x.id} value={x.id}>
                          {x.name}
                        </option>
                      ))}
                      <option value="__new">+ New ingredient…</option>
                    </select>
                  </td>
                  <td>
                    <input
                      type="number"
                      step="any"
                      className="qty-input"
                      value={l.quantity ?? ''}
                      onChange={(e) =>
                        setLines((ls) => ls.map((x, j) => (j === i ? { ...x, quantity: e.target.value ? Number(e.target.value) : null } : x)))
                      }
                    />
                  </td>
                  <td>
                    <input
                      list="units"
                      className="unit-input"
                      value={l.unit ?? ''}
                      onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, unit: e.target.value || null } : x)))}
                    />
                  </td>
                  <td>
                    <input
                      value={l.note ?? ''}
                      placeholder="softened, sifted…"
                      onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, note: e.target.value || null } : x)))}
                    />
                  </td>
                  <td>
                    <button type="button" className="btn tiny ghost" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <datalist id="units">
          {UNITS.map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>
        <button
          type="button"
          className="btn small ghost"
          onClick={() => setLines((ls) => [...ls, { ingredient_id: '', quantity: null, unit: null, note: null, position: ls.length }])}
        >
          + Add ingredient
        </button>

        <div className="card subtle">
          <strong>Label preview:</strong> {preview.ingredients || <em className="muted">none</em>}
          <AllergenBadges allergens={preview.allergens} />
        </div>

        <label>
          Method (one step per line)
          <textarea rows={8} value={editing.instructions ?? ''} onChange={(e) => setEditing({ ...editing, instructions: e.target.value || null })} />
        </label>

        <ErrorNote error={err} />
        <div className="row between">
          {editing.id ? (
            <button
              type="button"
              className="btn danger"
              onClick={async () => {
                if (!confirm(`Delete ${editing.name}?`)) return;
                try {
                  await deleteRecipe(editing.id!);
                  setEditing(null);
                  await recipes.reload();
                } catch (x) {
                  setErr((x as Error).message);
                }
              }}
            >
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="row">
            <button type="button" className="btn ghost" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button className="btn" disabled={saving}>
              {saving ? 'Saving…' : 'Save recipe'}
            </button>
          </div>
        </div>
      </form>
    );

  return (
    <>
      <div className="row between wrap">
        <h1>Recipes</h1>
        <button className="btn" onClick={() => open({ is_public: true })}>
          + New recipe
        </button>
      </div>
      {recipes.loading && <Loading />}
      <ErrorNote error={recipes.error} />
      <table className="table">
        <thead>
          <tr>
            <th>Recipe</th>
            <th>Ingredients</th>
            <th>Public</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {recipes.data?.map((r) => (
            <tr key={r.id}>
              <td>
                <strong>{r.name}</strong>
              </td>
              <td className="muted small">{ingredientStatement(r.recipe_ingredients ?? []).ingredients}</td>
              <td>{r.is_public ? 'Yes' : 'No'}</td>
              <td>
                <button className="btn small ghost" onClick={() => open(r)}>
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}

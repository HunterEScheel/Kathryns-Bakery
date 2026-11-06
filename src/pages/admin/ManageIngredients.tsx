import { useState } from 'react';
import { deleteIngredient, listIngredients, saveIngredient } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { ALLERGENS, type Ingredient } from '../../lib/types';
import Loading from '../../components/Loading';
import ErrorNote from '../../components/ErrorNote';
import AllergenBadges from '../../components/AllergenBadges';

export default function ManageIngredients() {
  const { data, error, loading, reload } = useAsync(listIngredients);
  const [editing, setEditing] = useState<Partial<Ingredient> | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [q, setQ] = useState('');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setErr(null);
    try {
      await saveIngredient(editing);
      setEditing(null);
      await reload();
    } catch (x) {
      setErr((x as Error).message);
    }
  }

  const toggle = (a: string) =>
    setEditing((ed) => {
      const cur = ed?.allergens ?? [];
      return { ...ed, allergens: cur.includes(a) ? cur.filter((x) => x !== a) : [...cur, a] };
    });

  return (
    <>
      <div className="row between wrap">
        <h1>Ingredients</h1>
        <button className="btn" onClick={() => setEditing({ name: '', allergens: [], default_unit: 'g' })}>
          + New ingredient
        </button>
      </div>
      <input className="search" placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} />
      {loading && <Loading />}
      <ErrorNote error={error || err} />
      <table className="table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Allergens</th>
            <th>Default unit</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {data
            ?.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()))
            .map((i) => (
              <tr key={i.id}>
                <td>{i.name}</td>
                <td>
                  <AllergenBadges allergens={i.allergens} />
                </td>
                <td>{i.default_unit}</td>
                <td>
                  <button className="btn small ghost" onClick={() => setEditing(i)}>
                    Edit
                  </button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>

      {editing && (
        <dialog open className="modal">
          <form className="form card" onSubmit={save}>
            <h2>{editing.id ? 'Edit ingredient' : 'New ingredient'}</h2>
            <label>
              Name (as it should appear on labels)
              <input required value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
            </label>
            <fieldset>
              <legend>Major allergens</legend>
              <div className="row wrap">
                {ALLERGENS.map((a) => (
                  <label key={a} className="chip">
                    <input type="checkbox" checked={editing.allergens?.includes(a) ?? false} onChange={() => toggle(a)} /> {a}
                  </label>
                ))}
              </div>
            </fieldset>
            <label>
              Default unit
              <input value={editing.default_unit ?? ''} onChange={(e) => setEditing({ ...editing, default_unit: e.target.value })} />
            </label>
            <label>
              Notes
              <textarea rows={2} value={editing.notes ?? ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value || null })} />
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
                      await deleteIngredient(editing.id!);
                      setEditing(null);
                      await reload();
                    } catch (x) {
                      setErr('Could not delete — it is probably used in a recipe. ' + (x as Error).message);
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
                <button className="btn">Save</button>
              </div>
            </div>
          </form>
        </dialog>
      )}
    </>
  );
}

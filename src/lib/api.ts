import { supabase, unwrap } from './supabase';
import { isoDate } from './format';
import type {
  FeaturedItem,
  Ingredient,
  InventoryItem,
  InventoryTransaction,
  Product,
  Recipe,
  RecipeIngredient,
  SiteContent,
  TxReason,
} from './types';

const RECIPE_FULL = '*, recipe_ingredients:bakery_recipe_ingredients(*, ingredient:bakery_ingredients(*))';

const sortRI = (r: Recipe) => {
  r.recipe_ingredients?.sort((a, b) => a.position - b.position);
  return r;
};

// ---------- site content ----------
export const getContent = async () =>
  unwrap(await supabase.from('bakery_site_content').select('*')) as SiteContent[];

export const saveContent = async (c: SiteContent) =>
  unwrap(await supabase.from('bakery_site_content').upsert(c).select().single()) as SiteContent;

// ---------- ingredients ----------
export const listIngredients = async () =>
  unwrap(await supabase.from('bakery_ingredients').select('*').order('name')) as Ingredient[];

export const saveIngredient = async (i: Partial<Ingredient>) =>
  unwrap(await supabase.from('bakery_ingredients').upsert(i).select().single()) as Ingredient;

export const deleteIngredient = async (id: string) =>
  unwrap(await supabase.from('bakery_ingredients').delete().eq('id', id));

// ---------- recipes ----------
export const listRecipes = async () =>
  (unwrap(await supabase.from('bakery_recipes').select(RECIPE_FULL).order('name')) as Recipe[]).map(sortRI);

export const getRecipeBySlug = async (slug: string) => {
  const r = unwrap(await supabase.from('bakery_recipes').select(RECIPE_FULL).eq('slug', slug).maybeSingle()) as Recipe | null;
  return r ? sortRI(r) : null;
};

export const getRecipe = async (id: string) =>
  sortRI(unwrap(await supabase.from('bakery_recipes').select(RECIPE_FULL).eq('id', id).single()) as Recipe);

export async function saveRecipe(recipe: Partial<Recipe>, lines: RecipeIngredient[]): Promise<Recipe> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { recipe_ingredients: _ri, ...row } = recipe;
  const saved = unwrap(await supabase.from('bakery_recipes').upsert(row).select().single()) as Recipe;
  unwrap(await supabase.from('bakery_recipe_ingredients').delete().eq('recipe_id', saved.id));
  if (lines.length) {
    unwrap(
      await supabase.from('bakery_recipe_ingredients').insert(
        lines.map((l, i) => ({
          recipe_id: saved.id,
          ingredient_id: l.ingredient_id,
          quantity: l.quantity,
          unit: l.unit,
          note: l.note,
          position: i,
        })),
      ),
    );
  }
  return saved;
}

export const deleteRecipe = async (id: string) => unwrap(await supabase.from('bakery_recipes').delete().eq('id', id));

// ---------- products ----------
const PRODUCT_FULL = `*, recipe:bakery_recipes(${RECIPE_FULL})`;

export const listProducts = async () => {
  const rows = unwrap(await supabase.from('bakery_products').select(PRODUCT_FULL).order('name')) as Product[];
  rows.forEach((p) => p.recipe && sortRI(p.recipe));
  return rows;
};

export const saveProduct = async (p: Partial<Product>) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { recipe: _r, ...row } = p;
  return unwrap(await supabase.from('bakery_products').upsert(row).select().single()) as Product;
};

export const deleteProduct = async (id: string) => unwrap(await supabase.from('bakery_products').delete().eq('id', id));

// ---------- featured ----------
export const listFeatured = async (activeOnly: boolean) => {
  let q = supabase.from('bakery_featured_items').select('*, product:bakery_products(*)').order('position').order('starts_on');
  if (activeOnly) {
    const today = isoDate(new Date());
    q = q.lte('starts_on', today).gte('ends_on', today);
  }
  return (unwrap(await q) as FeaturedItem[]).filter((f) => !activeOnly || f.product?.is_active);
};

export const saveFeatured = async (f: Partial<FeaturedItem>) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { product: _p, ...row } = f;
  return unwrap(await supabase.from('bakery_featured_items').upsert(row).select().single()) as FeaturedItem;
};

export const deleteFeatured = async (id: string) =>
  unwrap(await supabase.from('bakery_featured_items').delete().eq('id', id));

// ---------- inventory ----------
export const listInventory = async () =>
  unwrap(await supabase.from('bakery_inventory_items').select('*').order('category').order('name')) as InventoryItem[];

export const saveInventoryItem = async (i: Partial<InventoryItem>) => {
  // quantity is driven by the transaction log after creation
  const row = { ...i };
  if (row.id) delete row.quantity;
  return unwrap(await supabase.from('bakery_inventory_items').upsert(row).select().single()) as InventoryItem;
};

export const deleteInventoryItem = async (id: string) =>
  unwrap(await supabase.from('bakery_inventory_items').delete().eq('id', id));

export const addInventoryTx = async (item_id: string, change: number, reason: TxReason, note?: string) =>
  unwrap(await supabase.from('bakery_inventory_transactions').insert({ item_id, change, reason, note: note || null }));

export const listInventoryTx = async (item_id: string) =>
  unwrap(
    await supabase
      .from('bakery_inventory_transactions')
      .select('*')
      .eq('item_id', item_id)
      .order('created_at', { ascending: false })
      .limit(50),
  ) as InventoryTransaction[];

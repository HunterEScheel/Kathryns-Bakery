export type Role = 'member' | 'admin';

export interface Profile {
  id: string;
  email: string | null;
  role: Role;
}

export interface SiteContent {
  key: string;
  title: string;
  body: string;
}

export interface Ingredient {
  id: string;
  name: string;
  allergens: string[];
  default_unit: string;
  notes: string | null;
}

export interface RecipeIngredient {
  id?: string;
  recipe_id?: string;
  ingredient_id: string;
  quantity: number | null;
  unit: string | null;
  note: string | null;
  position: number;
  ingredient?: Ingredient;
}

export interface Recipe {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  instructions: string | null;
  yield_qty: number | null;
  yield_unit: string | null;
  image_url: string | null;
  is_public: boolean;
  recipe_ingredients?: RecipeIngredient[];
}

export interface Product {
  id: string;
  name: string;
  sku: string | null;
  description: string | null;
  price: number | null;
  image_url: string | null;
  recipe_id: string | null;
  shelf_life_days: number | null;
  net_weight: string | null;
  is_active: boolean;
  recipe?: Recipe | null;
}

export interface FeaturedItem {
  id: string;
  product_id: string;
  starts_on: string;
  ends_on: string;
  blurb: string | null;
  position: number;
  product?: Product;
}

export type InventoryCategory = 'ingredient' | 'packaging' | 'finished_good' | 'supply';
export type TxReason = 'receive' | 'use' | 'waste' | 'adjust' | 'sale' | 'count';

export interface InventoryItem {
  id: string;
  name: string;
  sku: string | null;
  category: InventoryCategory;
  ingredient_id: string | null;
  product_id: string | null;
  quantity: number;
  unit: string;
  reorder_level: number;
  location: string | null;
  supplier: string | null;
  expires_on: string | null;
  notes: string | null;
  updated_at: string;
}

export interface InventoryTransaction {
  id: string;
  item_id: string;
  change: number;
  reason: TxReason;
  note: string | null;
  created_at: string;
}

export const ALLERGENS = ['milk', 'egg', 'wheat', 'soy', 'peanut', 'tree nut', 'fish', 'shellfish', 'sesame'] as const;

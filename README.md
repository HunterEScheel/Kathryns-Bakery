# Kathryn's Bakery

React + Vite PWA for Kathryn's Bakery: a public site, plus admin tools for inventory, recipes and ingredients, and printing labels on a **Zebra GK420d**. Data lives in **Supabase** and the site deploys to **Vercel**.

## Pages

**Public (anyone can see these)**

| Route | Page |
| --- | --- |
| `/` | About Us / Our Mission |
| `/featured` | Featured This Week |
| `/recipes`, `/recipes/:slug` | Recipes & Ingredients (search, "free from" allergen filter, ingredient glossary) |
| `/products` | Products, with ingredients and allergens |

**Admin (`/admin`, needs `profiles.role = 'admin'`)**

| Route | What it does |
| --- | --- |
| `/admin` | Inventory: items, stock, receive/use/waste/count log, low-stock and expiring flags, bin labels |
| `/admin/labels` | Product labels: ingredient statement + allergens built from the recipe, baked/best-by dates, price, barcode; batch printing |
| `/admin/products` | Products (price, SKU, linked recipe, shelf life, photo) |
| `/admin/recipes` | Recipes with their ingredient lines |
| `/admin/ingredients` | Ingredient master list with allergens |
| `/admin/featured` | Pick products for "Featured This Week", with date ranges |
| `/admin/about` | Edit the About Us / Our Mission text |

## 1. Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. In the **SQL Editor**, run `supabase/migrations/0001_init.sql`. You can also run `supabase/seed.sql` for starter content.
3. Under **Authentication → Users**, add a user for each staff member, or let them use magic-link sign-in.
4. Make yourself an admin:
   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```
5. Under **Authentication → URL Configuration**, set the Site URL to your Vercel domain and add `http://localhost:5173/**` to the redirect URLs.

Row-level security works like this: the public can read active products, public recipes, ingredients, featured items and site content. Only admins can write, and only admins can see inventory. Photos go into a public `images` storage bucket that the migration creates.

## 2. Local development

```bash
cp .env.example .env.local   # fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm install
npm run dev
```

## 3. Deploy to Vercel

1. Import the GitHub repo in Vercel. It detects the framework as Vite, and `vercel.json` handles SPA rewrites and service-worker caching.
2. Add the environment variables `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` for Production and Preview.
3. Deploy, then add the Vercel URL to the Supabase auth URL settings (step 1.5).

## 4. Zebra GK420d label printing

The browser talks to the printer through **Zebra Browser Print**, a free Zebra app that runs on the computer the printer is connected to.

1. Install the GK420d driver and [Zebra Browser Print](https://www.zebra.com/us/en/support-downloads/software/printer-software/browser-print.html), and connect the printer by USB or network.
2. Start Browser Print and allow your site's domain when it asks.
3. The live site uses HTTPS, so visit `https://127.0.0.1:9101/ssl_support` once on that computer and accept the certificate.
4. Open **Admin → Labels** and click **Find**. Set the label size to match your stock (presets include 2.25×1.25, 3×2 and 4×6), and pick **Direct thermal** or **Thermal transfer** to match your media. Run **Calibrate media** once whenever you change label stock.

If no printer is found, labels download as `.zpl` files instead. You can send those with Zebra Setup Utilities, or on macOS/Linux with `lp -d <printer> -o raw label.zpl`. The label preview is rendered by the free [Labelary](https://labelary.com) API and needs an internet connection.

**Ingredient statements:** when every recipe line is in g/kg/oz/lb, the ingredients are sorted by weight, heaviest first. Otherwise they keep the order they were entered in the recipe. Allergens come from each ingredient's allergen tags. Review label wording against your local labeling rules.

## PWA

The app can be installed on a phone, tablet or desktop. The app shell is precached. Supabase reads use network-first caching, so pages you have already loaded still open offline. Edits need a connection. When a new version is deployed, the app shows a "Reload" prompt.

## Project layout

```
src/
  lib/         supabase client, api (queries), auth, zpl (label builder), zebra (Browser Print), printer context
  components/  layout, printer panel, label preview, shared bits
  pages/       public pages
  pages/admin/ admin pages (lazy-loaded)
supabase/      SQL migration + seed
```

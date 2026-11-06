-- Optional starter content for a dedicated gluten-free dessert bakery. Safe to re-run.
-- (No wheat, barley or rye ingredients: nothing here should carry a wheat allergen tag.)

insert into public.bakery_site_content (key, title, body) values
  ('about', 'About Us', 'Kathryn''s Bakery started in a home kitchen with a well-loved stand mixer and a stack of family recipe cards. Today we bake small batches of gluten-free cookies, brownies, bars, pies, banana bread and cheesecakes, all from scratch, in a dedicated gluten-free kitchen.'),
  ('mission', 'Our Mission', 'Bake gluten-free desserts we are proud to share: made from scratch, labeled honestly, and priced fairly — so every customer knows exactly what they are eating.')
on conflict (key) do nothing;

insert into public.bakery_ingredients (name, allergens, default_unit) values
  ('Gluten-free flour blend', '{}', 'g'),
  ('Almond flour', '{tree nut}', 'g'),
  ('Cream cheese', '{milk}', 'g'),
  ('Ripe bananas', '{}', 'g'),
  ('Unsalted butter', '{milk}', 'g'),
  ('Granulated sugar', '{}', 'g'),
  ('Brown sugar', '{}', 'g'),
  ('Eggs', '{egg}', 'ea'),
  ('Vanilla extract', '{}', 'ml'),
  ('Baking soda', '{}', 'g'),
  ('Sea salt', '{}', 'g'),
  ('Semi-sweet chocolate chips', '{milk,soy}', 'g')
on conflict (name) do nothing;

-- Admins are shared with the other apps in this Supabase project.
-- If you are not already in public.site_admins, add yourself (replace the email):
-- insert into public.site_admins (user_id)
-- select id from auth.users where email = 'you@example.com'
-- on conflict (user_id) do nothing;

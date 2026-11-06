-- Optional starter content. Safe to re-run.

insert into public.site_content (key, title, body) values
  ('about', 'About Us', 'Kathryn''s Bakery started in a home kitchen with a well-loved stand mixer and a stack of family recipe cards. Today we bake small batches every morning using simple, honest ingredients.'),
  ('mission', 'Our Mission', 'Bake food we are proud to share: made from scratch, labeled honestly, and priced fairly — so every customer knows exactly what they are eating.')
on conflict (key) do nothing;

insert into public.ingredients (name, allergens, default_unit) values
  ('All-purpose flour', '{wheat}', 'g'),
  ('Unsalted butter', '{milk}', 'g'),
  ('Granulated sugar', '{}', 'g'),
  ('Brown sugar', '{}', 'g'),
  ('Eggs', '{egg}', 'ea'),
  ('Vanilla extract', '{}', 'ml'),
  ('Baking soda', '{}', 'g'),
  ('Sea salt', '{}', 'g'),
  ('Semi-sweet chocolate chips', '{milk,soy}', 'g')
on conflict (name) do nothing;

-- After seeding, promote yourself to admin (replace the email):
-- update public.profiles set role = 'admin' where email = 'you@example.com';

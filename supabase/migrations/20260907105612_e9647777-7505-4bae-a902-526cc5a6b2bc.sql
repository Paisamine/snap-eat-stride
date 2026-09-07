-- ROLES
create type public.app_role as enum ('admin','editor','user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "own roles select" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "admins manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- CATEGORIES
create table public.blog_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.blog_categories to anon;
grant select, insert, update, delete on public.blog_categories to authenticated;
grant all on public.blog_categories to service_role;
alter table public.blog_categories enable row level security;
create policy "categories public read" on public.blog_categories for select to anon, authenticated using (true);
create policy "categories admin write" on public.blog_categories for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- TAGS
create table public.blog_tags (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  created_at timestamptz not null default now()
);
grant select on public.blog_tags to anon;
grant select, insert, update, delete on public.blog_tags to authenticated;
grant all on public.blog_tags to service_role;
alter table public.blog_tags enable row level security;
create policy "tags public read" on public.blog_tags for select to anon, authenticated using (true);
create policy "tags admin write" on public.blog_tags for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- POSTS
create table public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content text not null default '',
  featured_image text,
  featured_image_alt text,
  category_id uuid references public.blog_categories(id) on delete set null,
  author_id uuid references auth.users(id) on delete set null,
  author_name text not null default 'Calorie Count Editorial',
  focus_keyword text,
  secondary_keywords text[] not null default '{}',
  meta_title text,
  meta_description text,
  canonical_url text,
  status text not null default 'draft',
  content_type text,
  is_ai_generated boolean not null default false,
  is_featured boolean not null default false,
  reading_time integer not null default 3,
  language text not null default 'en',
  faq jsonb not null default '[]'::jsonb,
  sources jsonb not null default '[]'::jsonb,
  internal_links jsonb not null default '[]'::jsonb,
  quality_report jsonb,
  needs_review boolean not null default false,
  view_count integer not null default 0,
  version integer not null default 1,
  scheduled_for timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index blog_posts_status_pub_idx on public.blog_posts (status, published_at desc);
create index blog_posts_category_idx on public.blog_posts (category_id);
grant select on public.blog_posts to anon;
grant select, insert, update, delete on public.blog_posts to authenticated;
grant all on public.blog_posts to service_role;
alter table public.blog_posts enable row level security;
create policy "posts public read published" on public.blog_posts for select to anon, authenticated
  using (status = 'published' and published_at is not null and published_at <= now());
create policy "posts admin read all" on public.blog_posts for select to authenticated
  using (public.has_role(auth.uid(),'admin'));
create policy "posts admin write" on public.blog_posts for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger blog_posts_set_updated_at before update on public.blog_posts
  for each row execute function public.set_updated_at();

-- POST TAGS
create table public.blog_post_tags (
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  tag_id uuid not null references public.blog_tags(id) on delete cascade,
  primary key (post_id, tag_id)
);
grant select on public.blog_post_tags to anon;
grant select, insert, update, delete on public.blog_post_tags to authenticated;
grant all on public.blog_post_tags to service_role;
alter table public.blog_post_tags enable row level security;
create policy "post tags public read" on public.blog_post_tags for select to anon, authenticated using (true);
create policy "post tags admin write" on public.blog_post_tags for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- REVISIONS
create table public.blog_revisions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  title text,
  content text,
  excerpt text,
  version integer not null default 1,
  note text,
  created_at timestamptz not null default now()
);
grant select, insert, delete on public.blog_revisions to authenticated;
grant all on public.blog_revisions to service_role;
alter table public.blog_revisions enable row level security;
create policy "revisions admin" on public.blog_revisions for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- GENERATION JOBS
create table public.blog_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  keyword text,
  category_id uuid references public.blog_categories(id) on delete set null,
  content_type text,
  language text not null default 'en',
  target_word_count integer not null default 1200,
  status text not null default 'queued',
  stage text,
  post_id uuid references public.blog_posts(id) on delete set null,
  generated_content jsonb,
  error_message text,
  triggered_by text not null default 'manual',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
grant select, insert, update, delete on public.blog_generation_jobs to authenticated;
grant all on public.blog_generation_jobs to service_role;
alter table public.blog_generation_jobs enable row level security;
create policy "jobs admin" on public.blog_generation_jobs for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- TOPIC IDEAS (dedupe)
create table public.blog_topic_ideas (
  id uuid primary key default gen_random_uuid(),
  topic text not null,
  slug_hint text not null unique,
  keyword text,
  category_slug text,
  content_type text,
  status text not null default 'idea',
  used_at timestamptz,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.blog_topic_ideas to authenticated;
grant all on public.blog_topic_ideas to service_role;
alter table public.blog_topic_ideas enable row level security;
create policy "topic ideas admin" on public.blog_topic_ideas for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- AUTOMATION SETTINGS (single row)
create table public.blog_automation_settings (
  id uuid primary key default gen_random_uuid(),
  singleton boolean not null default true unique,
  enabled boolean not null default false,
  posts_per_week integer not null default 3,
  auto_publish boolean not null default false,
  default_language text not null default 'en',
  target_word_count integer not null default 1200,
  preferred_categories text[] not null default '{}',
  content_calendar jsonb not null default '[]'::jsonb,
  paused_reason text,
  paused_at timestamptz,
  lock_until timestamptz,
  last_run_at timestamptz,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
grant select on public.blog_automation_settings to authenticated;
grant all on public.blog_automation_settings to service_role;
alter table public.blog_automation_settings enable row level security;
create policy "automation admin" on public.blog_automation_settings for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create trigger blog_automation_set_updated_at before update on public.blog_automation_settings
  for each row execute function public.set_updated_at();
insert into public.blog_automation_settings (singleton) values (true);

-- VIEW EVENTS (no PII)
create table public.blog_post_views (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.blog_posts(id) on delete cascade,
  referrer_host text,
  created_at timestamptz not null default now()
);
grant insert on public.blog_post_views to anon, authenticated;
grant select on public.blog_post_views to authenticated;
grant all on public.blog_post_views to service_role;
alter table public.blog_post_views enable row level security;
create policy "views insert anyone" on public.blog_post_views for insert to anon, authenticated with check (true);
create policy "views admin read" on public.blog_post_views for select to authenticated
  using (public.has_role(auth.uid(),'admin'));

create or replace function public.increment_blog_view(_slug text, _referrer_host text default null)
returns void language plpgsql security definer set search_path = public as $$
declare _id uuid;
begin
  select id into _id from public.blog_posts where slug = _slug and status = 'published';
  if _id is null then return; end if;
  update public.blog_posts set view_count = view_count + 1 where id = _id;
  insert into public.blog_post_views (post_id, referrer_host) values (_id, _referrer_host);
end $$;
grant execute on function public.increment_blog_view(text, text) to anon, authenticated;

-- SEED CATEGORIES
insert into public.blog_categories (name, slug, description, sort_order) values
  ('Nutrition','nutrition','Macros, micronutrients and everyday nutrition science.',1),
  ('Calorie Guides','calorie-guides','How many calories are in the foods you eat every day.',2),
  ('Weight Management','weight-management','Sustainable weight loss, maintenance and healthy gain.',3),
  ('Healthy Eating','healthy-eating','Practical habits for balanced, enjoyable eating.',4),
  ('Fitness & Walking','fitness-walking','Steps, movement and everyday activity.',5),
  ('Hydration','hydration','Water, electrolytes and daily fluid needs.',6),
  ('Meal Planning','meal-planning','Planning, prepping and shopping smarter.',7),
  ('Indian Food & Nutrition','indian-food-nutrition','Calories and nutrition for Indian staples.',8),
  ('Food Calorie Guides','food-calorie-guides','Per-food calorie references and portion sizes.',9);

insert into public.blog_tags (name, slug) values
  ('Protein','protein'),('Calories','calories'),('Weight Loss','weight-loss'),
  ('Indian Food','indian-food'),('Hydration','hydration'),('Walking','walking'),
  ('BMR','bmr'),('TDEE','tdee'),('Meal Prep','meal-prep'),('Fiber','fiber');

insert into public.blog_topic_ideas (topic, slug_hint, keyword, category_slug, content_type) values
  ('Calories in Roti: sizes, flours and portions','calories-in-roti','calories in roti','indian-food-nutrition','Food Calorie Guide'),
  ('Calories in Dal: varieties and servings','calories-in-dal','calories in dal','indian-food-nutrition','Food Calorie Guide'),
  ('Calories in Paneer and how to fit it in your day','calories-in-paneer','calories in paneer','indian-food-nutrition','Food Calorie Guide'),
  ('Calories in Poha for breakfast','calories-in-poha','calories in poha','indian-food-nutrition','Food Calorie Guide'),
  ('Calories in Idli and Dosa compared','calories-in-idli-and-dosa','calories in idli','indian-food-nutrition','Comparison Article'),
  ('How much protein do you actually need each day?','how-much-protein-per-day','protein per day','nutrition','Nutrition Guide'),
  ('BMR vs TDEE explained simply','bmr-vs-tdee-explained','bmr vs tdee','weight-management','Educational Guide'),
  ('How many steps burn 500 calories?','steps-to-burn-500-calories','steps to burn calories','fitness-walking','Fitness Guide'),
  ('How much water should you drink daily?','how-much-water-per-day','daily water intake','hydration','Educational Guide'),
  ('Understanding a healthy calorie deficit','healthy-calorie-deficit','calorie deficit','weight-management','Weight Management');

-- SEED ARTICLES
insert into public.blog_posts (title, slug, excerpt, content, category_id, focus_keyword, secondary_keywords, meta_title, meta_description, status, content_type, reading_time, is_featured, faq, published_at, internal_links)
values
(
  'Calories in Roti: A Practical Portion Guide',
  'calories-in-roti-portion-guide',
  'A plain-flour or whole-wheat roti usually lands between 70 and 120 calories depending on size, flour and how much fat is used. Here is how to estimate yours.',
  E'## How many calories are in one roti?\n\nA medium whole-wheat roti (about 30 g of dough, roughly 6 inches across) contains approximately **70–90 calories**. Larger restaurant-style rotis, or ones brushed with ghee or butter, can reach **110–150 calories**.\n\nThese are approximate values. Actual calories vary with flour type, thickness, diameter and added fat.\n\n### Typical estimates\n\n| Roti type | Approx. weight | Approx. calories |\n| --- | --- | --- |\n| Small whole-wheat roti | 25 g | 60–75 |\n| Medium whole-wheat roti | 35 g | 80–95 |\n| Large / tandoori roti | 55 g | 130–160 |\n| Roti with 1 tsp ghee | 35 g + 5 g | 120–140 |\n\n## What changes the number\n\n- **Flour**: whole-wheat (atta) and multigrain rotis carry more fiber than refined maida versions, with similar calories.\n- **Size**: diameter and thickness matter more than anything else.\n- **Added fat**: one teaspoon of ghee or oil adds roughly 40–45 calories.\n\n## How roti fits a balanced plate\n\nTwo medium rotis with dal, a vegetable sabzi and curd make a balanced meal of roughly 450–550 calories with a good mix of carbohydrates, protein and fiber. If you are managing your weight, portion the rotis first and fill the rest of the plate with vegetables and protein.\n\n## Practical tips\n\n- Weigh your dough once to learn what your usual roti looks like.\n- Pair rotis with a protein source so the meal keeps you full longer.\n- Skip the extra ghee layer if you are tracking a calorie target closely.\n',
  (select id from public.blog_categories where slug='indian-food-nutrition'),
  'calories in roti',
  array['roti calories','whole wheat roti','indian food calories'],
  'Calories in Roti: Portion Guide & Nutrition Facts',
  'How many calories are in one roti? Approximate values by size, flour and added ghee, plus how to fit roti into a balanced meal.',
  'published','Food Calorie Guide',5,true,
  '[{"q":"How many calories are in 2 rotis?","a":"Roughly 160-190 calories for two medium whole-wheat rotis without added ghee."},{"q":"Is roti better than rice for weight loss?","a":"Both can fit. Roti has more fiber per serving, but portion size and what you eat alongside matter more than the choice itself."}]'::jsonb,
  now() - interval '3 days',
  '[{"label":"Food Scanner","to":"/analyze"},{"label":"Nutrition Planner","to":"/nutrition"}]'::jsonb
),
(
  'How Much Protein Do You Actually Need Each Day?',
  'how-much-protein-do-you-need-daily',
  'Most healthy adults do well on roughly 0.8 to 1.2 g of protein per kilogram of body weight per day, with more for active people. Here is how to work out a sensible target.',
  E'## Start with your body weight\n\nGeneral guidance for healthy adults is around **0.8 g of protein per kilogram of body weight per day** as a minimum, with **1.2–1.6 g/kg** commonly suggested for people who are very active or trying to preserve muscle while losing weight.\n\nFor a 65 kg adult that is roughly **52 g** at the low end and **80–105 g** for an active person.\n\n### Everyday protein sources\n\n| Food | Serving | Approx. protein |\n| --- | --- | --- |\n| Dal (cooked) | 1 cup | 8–9 g |\n| Paneer | 100 g | 18–20 g |\n| Curd / yogurt | 200 g | 6–8 g |\n| Eggs | 2 large | 12 g |\n| Chicken breast | 100 g | 26–30 g |\n| Chickpeas (cooked) | 1 cup | 14 g |\n\n## Spread it across the day\n\nAiming for 20–30 g of protein at each main meal is easier to hit than saving it all for dinner, and it helps with fullness.\n\n## If you eat vegetarian\n\nCombine pulses with grains across the day, and lean on dairy, soy, nuts and seeds. Variety, not any single food, covers the amino acids you need.\n\n## Notes and caveats\n\nProtein needs change with age, pregnancy, illness and kidney conditions. These are general educational estimates, not personal prescriptions.\n',
  (select id from public.blog_categories where slug='nutrition'),
  'protein per day',
  array['daily protein needs','how much protein','protein sources'],
  'How Much Protein Per Day? A Simple Daily Target',
  'Work out a sensible daily protein target based on body weight and activity, with everyday food sources and per-meal guidance.',
  'published','Nutrition Guide',6,false,
  '[{"q":"Can I eat too much protein?","a":"Very high intakes are unnecessary for most people and may crowd out other foods. Anyone with kidney disease should follow medical advice."},{"q":"Do I need protein powder?","a":"No. Powders are convenient, not required, if your meals already reach your target."}]'::jsonb,
  now() - interval '6 days',
  '[{"label":"Personalized Diet Planner","to":"/nutrition"},{"label":"Nutrition Dashboard","to":"/home"}]'::jsonb
),
(
  'How Many Steps Burn 500 Calories?',
  'how-many-steps-burn-500-calories',
  'Most adults burn roughly 30 to 50 calories per 1,000 steps, so 500 calories usually means somewhere between 10,000 and 16,000 steps. Your weight and pace decide where you land.',
  E'## The short answer\n\nWalking burns roughly **30–50 calories per 1,000 steps** for most adults. To burn about 500 calories you would typically need **10,000–16,000 steps**, depending on your body weight, walking speed and terrain.\n\n### Rough estimates by body weight\n\n| Body weight | Approx. calories per 1,000 steps | Steps for ~500 kcal |\n| --- | --- | --- |\n| 55 kg | 28–33 | 15,000–18,000 |\n| 70 kg | 35–42 | 12,000–14,000 |\n| 85 kg | 43–50 | 10,000–11,500 |\n\nThese are estimates. Trackers and calculators, including ours, use similar assumptions.\n\n## Making steps easier to reach\n\n- Break walking into three 15-minute blocks rather than one long session.\n- Add a brisk section: pace raises energy use more than extra minutes at a stroll.\n- Walk after meals; it is an easy habit to anchor.\n\n## Steps are not the whole picture\n\nWalking supports energy balance, mood and cardiovascular health, but food intake usually has the larger effect on weight. Use steps as a habit to build, not a debt to repay.\n',
  (select id from public.blog_categories where slug='fitness-walking'),
  'steps to burn 500 calories',
  array['walking calories','steps per calorie','walking for weight loss'],
  'How Many Steps Burn 500 Calories? Walking Estimates',
  'How many steps it takes to burn 500 calories, with estimates by body weight and practical ways to add steps to your day.',
  'published','Fitness Guide',4,false,
  '[{"q":"Is 10,000 steps a day necessary?","a":"It is a popular round number, not a medical threshold. Benefits appear well below it, and more steps generally help."},{"q":"Does walking uphill burn more?","a":"Yes, inclines and faster pace both raise energy use for the same step count."}]'::jsonb,
  now() - interval '1 day',
  '[{"label":"Food Scanner","to":"/analyze"},{"label":"Progress Dashboard","to":"/home"}]'::jsonb
);

insert into public.blog_post_tags (post_id, tag_id)
select p.id, t.id from public.blog_posts p, public.blog_tags t
where (p.slug='calories-in-roti-portion-guide' and t.slug in ('calories','indian-food'))
   or (p.slug='how-much-protein-do-you-need-daily' and t.slug in ('protein','fiber'))
   or (p.slug='how-many-steps-burn-500-calories' and t.slug in ('walking','calories'));
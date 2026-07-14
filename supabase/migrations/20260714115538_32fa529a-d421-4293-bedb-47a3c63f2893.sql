
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS language text,
  ADD COLUMN IF NOT EXISTS allergies text,
  ADD COLUMN IF NOT EXISTS medical_conditions text,
  ADD COLUMN IF NOT EXISTS budget text,
  ADD COLUMN IF NOT EXISTS cooking_skill text,
  ADD COLUMN IF NOT EXISTS cooking_time_min integer,
  ADD COLUMN IF NOT EXISTS foods_liked text,
  ADD COLUMN IF NOT EXISTS foods_disliked text,
  ADD COLUMN IF NOT EXISTS water_goal_l numeric;

CREATE TABLE IF NOT EXISTS public.meal_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text,
  country text,
  goal text,
  daily_calories integer,
  protein_g integer,
  carbs_g integer,
  fat_g integer,
  water_l numeric,
  days jsonb NOT NULL,
  grocery jsonb,
  tips jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.meal_plans TO authenticated;
GRANT ALL ON public.meal_plans TO service_role;
ALTER TABLE public.meal_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own meal plans" ON public.meal_plans FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER meal_plans_set_updated_at BEFORE UPDATE ON public.meal_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.favorite_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  meal_type text,
  name text NOT NULL,
  description text,
  calories integer,
  protein_g integer,
  carbs_g integer,
  fat_g integer,
  ingredients jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.favorite_meals TO authenticated;
GRANT ALL ON public.favorite_meals TO service_role;
ALTER TABLE public.favorite_meals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own favorites" ON public.favorite_meals FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

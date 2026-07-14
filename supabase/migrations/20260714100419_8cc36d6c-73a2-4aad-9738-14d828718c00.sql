
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS target_weight_kg numeric,
  ADD COLUMN IF NOT EXISTS waist_cm numeric,
  ADD COLUMN IF NOT EXISTS neck_cm numeric,
  ADD COLUMN IF NOT EXISTS hip_cm numeric,
  ADD COLUMN IF NOT EXISTS activity_level text,
  ADD COLUMN IF NOT EXISTS sleep_hours numeric,
  ADD COLUMN IF NOT EXISTS water_intake_l numeric,
  ADD COLUMN IF NOT EXISTS occupation text,
  ADD COLUMN IF NOT EXISTS smoking text,
  ADD COLUMN IF NOT EXISTS alcohol text,
  ADD COLUMN IF NOT EXISTS exercise_frequency text,
  ADD COLUMN IF NOT EXISTS diet_preference text,
  ADD COLUMN IF NOT EXISTS health_goal text,
  ADD COLUMN IF NOT EXISTS metabolism_profile text,
  ADD COLUMN IF NOT EXISTS metabolism_answers jsonb,
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_checkin_at timestamptz;

CREATE TABLE IF NOT EXISTS public.weight_checkins (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  weight_kg numeric,
  waist_cm numeric,
  hip_cm numeric,
  neck_cm numeric,
  photo_url text,
  mood text,
  energy_level integer,
  exercise_frequency text,
  water_intake_l numeric,
  sleep_hours numeric,
  notes text
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.weight_checkins TO authenticated;
GRANT ALL ON public.weight_checkins TO service_role;

ALTER TABLE public.weight_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own checkins select" ON public.weight_checkins FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own checkins insert" ON public.weight_checkins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own checkins update" ON public.weight_checkins FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own checkins delete" ON public.weight_checkins FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS weight_checkins_user_created_idx ON public.weight_checkins (user_id, created_at DESC);

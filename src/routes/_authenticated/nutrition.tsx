import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import {
  Salad, Loader2, RefreshCw, Sparkles, ShoppingBasket, Heart, Droplets,
  Flame, Beef, Wheat, Cookie, Info, ChefHat, Utensils, ChevronRight, Plus, Wand2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { generateMealPlan, refreshMeal, estimateCheatMeal } from "@/lib/nutrition.functions";
import { useServerFn } from "@tanstack/react-start";

export const Route = createFileRoute("/_authenticated/nutrition")({
  ssr: false,
  component: NutritionPage,
});

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function NutritionPage() {
  return (
    <div className="space-y-5 animate-in-up">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Salad className="h-6 w-6 text-primary" /> Nutrition
        </h1>
        <p className="text-sm text-muted-foreground">Your AI-personalized meal plan</p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 rounded-3xl" />}>
        <NutritionContent />
      </Suspense>
    </div>
  );
}

function NutritionContent() {
  const qc = useQueryClient();
  const genFn = useServerFn(generateMealPlan);
  const refreshFn = useServerFn(refreshMeal);
  const [generating, setGenerating] = useState(false);
  const [refreshing, setRefreshing] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState(0);

  const { data } = useSuspenseQuery({
    queryKey: ["active-meal-plan"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user!.id;
      const [{ data: plan }, { data: profile }, { data: favs }] = await Promise.all([
        supabase.from("meal_plans").select("*").eq("user_id", uid).eq("is_active", true)
          .order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("favorite_meals").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
      ]);
      return { plan, profile, favs: favs ?? [] };
    },
  });

  async function generate() {
    setGenerating(true);
    try {
      await genFn({ data: {} });
      toast.success("Fresh meal plan ready!");
      await qc.invalidateQueries({ queryKey: ["active-meal-plan"] });
    } catch (e: any) { toast.error(e?.message ?? "Failed to generate plan"); }
    setGenerating(false);
  }

  async function doRefresh(dayIndex: number, mealIndex?: number) {
    if (!data.plan) return;
    const key = `${dayIndex}-${mealIndex ?? "all"}`;
    setRefreshing(key);
    try {
      await refreshFn({ data: { planId: data.plan.id, dayIndex, mealIndex } });
      toast.success(mealIndex == null ? "Day refreshed" : "Meal replaced");
      await qc.invalidateQueries({ queryKey: ["active-meal-plan"] });
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    setRefreshing(null);
  }

  async function saveFavorite(meal: any) {
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("favorite_meals").insert({
      user_id: u.user!.id,
      meal_type: meal.slot,
      name: meal.name,
      description: meal.description,
      calories: Math.round(meal.calories),
      protein_g: Math.round(meal.protein_g),
      carbs_g: Math.round(meal.carbs_g),
      fat_g: Math.round(meal.fat_g),
      ingredients: meal.ingredients,
    });
    if (error) return toast.error(error.message);
    toast.success("Saved to favorites");
    qc.invalidateQueries({ queryKey: ["active-meal-plan"] });
  }

  if (!data.plan) {
    const profileReady = !!(data.profile?.country && data.profile?.health_goal);
    return (
      <Card className="rounded-3xl p-8 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
          <ChefHat className="h-7 w-7" />
        </div>
        <h2 className="mt-4 text-lg font-bold">No meal plan yet</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Generate a 7-day AI plan tailored to your country, goals, and preferences.
        </p>
        {!profileReady && (
          <p className="mt-3 rounded-xl bg-amber-500/10 p-3 text-xs text-amber-700 dark:text-amber-400">
            Add your <strong>country</strong> and <strong>health goal</strong> in{" "}
            <Link to="/profile" className="underline">Profile</Link> for a better plan.
          </p>
        )}
        <Button onClick={generate} disabled={generating} className="mt-5 rounded-full bg-gradient-primary">
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Wand2 className="mr-2 h-4 w-4" /> Generate my plan</>}
        </Button>
      </Card>
    );
  }

  const plan = data.plan;
  const days = plan.days as any[];
  const day = days[activeDay];
  const totalCal = day?.meals?.reduce((s: number, m: any) => s + Number(m.calories || 0), 0) ?? 0;
  const totalP = day?.meals?.reduce((s: number, m: any) => s + Number(m.protein_g || 0), 0) ?? 0;
  const totalC = day?.meals?.reduce((s: number, m: any) => s + Number(m.carbs_g || 0), 0) ?? 0;
  const totalF = day?.meals?.reduce((s: number, m: any) => s + Number(m.fat_g || 0), 0) ?? 0;

  return (
    <div className="space-y-5">
      <Card className="rounded-3xl bg-gradient-primary p-5 text-primary-foreground shadow-soft">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-wider opacity-80">{plan.country} · {plan.goal}</p>
            <h2 className="mt-0.5 truncate text-xl font-bold">{plan.title}</h2>
            <p className="mt-1 text-sm opacity-90">{plan.daily_calories} kcal/day · {plan.water_l}L water</p>
          </div>
          <Button
            onClick={generate} disabled={generating} variant="secondary"
            className="rounded-full bg-white/20 text-primary-foreground hover:bg-white/30"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <><RefreshCw className="mr-1.5 h-3.5 w-3.5" /> New plan</>}
          </Button>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <MacroChip label="Protein" value={`${plan.protein_g}g`} />
          <MacroChip label="Carbs" value={`${plan.carbs_g}g`} />
          <MacroChip label="Fat" value={`${plan.fat_g}g`} />
        </div>
      </Card>

      <Tabs defaultValue="plan">
        <TabsList className="grid w-full grid-cols-4 rounded-full">
          <TabsTrigger value="plan" className="rounded-full text-xs">Plan</TabsTrigger>
          <TabsTrigger value="grocery" className="rounded-full text-xs">Grocery</TabsTrigger>
          <TabsTrigger value="favs" className="rounded-full text-xs">Favorites</TabsTrigger>
          <TabsTrigger value="coach" className="rounded-full text-xs">Coach</TabsTrigger>
        </TabsList>

        <TabsContent value="plan" className="mt-4 space-y-4">
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
            {DAYS.map((d, i) => (
              <button
                key={d}
                onClick={() => setActiveDay(i)}
                className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition ${
                  i === activeDay ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"
                }`}
              >
                {d.slice(0, 3)}
              </button>
            ))}
          </div>

          <Card className="rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{day?.day}</p>
                <p className="text-lg font-bold">{Math.round(totalCal)} kcal</p>
              </div>
              <Button
                size="sm" variant="ghost" className="rounded-full"
                onClick={() => doRefresh(activeDay)}
                disabled={refreshing === `${activeDay}-all`}
              >
                {refreshing === `${activeDay}-all`
                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  : <><RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh day</>}
              </Button>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3 text-center text-xs">
              <MacroRing label="Protein" icon={Beef} value={Math.round(totalP)} goal={plan.protein_g ?? 0} color="text-red-500" />
              <MacroRing label="Carbs" icon={Wheat} value={Math.round(totalC)} goal={plan.carbs_g ?? 0} color="text-amber-500" />
              <MacroRing label="Fat" icon={Cookie} value={Math.round(totalF)} goal={plan.fat_g ?? 0} color="text-purple-500" />
            </div>
          </Card>

          <div className="space-y-3">
            {day?.meals?.map((meal: any, i: number) => (
              <Card key={i} className="rounded-2xl p-4 transition hover:shadow-soft">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                        {meal.slot}
                      </span>
                      <span className="text-xs text-muted-foreground">{Math.round(meal.calories)} kcal</span>
                    </div>
                    <p className="mt-1.5 font-semibold">{meal.name}</p>
                    {meal.description && <p className="mt-0.5 text-xs text-muted-foreground">{meal.description}</p>}
                    <div className="mt-2 flex gap-3 text-[11px] text-muted-foreground">
                      <span>P {Math.round(meal.protein_g)}g</span>
                      <span>C {Math.round(meal.carbs_g)}g</span>
                      <span>F {Math.round(meal.fat_g)}g</span>
                    </div>
                    {meal.ingredients?.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {meal.ingredients.slice(0, 5).map((ing: string, k: number) => (
                          <span key={k} className="rounded-md bg-muted px-1.5 py-0.5 text-[10px]">{ing}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => saveFavorite(meal)}
                      className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-red-500"
                      aria-label="Save favorite"
                    >
                      <Heart className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => doRefresh(activeDay, i)}
                      disabled={refreshing === `${activeDay}-${i}`}
                      className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-primary"
                      aria-label="Refresh meal"
                    >
                      {refreshing === `${activeDay}-${i}`
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <RefreshCw className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <Card className="rounded-2xl border-primary/30 bg-primary/5 p-4">
            <div className="flex gap-3">
              <Droplets className="h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-semibold">Hydration target: {plan.water_l}L / day</p>
                <p className="text-xs text-muted-foreground">Based on your weight and activity level.</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="grocery" className="mt-4 space-y-3">
          <div className="mb-1 flex items-center gap-2">
            <ShoppingBasket className="h-5 w-5 text-primary" />
            <p className="font-semibold">Weekly shopping list</p>
          </div>
          {((plan.grocery as any[]) ?? []).map((g, i) => (
            <Card key={i} className="rounded-2xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-primary">{g.category}</p>
              <ul className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
                {g.items.map((item: string, k: number) => (
                  <li key={k} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary/60" /> {item}
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="favs" className="mt-4 space-y-3">
          {data.favs.length === 0 ? (
            <Card className="rounded-2xl border-dashed p-8 text-center text-sm text-muted-foreground">
              <Heart className="mx-auto h-6 w-6 text-primary/60" />
              <p className="mt-2">Tap the heart on any meal to save it.</p>
            </Card>
          ) : data.favs.map((f: any) => (
            <Card key={f.id} className="rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">{f.meal_type}</p>
                  <p className="font-semibold truncate">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{f.calories} kcal · P{f.protein_g} C{f.carbs_g} F{f.fat_g}</p>
                </div>
                <button
                  onClick={async () => {
                    await supabase.from("favorite_meals").delete().eq("id", f.id);
                    qc.invalidateQueries({ queryKey: ["active-meal-plan"] });
                  }}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >Remove</button>
              </div>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="coach" className="mt-4 space-y-4">
          <Card className="rounded-2xl p-4">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="font-semibold">Daily tips</p>
            </div>
            <ul className="mt-2 space-y-2 text-sm">
              {((plan.tips as string[]) ?? []).map((t, i) => (
                <li key={i} className="flex gap-2">
                  <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
          </Card>

          <CheatMealCard />
        </TabsContent>
      </Tabs>

      <p className="rounded-xl bg-muted/50 p-3 text-center text-[11px] text-muted-foreground flex items-center justify-center gap-1.5">
        <Info className="h-3 w-3" />
        This meal plan is AI-generated for educational purposes and should not replace advice from a registered dietitian or healthcare professional.
      </p>
    </div>
  );
}

function MacroChip({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white/15 py-2">
      <div className="text-[10px] uppercase tracking-wider opacity-80">{label}</div>
      <div className="text-sm font-bold">{value}</div>
    </div>
  );
}

function MacroRing({ label, icon: Icon, value, goal, color }: { label: string; icon: any; value: number; goal: number; color: string }) {
  const pct = goal > 0 ? Math.min(100, (value / goal) * 100) : 0;
  return (
    <div>
      <Icon className={`mx-auto h-4 w-4 ${color}`} />
      <div className="mt-1 text-sm font-bold">{value}g</div>
      <Progress value={pct} className="mt-1 h-1" />
      <div className="mt-0.5 text-[10px] text-muted-foreground">{label} · {goal}g</div>
    </div>
  );
}

function CheatMealCard() {
  const cheatFn = useServerFn(estimateCheatMeal);
  const [desc, setDesc] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ calories: number; steps_needed: number; suggestions: string[] } | null>(null);
  const [open, setOpen] = useState(false);

  async function submit() {
    setBusy(true);
    try {
      const r = await cheatFn({ data: { description: desc } });
      setResult(r);
    } catch (e: any) { toast.error(e?.message ?? "Failed"); }
    setBusy(false);
  }

  return (
    <Card className="rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Utensils className="h-4 w-4 text-primary" />
          <p className="font-semibold">Cheat meal?</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="rounded-full"><Plus className="mr-1 h-3.5 w-3.5" /> Log</Button>
          </DialogTrigger>
          <DialogContent className="rounded-3xl">
            <DialogHeader><DialogTitle>Estimate a cheat meal</DialogTitle></DialogHeader>
            <Textarea
              value={desc} onChange={(e) => setDesc(e.target.value)}
              placeholder="e.g. Large pepperoni pizza slice with a soda"
              className="rounded-2xl"
            />
            <Button onClick={submit} disabled={busy || desc.length < 3} className="w-full rounded-full">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Estimate"}
            </Button>
            {result && (
              <div className="rounded-2xl bg-muted p-3 text-sm space-y-2">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1"><Flame className="h-4 w-4 text-orange-500" /> {Math.round(result.calories)} kcal</span>
                  <span className="flex items-center gap-1">🚶 {Math.round(result.steps_needed).toLocaleString()} steps</span>
                </div>
                {result.suggestions?.length > 0 && (
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {result.suggestions.map((s, i) => <li key={i}>• {s}</li>)}
                  </ul>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Get calorie & step estimates + healthier next-meal ideas.</p>
    </Card>
  );
}

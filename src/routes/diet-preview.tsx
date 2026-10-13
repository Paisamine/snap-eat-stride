import { createFileRoute, Link } from "@tanstack/react-router";
import { Lock, ShoppingBasket, Sparkles } from "lucide-react";
import { BlogShell } from "@/components/blog/blog-shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/diet-preview")({
  head: () => ({
    meta: [
      { title: "Sample Indian Diet Plan — Calorie Count" },
      { name: "description", content: "See a sample 1-day Indian diet plan with calories and macros. Sign in to create your own personalised 7-day plan." },
      { property: "og:title", content: "Sample Indian Diet Plan — Calorie Count" },
      { property: "og:description", content: "Preview a personalised Indian meal plan with calories and grocery list." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DietPreview,
});

const MEALS = [
  { time: "Breakfast", name: "Vegetable poha + 1 cup chai (less sugar)", kcal: 320, p: 8 },
  { time: "Mid-morning", name: "1 apple + 10 almonds", kcal: 160, p: 4 },
  { time: "Lunch", name: "2 roti, dal, mixed sabzi, salad, curd", kcal: 520, p: 22 },
  { time: "Evening", name: "Roasted chana (30 g) + green tea", kcal: 130, p: 7 },
  { time: "Dinner", name: "Paneer bhurji (100 g) + 1 roti + salad", kcal: 420, p: 24 },
];

function DietPreview() {
  const total = MEALS.reduce((s, m) => s + m.kcal, 0);
  return (
    <BlogShell>
      <div className="mx-auto max-w-2xl">
        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Sparkles className="h-3.5 w-3.5" /> Sample plan
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Your personal diet plan — preview</h1>
        <p className="mt-2 text-muted-foreground">Ek example din (~{total} kcal). Sign in karke apni body, goal aur pasand ke hisaab se 7-day plan banaiye.</p>

        <div className="mt-6 space-y-3">
          {MEALS.map((m) => (
            <div key={m.time} className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
              <div>
                <div className="text-xs font-medium text-primary">{m.time}</div>
                <div className="font-semibold">{m.name}</div>
              </div>
              <div className="text-right text-sm">
                <div className="font-bold">{m.kcal} kcal</div>
                <div className="text-muted-foreground">{m.p}g protein</div>
              </div>
            </div>
          ))}
        </div>

        <div className="relative mt-6 overflow-hidden rounded-2xl border border-border bg-card p-6">
          <div className="pointer-events-none select-none blur-sm">
            <div className="flex items-center gap-2 font-semibold"><ShoppingBasket className="h-4 w-4" /> Weekly grocery list</div>
            <p className="mt-2 text-sm text-muted-foreground">Atta 2 kg · Moong dal 500 g · Paneer 400 g · Poha 500 g · Curd 1 kg · Seasonal sabzi...</p>
          </div>
          <div className="absolute inset-0 grid place-items-center bg-background/60">
            <div className="text-center">
              <Lock className="mx-auto h-5 w-5 text-primary" />
              <p className="mt-1 text-sm font-medium">Full 7-day plan + grocery list</p>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-primary/20 bg-primary/10 p-6 text-center">
          <h2 className="text-lg font-bold">Apna plan banane ke liye sign in karein</h2>
          <p className="mt-1 text-sm text-muted-foreground">Google se 1 click — aapka data surakshit rahega.</p>
          <Link to="/auth"><Button className="mt-4 rounded-full">Generate my personal diet chart</Button></Link>
          <p className="mt-2 text-xs text-muted-foreground">1-click Google sign in · sirf 1 minute ka chhota form</p>
        </div>
      </div>
    </BlogShell>
  );
}

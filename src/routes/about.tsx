import { createFileRoute, Link } from "@tanstack/react-router";
import { Coffee, ScanLine, Salad, Scale, NotebookPen, BookOpen } from "lucide-react";
import { BlogShell } from "@/components/blog/blog-shell";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Calorie Count — AI Food Calorie & Step Coach" },
      { name: "description", content: "Calorie Count turns a photo of your meal into a calorie and macro estimate, converts it into walking targets, and helps you plan meals and track weekly progress." },
      { property: "og:title", content: "About Calorie Count" },
      { property: "og:description", content: "A calorie scanner, step coach and diet planner built for everyday kitchens." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: AboutPage,
});

const FEATURES = [
  { icon: ScanLine, title: "Photo calorie scan", body: "Photograph a plate and get back an estimated calorie, protein, carbohydrate and fat breakdown for each item on it." },
  { icon: Coffee, title: "Calories into steps", body: "Every estimate is converted into the walking you would need to burn it off, so the number means something you can act on." },
  { icon: Salad, title: "Personalised diet plans", body: "A weekly plan built around your country, budget, cooking time and the foods you actually like — with a shopping list." },
  { icon: Scale, title: "Weekly check-ins", body: "Log weight and measurements once a week and watch the trend line rather than a single bad morning." },
  { icon: NotebookPen, title: "Health profile & goals", body: "Age, height, activity and sleep go into your daily calorie target, so the goal moves as your life does." },
  { icon: BookOpen, title: "Health & nutrition library", body: "Guides on macros, hydration, walking and everyday foods — written for general understanding, not diagnosis." },
];

function AboutPage() {
  return (
    <BlogShell>
      <div className="mx-auto max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Coffee className="h-3.5 w-3.5" /> About
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">
          A calm way to <span className="text-primary">know your numbers</span>
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          Calorie Count started from a simple frustration: most calorie apps want you to weigh every ingredient and type in every
          gram. That works for a week and then it stops. We built the other way round — take a photo, get an honest estimate, and
          be told what it means in walking, in your daily target, and in the plan you are already following.
        </p>
      </div>

      <div className="mx-auto mt-10 grid max-w-3xl gap-4 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-2xl border border-border/70 bg-card p-5">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary">
              <f.icon className="h-4 w-4" />
            </div>
            <h2 className="mt-3 font-bold">{f.title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{f.body}</p>
          </div>
        ))}
      </div>

      <div className="mx-auto mt-10 max-w-3xl space-y-4 text-sm leading-relaxed text-foreground/90">
        <h2 className="text-lg font-bold">How we write about health</h2>
        <p>
          Every article follows three rules: no crash diets or starvation advice, no promises about how fast you will lose
          weight, and no claim that a food cures a disease. Nutrition figures are estimates that vary with portion, brand and
          cooking method, so we say so in the article rather than printing a precise number that implies precision we do not
          have. Where a claim needs a source, we name the source; where it does not, we call it general guidance.
        </p>
        <p className="rounded-2xl border border-border/70 bg-card p-4">
          This content is provided for general educational purposes and is not a substitute for professional medical or dietary
          advice. Talk to a doctor or a registered dietitian before changing your diet, especially with a medical condition, in
          pregnancy, or if you have a history of disordered eating.
        </p>
        <p className="text-muted-foreground">
          Ready to try it? <Link to="/auth" className="text-primary underline">Create a free account</Link>, or{" "}
          <Link to="/contact" className="text-primary underline">send us a message</Link> if something is missing.
        </p>
      </div>
    </BlogShell>
  );
}

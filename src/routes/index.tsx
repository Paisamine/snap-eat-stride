import logoAsset from "@/assets/logo.png.asset.json";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Camera, Sparkles, Footprints, ArrowRight, Moon, Sun, Utensils, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/components/theme-provider";
import { GuestBottomNav } from "@/components/guest-nav";

export const Route = createFileRoute("/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Calorie Count — Free Food Calorie Scanner, Diet Plans & Health Blog" },
      { name: "description", content: "Snap food photos for instant calories, explore Indian diet plans and read free nutrition articles — no login needed." },
      { property: "og:title", content: "Calorie Count — Know Your Calories" },
      { property: "og:description", content: "Free calorie scanner, diet plans and nutrition blog." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/home" });
  },
  component: Landing,
});

function Explore({ to, icon: Icon, title, text, cta }: { to: "/scan" | "/blog" | "/diet-preview"; icon: any; title: string; text: string; cta: string }) {
  return (
    <Link to={to} className="group rounded-3xl border border-border bg-card p-6 shadow-soft transition hover:-translate-y-0.5">
      <Icon className="h-7 w-7 text-primary" />
      <h3 className="mt-4 text-lg font-bold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{text}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">{cta} <ArrowRight className="h-4 w-4" /></span>
    </Link>
  );
}

function Landing() {
  const { theme, toggle } = useTheme();
  return (
    <div className="min-h-screen bg-gradient-hero">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <img src={logoAsset.url} alt="Calorie Count logo" className="h-9 w-9 rounded-full object-contain" />
          <span className="text-lg font-bold tracking-tight">Calorie<span className="text-primary"> Count</span></span>

        </div>
        <div className="flex items-center gap-2">
          <Link to="/blog" className="rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">Blog</Link>
          <Link to="/diet-preview" className="hidden rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground sm:block">Diet plan</Link>
          <button onClick={toggle} aria-label="Toggle theme" className="grid h-9 w-9 place-items-center rounded-full border border-border hover:bg-accent">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Link to="/auth" className="hidden sm:block"><Button variant="ghost">Sign in</Button></Link>
          <Link to="/auth"><Button className="rounded-full">Get started</Button></Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-20 pt-10 md:pt-20">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div className="animate-in-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="h-3.5 w-3.5" /> Premium AI wellness
            </div>
            <h1 className="mt-5 text-4xl font-extrabold leading-tight tracking-tight md:text-6xl">
              Know your calories.<br />
              <span className="bg-gradient-primary bg-clip-text text-transparent">Live healthier.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base text-muted-foreground md:text-lg">
              Calorie Count is your premium AI companion for tracking meals, planning nutrition, and reaching your weight goals — one mindful step at a time.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/scan">
                <Button size="lg" className="rounded-full shadow-glow">
                  Try free — no login <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="rounded-full">Sign in</Button>
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-6 text-sm text-muted-foreground">
              <Feature icon={Camera} label="Camera or upload" />
              <Feature icon={Footprints} label="Steps to burn" />
              <Feature icon={Sparkles} label="Healthy tips" />
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-8 rounded-3xl bg-gradient-primary opacity-20 blur-3xl" />
            <div className="relative rounded-3xl border border-border bg-card p-6 shadow-soft">
              <div className="rounded-2xl bg-gradient-hero p-6">
                <div className="text-xs font-medium text-muted-foreground">Grilled salmon bowl</div>
                <div className="mt-1 text-3xl font-bold">520 <span className="text-base font-medium text-muted-foreground">kcal</span></div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                  <Stat label="Protein" value="42g" />
                  <Stat label="Carbs" value="38g" />
                  <Stat label="Fat" value="22g" />
                </div>
                <div className="mt-4 rounded-xl bg-primary/10 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs text-primary">Walk to burn</div>
                      <div className="text-2xl font-bold text-primary">10,400 steps</div>
                    </div>
                    <Footprints className="h-8 w-8 text-primary" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section className="mt-20 grid gap-5 md:grid-cols-3">
          <Explore to="/scan" icon={Camera} title="Food scanner" text="Photo khinchiye, calories aur burn time turant. Free, no login." cta="Scan now" />
          <Explore to="/diet-preview" icon={Utensils} title="Personal diet plan" text="Indian meals ke saath 7-day plan aur grocery list. Sample dekhiye." cta="See sample" />
          <Explore to="/blog" icon={BookOpen} title="Health blog" text="Roti, dal, paneer, poha — nutrition articles padhiye, free." cta="Read articles" />
        </section>
      </main>
      <GuestBottomNav />
    </div>
  );
}

function Feature({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-primary" />
      <span>{label}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold">{value}</div>
    </div>
  );
}

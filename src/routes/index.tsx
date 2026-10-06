import logoAsset from "@/assets/logo.png.asset.json";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Camera, Sparkles, Footprints, Coffee, ArrowRight, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/components/theme-provider";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/home" });
  },
  component: Landing,
});

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
          <button onClick={toggle} aria-label="Toggle theme" className="grid h-9 w-9 place-items-center rounded-full border border-border hover:bg-accent">
            {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <Link to="/auth"><Button variant="ghost">Sign in</Button></Link>
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
              <Link to="/auth">
                <Button size="lg" className="rounded-full shadow-glow">
                  Start scanning <ArrowRight className="ml-1 h-4 w-4" />
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
      </main>
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

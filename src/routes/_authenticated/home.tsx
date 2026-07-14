import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { Camera, Upload, Flame, Footprints, TrendingUp, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/home")({
  ssr: false,
  component: HomePage,
});

function HomePage() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <HomeContent />
    </Suspense>
  );
}

function HomeSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="grid grid-cols-2 gap-3">
        <Skeleton className="h-28 rounded-2xl" /><Skeleton className="h-28 rounded-2xl" />
      </div>
      <Skeleton className="h-40 rounded-2xl" />
    </div>
  );
}

function HomeContent() {
  const { data: profile } = useSuspenseQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user!.id;
      const { data } = await supabase.from("profiles").select("*").eq("id", uid).maybeSingle();
      return { user: userData.user!, profile: data };
    },
  });

  const { data: today } = useSuspenseQuery({
    queryKey: ["today-analyses"],
    queryFn: async () => {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const { data } = await supabase
        .from("analyses")
        .select("*")
        .gte("created_at", start.toISOString())
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: recent } = useSuspenseQuery({
    queryKey: ["recent-analyses"],
    queryFn: async () => {
      const { data } = await supabase
        .from("analyses")
        .select("id, food_name, calories, image_url, created_at, steps_needed")
        .order("created_at", { ascending: false })
        .limit(4);
      return data ?? [];
    },
  });

  const todayCalories = today.reduce((s, a) => s + Number(a.calories || 0), 0);
  const todaySteps = today.reduce((s, a) => s + Number(a.steps_needed || 0), 0);
  const calorieGoal = profile.profile?.daily_calorie_goal ?? 2000;
  const stepGoal = profile.profile?.daily_step_goal ?? 10000;
  const name = profile.profile?.full_name ?? profile.user.email?.split("@")[0] ?? "there";
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-5 animate-in-up">
      <div>
        <p className="text-sm text-muted-foreground">{greet},</p>
        <h1 className="text-2xl font-bold">{name} 👋</h1>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link to="/analyze"><Button className="h-16 w-full justify-start gap-3 rounded-2xl bg-gradient-primary shadow-soft text-base">
          <Camera className="h-5 w-5" /> Take a photo
        </Button></Link>
        <Link to="/analyze"><Button variant="outline" className="h-16 w-full justify-start gap-3 rounded-2xl text-base">
          <Upload className="h-5 w-5" /> Upload from gallery
        </Button></Link>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <StatCard
          icon={Flame}
          label="Today's calories"
          value={Math.round(todayCalories).toLocaleString()}
          suffix={` / ${calorieGoal}`}
          progress={Math.min(100, (todayCalories / calorieGoal) * 100)}
          tint="from-orange-500/20 to-red-500/10"
          iconColor="text-orange-500"
        />
        <StatCard
          icon={Footprints}
          label="Steps to burn"
          value={Math.round(todaySteps).toLocaleString()}
          suffix={` / ${stepGoal}`}
          progress={Math.min(100, (todaySteps / stepGoal) * 100)}
          tint="from-primary/20 to-primary/5"
          iconColor="text-primary"
        />
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent analyses</h2>
          <Link to="/history" className="text-xs text-primary hover:underline">View all</Link>
        </div>
        {recent.length === 0 ? (
          <Card className="rounded-2xl border-dashed p-8 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-primary/60" />
            <p className="mt-3 text-sm font-medium">No scans yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Snap your first meal to get started.</p>
            <Link to="/analyze"><Button className="mt-4 rounded-full">Start scanning</Button></Link>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {recent.map(r => (
              <Link key={r.id} to="/history">
                <Card className="flex items-center gap-3 rounded-2xl p-3 transition hover:shadow-soft">
                  <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted">
                    {r.image_url
                      ? <img src={r.image_url} alt="" loading="lazy" className="h-full w-full object-cover" />
                      : <TrendingUp className="h-5 w-5 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{r.food_name}</p>
                    <p className="text-xs text-muted-foreground">{Math.round(Number(r.calories))} kcal · {Number(r.steps_needed).toLocaleString()} steps</p>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, suffix, progress, tint, iconColor }: {
  icon: any; label: string; value: string; suffix?: string; progress: number; tint: string; iconColor: string;
}) {
  return (
    <Card className={`relative overflow-hidden rounded-2xl border-none p-5 bg-gradient-to-br ${tint}`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <div className="mt-2 text-2xl font-bold">
        {value}<span className="ml-1 text-sm font-medium text-muted-foreground">{suffix}</span>
      </div>
      <Progress value={progress} className="mt-3 h-1.5" />
    </Card>
  );
}

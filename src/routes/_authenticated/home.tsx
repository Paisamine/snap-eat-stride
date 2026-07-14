import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { Camera, Upload, Flame, Footprints, TrendingUp, Sparkles, Scale, Target, Activity, ClipboardCheck, Info } from "lucide-react";
import { format } from "date-fns";
import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { bmi, bmiCategory, daysSince, goalProgress } from "@/lib/health";

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
  const { data } = useSuspenseQuery({
    queryKey: ["home-dashboard"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user!.id;
      const start = new Date(); start.setHours(0, 0, 0, 0);
      const [{ data: profile }, { data: today }, { data: recent }, { data: checkins }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("analyses").select("calories, steps_needed").gte("created_at", start.toISOString()),
        supabase.from("analyses").select("id, food_name, calories, image_url, created_at, steps_needed").order("created_at", { ascending: false }).limit(4),
        supabase.from("weight_checkins").select("created_at, weight_kg").order("created_at", { ascending: true }),
      ]);
      return {
        user: u.user!,
        profile,
        today: today ?? [],
        recent: recent ?? [],
        checkins: checkins ?? [],
      };
    },
  });

  const todayCalories = data.today.reduce((s, a) => s + Number(a.calories || 0), 0);
  const todaySteps = data.today.reduce((s, a) => s + Number(a.steps_needed || 0), 0);
  const calorieGoal = data.profile?.daily_calorie_goal ?? 2000;
  const stepGoal = data.profile?.daily_step_goal ?? 10000;
  const remainingCal = Math.max(0, calorieGoal - todayCalories);
  const remainingSteps = Math.max(0, stepGoal - todaySteps);

  const name = data.profile?.full_name ?? data.user.email?.split("@")[0] ?? "there";
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  const startWeight = data.checkins[0]?.weight_kg ?? data.profile?.weight_kg ?? null;
  const currentWeight = data.checkins[data.checkins.length - 1]?.weight_kg ?? data.profile?.weight_kg ?? null;
  const targetWeight = data.profile?.target_weight_kg ?? null;
  const bmiNow = bmi(currentWeight, data.profile?.height_cm);
  const progress = goalProgress(startWeight ? Number(startWeight) : null, currentWeight ? Number(currentWeight) : null, targetWeight);
  const metabolism = data.profile?.metabolism_profile ?? "—";

  const dSince = daysSince(data.profile?.last_checkin_at);
  const needsCheckin = dSince == null || dSince >= 7;

  const trend = data.checkins.slice(-8).map(c => ({
    d: format(new Date(c.created_at), "MMM d"),
    w: c.weight_kg ? Number(c.weight_kg) : null,
  }));

  return (
    <div className="space-y-5 animate-in-up">
      <div>
        <p className="text-sm text-muted-foreground">{greet},</p>
        <h1 className="text-2xl font-bold">{name} 👋</h1>
      </div>

      {needsCheckin && (
        <Link to="/checkin">
          <Card className="flex items-center gap-3 rounded-2xl border-primary/30 bg-gradient-to-r from-primary/15 to-primary/5 p-4 shadow-soft transition hover:shadow-glow">
            <div className="grid h-11 w-11 place-items-center rounded-full bg-primary text-primary-foreground">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold">Time for your weekly check-in</p>
              <p className="text-xs text-muted-foreground">
                {dSince == null ? "Log your first weight to start tracking." : `It's been ${dSince} days since your last update.`}
              </p>
            </div>
            <span className="text-xs font-semibold text-primary">Update →</span>
          </Card>
        </Link>
      )}

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
          hint={`${remainingCal.toLocaleString()} kcal remaining`}
          progress={Math.min(100, (todayCalories / calorieGoal) * 100)}
          tint="from-orange-500/20 to-red-500/10"
          iconColor="text-orange-500"
        />
        <StatCard
          icon={Footprints}
          label="Steps to burn"
          value={Math.round(todaySteps).toLocaleString()}
          suffix={` / ${stepGoal}`}
          hint={`${remainingSteps.toLocaleString()} steps to go`}
          progress={Math.min(100, (todaySteps / stepGoal) * 100)}
          tint="from-primary/20 to-primary/5"
          iconColor="text-primary"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          icon={Scale}
          label="Current weight"
          value={currentWeight ? `${Number(currentWeight).toFixed(1)} kg` : "—"}
          sub={targetWeight ? `Target ${Number(targetWeight).toFixed(1)} kg` : "Set a target"}
        />
        <MetricCard
          icon={Target}
          label="Goal progress"
          value={progress == null ? "—" : `${Math.round(progress)}%`}
          sub={progress != null ? <Progress value={progress} className="mt-1.5 h-1.5" /> : "Log check-ins"}
        />
        <MetricCard
          icon={Activity}
          label="BMI"
          value={bmiNow ? bmiNow.toFixed(1) : "—"}
          sub={bmiNow ? bmiCategory(bmiNow) : "Add height + weight"}
        />
      </div>

      <Card className="rounded-3xl bg-gradient-primary p-5 text-primary-foreground shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider opacity-80">Estimated metabolism</p>
            <p className="text-2xl font-bold capitalize">{metabolism}</p>
          </div>
          <Sparkles className="h-6 w-6 opacity-80" />
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[11px] opacity-80">
          <Info className="h-3 w-3" /> Estimation from your questionnaire — not a diagnosis.
        </p>
      </Card>

      {trend.filter(t => t.w != null).length > 1 && (
        <Card className="rounded-3xl p-5">
          <p className="mb-2 text-sm font-semibold">Weight trend</p>
          <div className="h-40">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <XAxis dataKey="d" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10 }} domain={["dataMin - 1", "dataMax + 1"]} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Line type="monotone" dataKey="w" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent scans</h2>
          <Link to="/history" className="text-xs text-primary hover:underline">View all</Link>
        </div>
        {data.recent.length === 0 ? (
          <Card className="rounded-2xl border-dashed p-8 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-primary/60" />
            <p className="mt-3 text-sm font-medium">No scans yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Snap your first meal to get started.</p>
            <Link to="/analyze"><Button className="mt-4 rounded-full">Start scanning</Button></Link>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {data.recent.map(r => (
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

      <p className="text-center text-[11px] text-muted-foreground">
        Calorie & body estimates are approximate and not a substitute for medical advice.
      </p>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, suffix, hint, progress, tint, iconColor }: {
  icon: any; label: string; value: string; suffix?: string; hint?: string; progress: number; tint: string; iconColor: string;
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
      {hint && <p className="mt-1.5 text-[11px] text-muted-foreground">{hint}</p>}
    </Card>
  );
}

function MetricCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub: React.ReactNode }) {
  return (
    <Card className="rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div className="mt-1 text-xl font-bold">{value}</div>
      <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>
    </Card>
  );
}

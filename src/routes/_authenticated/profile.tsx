import { createFileRoute, Link } from "@tanstack/react-router";
import { Suspense, useEffect, useState } from "react";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { User as UserIcon, Loader2, Flame, Footprints, TrendingUp, ClipboardCheck, RefreshCw, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  ssr: false,
  component: ProfilePage,
});

function ProfilePage() {
  return (
    <div className="space-y-5 animate-in-up">
      <h1 className="text-2xl font-bold">Profile</h1>
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <ProfileContent />
      </Suspense>
    </div>
  );
}

function ProfileContent() {
  const qc = useQueryClient();
  const { data } = useSuspenseQuery({
    queryKey: ["profile-full"],
    queryFn: async () => {
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user!.id;
      const [{ data: profile }, { data: analyses }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("analyses").select("calories, steps_needed, created_at"),
      ]);
      return { user: userData.user!, profile, analyses: analyses ?? [] };
    },
  });

  const [form, setForm] = useState({
    full_name: "", age: "", height_cm: "", weight_kg: "", gender: "",
    daily_step_goal: "10000", daily_calorie_goal: "2000",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const p = data.profile;
    if (p) setForm({
      full_name: p.full_name ?? "",
      age: p.age?.toString() ?? "",
      height_cm: p.height_cm?.toString() ?? "",
      weight_kg: p.weight_kg?.toString() ?? "",
      gender: p.gender ?? "",
      daily_step_goal: (p.daily_step_goal ?? 10000).toString(),
      daily_calorie_goal: (p.daily_calorie_goal ?? 2000).toString(),
    });
  }, [data.profile]);

  async function save() {
    setSaving(true);
    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name || null,
      age: form.age ? Number(form.age) : null,
      height_cm: form.height_cm ? Number(form.height_cm) : null,
      weight_kg: form.weight_kg ? Number(form.weight_kg) : null,
      gender: form.gender || null,
      daily_step_goal: Number(form.daily_step_goal) || 10000,
      daily_calorie_goal: Number(form.daily_calorie_goal) || 2000,
    }).eq("id", data.user.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Profile updated");
    qc.invalidateQueries();
  }

  const totalCal = data.analyses.reduce((s, a) => s + Number(a.calories || 0), 0);
  const totalSteps = data.analyses.reduce((s, a) => s + Number(a.steps_needed || 0), 0);
  const n = data.analyses.length;
  const avgCal = n ? Math.round(totalCal / n) : 0;
  const avgSteps = n ? Math.round(totalSteps / n) : 0;

  return (
    <>
      <Card className="rounded-3xl p-5">
        <div className="flex items-center gap-4">
          <div className="grid h-16 w-16 place-items-center overflow-hidden rounded-full bg-gradient-primary text-primary-foreground shadow-soft">
            {data.profile?.avatar_url
              ? <img src={data.profile.avatar_url} alt="" className="h-full w-full object-cover" />
              : <UserIcon className="h-7 w-7" />}
          </div>
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold">{data.profile?.full_name ?? "Your profile"}</div>
            <div className="truncate text-sm text-muted-foreground">{data.user.email}</div>
          </div>
        </div>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link to="/checkin">
          <Card className="flex items-center gap-3 rounded-2xl p-4 transition hover:shadow-soft">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
              <ClipboardCheck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Weekly check-in</p>
              <p className="text-xs text-muted-foreground">Log weight & measurements</p>
            </div>
          </Card>
        </Link>
        <button
          type="button"
          onClick={async () => {
            await supabase.from("profiles").update({ onboarding_completed: false }).eq("id", data.user.id);
            await qc.invalidateQueries();
            toast.info("Restarting onboarding…");
          }}
          className="text-left"
        >
          <Card className="flex items-center gap-3 rounded-2xl p-4 transition hover:shadow-soft">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary">
              <RefreshCw className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-semibold">Redo health profile</p>
              <p className="text-xs text-muted-foreground">Update lifestyle & goals</p>
            </div>
          </Card>
        </button>
      </div>

      <Card className="rounded-3xl bg-gradient-primary p-5 text-primary-foreground shadow-soft">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wider opacity-80">Estimated metabolism</p>
            <p className="text-xl font-bold capitalize">{data.profile?.metabolism_profile ?? "—"}</p>
          </div>
          <Sparkles className="h-5 w-5 opacity-80" />
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <MiniStat icon={TrendingUp} label="Scans" value={n.toString()} />
        <MiniStat icon={Flame} label="Avg kcal" value={avgCal.toLocaleString()} />
        <MiniStat icon={Footprints} label="Avg steps" value={avgSteps.toLocaleString()} />
      </div>

      <Card className="rounded-3xl p-5 space-y-4">
        <h2 className="font-semibold">Personal details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name"><Input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} /></Field>
          <Field label="Age"><Input type="number" value={form.age} onChange={e => setForm({ ...form, age: e.target.value })} /></Field>
          <Field label="Height (cm)"><Input type="number" value={form.height_cm} onChange={e => setForm({ ...form, height_cm: e.target.value })} /></Field>
          <Field label="Weight (kg)"><Input type="number" value={form.weight_kg} onChange={e => setForm({ ...form, weight_kg: e.target.value })} /></Field>
          <Field label="Gender">
            <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v })}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="other">Other</SelectItem>
                <SelectItem value="prefer_not">Prefer not to say</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Daily step goal"><Input type="number" value={form.daily_step_goal} onChange={e => setForm({ ...form, daily_step_goal: e.target.value })} /></Field>
          <Field label="Daily calorie goal"><Input type="number" value={form.daily_calorie_goal} onChange={e => setForm({ ...form, daily_calorie_goal: e.target.value })} /></Field>
        </div>
        <Button onClick={save} disabled={saving} className="w-full rounded-full">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
        </Button>
      </Card>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}

function MiniStat({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <Card className="rounded-2xl p-4 text-center">
      <Icon className="mx-auto h-4 w-4 text-primary" />
      <div className="mt-1 text-lg font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </Card>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Suspense, useState } from "react";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Info, TrendingDown, TrendingUp, Activity } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EXERCISE_FREQ, bmi, bmiCategory, goalProgress } from "@/lib/health";

export const Route = createFileRoute("/_authenticated/checkin")({
  ssr: false,
  component: CheckinPage,
});

function CheckinPage() {
  return (
    <div className="space-y-5 animate-in-up">
      <div>
        <h1 className="text-2xl font-bold">Weekly check-in</h1>
        <p className="text-sm text-muted-foreground">Log your latest numbers to keep trends accurate.</p>
      </div>
      <Suspense fallback={<Skeleton className="h-96 rounded-2xl" />}>
        <CheckinContent />
      </Suspense>
    </div>
  );
}

function CheckinContent() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const { data } = useSuspenseQuery({
    queryKey: ["checkin-data"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user!.id;
      const [{ data: profile }, { data: checkins }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
        supabase.from("weight_checkins").select("*").order("created_at", { ascending: true }),
      ]);
      return { uid, profile, checkins: checkins ?? [] };
    },
  });

  const last = data.checkins[data.checkins.length - 1];
  const [form, setForm] = useState({
    weight_kg: last?.weight_kg?.toString() ?? data.profile?.weight_kg?.toString() ?? "",
    waist_cm: last?.waist_cm?.toString() ?? "",
    hip_cm: last?.hip_cm?.toString() ?? "",
    neck_cm: last?.neck_cm?.toString() ?? "",
    mood: "good",
    energy_level: "3",
    exercise_frequency: data.profile?.exercise_frequency ?? "1-2",
    water_intake_l: data.profile?.water_intake_l?.toString() ?? "",
    sleep_hours: data.profile?.sleep_hours?.toString() ?? "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.weight_kg) return toast.error("Please enter your current weight.");
    setSaving(true);
    const payload = {
      user_id: data.uid,
      weight_kg: Number(form.weight_kg),
      waist_cm: form.waist_cm ? Number(form.waist_cm) : null,
      hip_cm: form.hip_cm ? Number(form.hip_cm) : null,
      neck_cm: form.neck_cm ? Number(form.neck_cm) : null,
      mood: form.mood,
      energy_level: Number(form.energy_level) || null,
      exercise_frequency: form.exercise_frequency,
      water_intake_l: form.water_intake_l ? Number(form.water_intake_l) : null,
      sleep_hours: form.sleep_hours ? Number(form.sleep_hours) : null,
      notes: form.notes || null,
    };
    const { error } = await supabase.from("weight_checkins").insert(payload);
    if (!error) {
      await supabase.from("profiles").update({
        weight_kg: payload.weight_kg,
        waist_cm: payload.waist_cm,
        hip_cm: payload.hip_cm,
        neck_cm: payload.neck_cm,
        last_checkin_at: new Date().toISOString(),
      }).eq("id", data.uid);
    }
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Check-in saved!");
    await qc.invalidateQueries();
    nav({ to: "/home" });
  }

  const start = data.checkins[0]?.weight_kg ?? data.profile?.weight_kg ?? null;
  const current = last?.weight_kg ?? data.profile?.weight_kg ?? null;
  const target = data.profile?.target_weight_kg ?? null;
  const delta = start != null && current != null ? current - Number(start) : null;
  const bmiNow = bmi(current, data.profile?.height_cm);
  const progress = goalProgress(start ? Number(start) : null, current, target);

  const chartData = data.checkins.map(c => ({
    date: format(new Date(c.created_at), "MMM d"),
    weight: c.weight_kg ? Number(c.weight_kg) : null,
    bmi: c.weight_kg && data.profile?.height_cm ? Number((Number(c.weight_kg) / Math.pow((data.profile.height_cm as number) / 100, 2)).toFixed(1)) : null,
  }));

  return (
    <>
      {data.checkins.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-3">
          <TrendStat icon={delta != null && delta < 0 ? TrendingDown : TrendingUp}
            label="Change since start"
            value={delta == null ? "—" : `${delta > 0 ? "+" : ""}${delta.toFixed(1)} kg`}
            tone={delta != null && delta < 0 ? "text-primary" : "text-orange-500"} />
          <TrendStat icon={Activity} label="BMI" value={bmiNow ? `${bmiNow.toFixed(1)} · ${bmiCategory(bmiNow)}` : "—"} tone="text-primary" />
          <TrendStat icon={TrendingDown} label="Goal progress" value={progress == null ? "—" : `${Math.round(progress)}%`} tone="text-primary" />
        </div>
      )}

      {chartData.length > 1 && (
        <Card className="rounded-3xl p-4">
          <p className="mb-2 text-sm font-semibold">Weight trend</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={["dataMin - 2", "dataMax + 2"]} />
                <Tooltip contentStyle={{ borderRadius: 12, fontSize: 12 }} />
                <Line type="monotone" dataKey="weight" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <Card className="rounded-3xl p-5 space-y-4">
        <h2 className="font-semibold">Today's numbers</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Weight (kg)"><Input inputMode="decimal" value={form.weight_kg} onChange={e => setForm({ ...form, weight_kg: e.target.value })} /></Field>
          <Field label="Waist (cm)"><Input inputMode="decimal" value={form.waist_cm} onChange={e => setForm({ ...form, waist_cm: e.target.value })} /></Field>
          <Field label="Hip (cm)"><Input inputMode="decimal" value={form.hip_cm} onChange={e => setForm({ ...form, hip_cm: e.target.value })} /></Field>
          <Field label="Neck (cm)"><Input inputMode="decimal" value={form.neck_cm} onChange={e => setForm({ ...form, neck_cm: e.target.value })} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Field label="Mood">
            <Select value={form.mood} onValueChange={v => setForm({ ...form, mood: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="great">😄 Great</SelectItem>
                <SelectItem value="good">🙂 Good</SelectItem>
                <SelectItem value="okay">😐 Okay</SelectItem>
                <SelectItem value="low">😕 Low</SelectItem>
                <SelectItem value="bad">😣 Bad</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Energy (1-5)">
            <Select value={form.energy_level} onValueChange={v => setForm({ ...form, energy_level: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{[1,2,3,4,5].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field label="Sleep (hrs)"><Input inputMode="decimal" value={form.sleep_hours} onChange={e => setForm({ ...form, sleep_hours: e.target.value })} /></Field>
          <Field label="Water (L)"><Input inputMode="decimal" value={form.water_intake_l} onChange={e => setForm({ ...form, water_intake_l: e.target.value })} /></Field>
        </div>
        <Field label="Exercise this week">
          <Select value={form.exercise_frequency} onValueChange={v => setForm({ ...form, exercise_frequency: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{EXERCISE_FREQ.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
          </Select>
        </Field>
        <Field label="Notes (optional)"><Textarea rows={2} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></Field>

        <div className="flex gap-2 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
          <Info className="h-4 w-4 shrink-0" />
          Data is for tracking only. Consult a professional for medical advice.
        </div>
        <Button onClick={save} disabled={saving} className="w-full rounded-full">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save check-in"}
        </Button>
      </Card>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1.5"><Label className="text-xs">{label}</Label>{children}</div>;
}

function TrendStat({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: string }) {
  return (
    <Card className="rounded-2xl p-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${tone}`} />
      </div>
      <div className="mt-1 text-lg font-bold">{value}</div>
    </Card>
  );
}

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2, ChevronRight, ChevronLeft, Sparkles, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQueryClient } from "@tanstack/react-query";
import {
  METABOLISM_QUESTIONS, estimateMetabolism, ACTIVITY_LEVELS, DIET_PREFS,
  HEALTH_GOALS, SMOKING_OPTS, ALCOHOL_OPTS, EXERCISE_FREQ,
} from "@/lib/health";

export const Route = createFileRoute("/_authenticated/onboarding")({
  ssr: false,
  component: OnboardingPage,
});

type Form = {
  full_name: string; age: string; gender: string;
  height_cm: string; weight_kg: string; target_weight_kg: string;
  waist_cm: string; neck_cm: string; hip_cm: string;
  activity_level: string; daily_step_goal: string; sleep_hours: string; water_intake_l: string;
  occupation: string; smoking: string; alcohol: string; exercise_frequency: string;
  diet_preference: string; health_goal: string;
  metabolism: Record<string, number>;
};

const emptyForm: Form = {
  full_name: "", age: "", gender: "",
  height_cm: "", weight_kg: "", target_weight_kg: "",
  waist_cm: "", neck_cm: "", hip_cm: "",
  activity_level: "", daily_step_goal: "10000", sleep_hours: "7", water_intake_l: "2",
  occupation: "", smoking: "never", alcohol: "never", exercise_frequency: "1-2",
  diet_preference: "", health_goal: "",
  metabolism: {},
};

function OnboardingPage() {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>(emptyForm);
  const [saving, setSaving] = useState(false);

  const steps = ["Personal", "Body", "Lifestyle", "Goal", "Metabolism", "Review"];
  const pct = ((step + 1) / steps.length) * 100;

  function set<K extends keyof Form>(k: K, v: Form[K]) { setForm(f => ({ ...f, [k]: v })); }

  function canNext(): boolean {
    if (step === 0) return !!form.full_name && !!form.age && !!form.gender;
    if (step === 1) return !!form.height_cm && !!form.weight_kg && !!form.target_weight_kg;
    if (step === 2) return !!form.activity_level;
    if (step === 3) return !!form.diet_preference && !!form.health_goal;
    if (step === 4) return METABOLISM_QUESTIONS.every(q => typeof form.metabolism[q.id] === "number");
    return true;
  }

  async function submit() {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const uid = u.user!.id;
    const metabolism_profile = estimateMetabolism(form.metabolism);
    const { error } = await supabase.from("profiles").update({
      full_name: form.full_name,
      age: Number(form.age) || null,
      gender: form.gender || null,
      height_cm: Number(form.height_cm) || null,
      weight_kg: Number(form.weight_kg) || null,
      target_weight_kg: Number(form.target_weight_kg) || null,
      waist_cm: form.waist_cm ? Number(form.waist_cm) : null,
      neck_cm: form.neck_cm ? Number(form.neck_cm) : null,
      hip_cm: form.hip_cm ? Number(form.hip_cm) : null,
      activity_level: form.activity_level,
      daily_step_goal: Number(form.daily_step_goal) || 10000,
      sleep_hours: Number(form.sleep_hours) || null,
      water_intake_l: Number(form.water_intake_l) || null,
      occupation: form.occupation || null,
      smoking: form.smoking,
      alcohol: form.alcohol,
      exercise_frequency: form.exercise_frequency,
      diet_preference: form.diet_preference,
      health_goal: form.health_goal,
      metabolism_profile,
      metabolism_answers: form.metabolism,
      onboarding_completed: true,
    }).eq("id", uid);
    setSaving(false);
    if (error) return toast.error(error.message);

    // Log an initial weight check-in so trends start immediately.
    if (form.weight_kg) {
      await supabase.from("weight_checkins").insert({
        user_id: uid,
        weight_kg: Number(form.weight_kg),
        waist_cm: form.waist_cm ? Number(form.waist_cm) : null,
        hip_cm: form.hip_cm ? Number(form.hip_cm) : null,
        neck_cm: form.neck_cm ? Number(form.neck_cm) : null,
      });
      await supabase.from("profiles").update({ last_checkin_at: new Date().toISOString() }).eq("id", uid);
    }

    toast.success(`You're set! Estimated metabolism: ${metabolism_profile}`);
    await qc.invalidateQueries();
    nav({ to: "/home" });
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 animate-in-up">
      <div>
        <div className="flex items-center gap-2 text-primary">
          <Sparkles className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Health profile</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold">Let's personalize your journey</h1>
        <p className="text-sm text-muted-foreground">Step {step + 1} of {steps.length} — {steps[step]}</p>
        <Progress value={pct} className="mt-3 h-1.5" />
      </div>

      <Card className="rounded-3xl p-5 space-y-4">
        {step === 0 && (
          <>
            <Field label="Full name"><Input value={form.full_name} onChange={e => set("full_name", e.target.value)} /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Age"><Input inputMode="numeric" value={form.age} onChange={e => set("age", e.target.value)} /></Field>
              <Field label="Gender">
                <Select value={form.gender} onValueChange={v => set("gender", v)}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="female">Female</SelectItem>
                    <SelectItem value="male">Male</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                    <SelectItem value="prefer_not">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field label="Occupation (optional)"><Input value={form.occupation} onChange={e => set("occupation", e.target.value)} /></Field>
          </>
        )}
        {step === 1 && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Height (cm)"><Input inputMode="numeric" value={form.height_cm} onChange={e => set("height_cm", e.target.value)} /></Field>
              <Field label="Weight (kg)"><Input inputMode="numeric" value={form.weight_kg} onChange={e => set("weight_kg", e.target.value)} /></Field>
              <Field label="Target (kg)"><Input inputMode="numeric" value={form.target_weight_kg} onChange={e => set("target_weight_kg", e.target.value)} /></Field>
            </div>
            <p className="text-xs text-muted-foreground">Optional measurements help track fat-loss progress.</p>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Waist (cm)"><Input inputMode="numeric" value={form.waist_cm} onChange={e => set("waist_cm", e.target.value)} /></Field>
              <Field label="Neck (cm)"><Input inputMode="numeric" value={form.neck_cm} onChange={e => set("neck_cm", e.target.value)} /></Field>
              <Field label="Hip (cm)"><Input inputMode="numeric" value={form.hip_cm} onChange={e => set("hip_cm", e.target.value)} /></Field>
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <Field label="Activity level">
              <Select value={form.activity_level} onValueChange={v => set("activity_level", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {ACTIVITY_LEVELS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Daily step goal"><Input inputMode="numeric" value={form.daily_step_goal} onChange={e => set("daily_step_goal", e.target.value)} /></Field>
              <Field label="Exercise frequency">
                <Select value={form.exercise_frequency} onValueChange={v => set("exercise_frequency", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EXERCISE_FREQ.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Sleep (hrs/night)"><Input inputMode="decimal" value={form.sleep_hours} onChange={e => set("sleep_hours", e.target.value)} /></Field>
              <Field label="Water (L/day)"><Input inputMode="decimal" value={form.water_intake_l} onChange={e => set("water_intake_l", e.target.value)} /></Field>
              <Field label="Smoking">
                <Select value={form.smoking} onValueChange={v => set("smoking", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{SMOKING_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field label="Alcohol">
                <Select value={form.alcohol} onValueChange={v => set("alcohol", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{ALCOHOL_OPTS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <Field label="Diet preference">
              <Select value={form.diet_preference} onValueChange={v => set("diet_preference", v)}>
                <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{DIET_PREFS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </Field>
            <Field label="Primary goal">
              <div className="grid grid-cols-2 gap-2">
                {HEALTH_GOALS.map(g => (
                  <button key={g.value} type="button"
                    onClick={() => set("health_goal", g.value)}
                    className={`rounded-2xl border p-3 text-sm font-medium transition ${form.health_goal === g.value ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"}`}>
                    {g.label}
                  </button>
                ))}
              </div>
            </Field>
          </>
        )}
        {step === 4 && (
          <>
            <p className="text-sm text-muted-foreground">Rate each statement — this estimates your metabolism profile.</p>
            {METABOLISM_QUESTIONS.map(q => (
              <div key={q.id} className="rounded-2xl border border-border p-3">
                <p className="text-sm font-medium">{q.text}</p>
                <div className="mt-2 flex justify-between gap-1">
                  {[1, 2, 3, 4, 5].map(n => (
                    <button key={n} type="button"
                      onClick={() => set("metabolism", { ...form.metabolism, [q.id]: n })}
                      className={`h-10 flex-1 rounded-xl text-sm font-semibold transition ${form.metabolism[q.id] === n ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-accent"}`}>
                      {n}
                    </button>
                  ))}
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>Disagree</span><span>Agree</span></div>
              </div>
            ))}
            <div className="flex gap-2 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">
              <Info className="h-4 w-4 shrink-0" />
              This is an estimation only, not a medical diagnosis.
            </div>
          </>
        )}
        {step === 5 && (
          <ReviewStep form={form} />
        )}

        <div className="flex items-center justify-between gap-3 pt-2">
          <Button variant="outline" className="rounded-full" onClick={() => setStep(s => Math.max(0, s - 1))} disabled={step === 0 || saving}>
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>
          {step < steps.length - 1 ? (
            <Button className="rounded-full" onClick={() => setStep(s => s + 1)} disabled={!canNext()}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button className="rounded-full" onClick={submit} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Finish setup"}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label className="text-xs">{label}</Label>{children}</div>;
}

function ReviewStep({ form }: { form: Form }) {
  const metab = estimateMetabolism(form.metabolism);
  const rows: Array<[string, string]> = [
    ["Name", form.full_name || "—"],
    ["Age / Gender", `${form.age || "—"} · ${form.gender || "—"}`],
    ["Height / Weight", `${form.height_cm || "—"} cm · ${form.weight_kg || "—"} kg`],
    ["Target weight", `${form.target_weight_kg || "—"} kg`],
    ["Activity", ACTIVITY_LEVELS.find(a => a.value === form.activity_level)?.label ?? "—"],
    ["Diet", DIET_PREFS.find(a => a.value === form.diet_preference)?.label ?? "—"],
    ["Goal", HEALTH_GOALS.find(a => a.value === form.health_goal)?.label ?? "—"],
  ];
  return (
    <>
      <div className="rounded-2xl bg-gradient-primary p-5 text-primary-foreground shadow-glow">
        <p className="text-xs uppercase tracking-wider opacity-80">Estimated metabolism</p>
        <p className="text-2xl font-bold capitalize">{metab}</p>
        <p className="mt-1 text-xs opacity-80">This is an estimate to personalize suggestions — not a diagnosis.</p>
      </div>
      <div className="divide-y divide-border rounded-2xl border border-border">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between px-4 py-2 text-sm">
            <span className="text-muted-foreground">{k}</span>
            <span className="font-medium">{v}</span>
          </div>
        ))}
      </div>
    </>
  );
}

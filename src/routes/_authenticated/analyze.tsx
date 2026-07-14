import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Camera, Upload, Sparkles, Loader2, X, Flame, Footprints, Clock, Salad, Leaf, Save, Share2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { analyzeFood, type AnalysisResult } from "@/lib/analyze.functions";
import { blobToBase64, compressImage } from "@/lib/image";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated/analyze")({
  ssr: false,
  component: AnalyzePage,
});

function AnalyzePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [status, setStatus] = useState<"idle" | "analyzing" | "done">("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [saved, setSaved] = useState(false);
  const analyze = useServerFn(analyzeFood);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    try {
      const compressed = await compressImage(file);
      setBlob(compressed);
      setPreview(URL.createObjectURL(compressed));
      setResult(null); setSaved(false);
      await runAnalysis(compressed);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load image");
    }
  }

  async function runAnalysis(b: Blob) {
    setStatus("analyzing");
    try {
      const base64 = await blobToBase64(b);
      const res = await analyze({ data: { imageBase64: base64, mimeType: "image/jpeg" } });
      setResult(res);
      setStatus("done");
    } catch (e) {
      setStatus("idle");
      toast.error(e instanceof Error ? e.message : "Analysis failed");
    }
  }

  async function saveAnalysis() {
    if (!result || !blob) return;
    const { data: userData } = await supabase.auth.getUser();
    const uid = userData.user!.id;
    const path = `${uid}/${Date.now()}.jpg`;
    const { error: upErr } = await supabase.storage.from("food-images").upload(path, blob, {
      contentType: "image/jpeg", upsert: false,
    });
    if (upErr) { toast.error(upErr.message); return; }
    const { data: signed } = await supabase.storage.from("food-images").createSignedUrl(path, 60 * 60 * 24 * 365);
    const image_url = signed?.signedUrl ?? null;
    const { error } = await supabase.from("analyses").insert({
      user_id: uid,
      image_url,
      food_name: result.food_name,
      items: result.items,
      portion_size: result.portion_size,
      calories: result.calories,
      protein_g: result.protein_g,
      carbs_g: result.carbs_g,
      fat_g: result.fat_g,
      steps_needed: result.steps_needed,
      walking_minutes: result.walking_minutes,
      health_score: result.health_score,
      confidence: result.confidence,
      tips: result.tips,
      alternatives: result.alternatives,
      is_healthy: result.is_healthy,
    });
    if (error) { toast.error(error.message); return; }
    setSaved(true);
    qc.invalidateQueries();
    toast.success("Saved to history");
  }

  async function share() {
    if (!result) return;
    const text = `I just scanned ${result.food_name} — ${Math.round(result.calories)} kcal, ${result.steps_needed.toLocaleString()} steps to burn. #CalorieCount`;
    if (navigator.share) {
      try { await navigator.share({ text, title: "Calorie Count" }); } catch {}

    } else {
      await navigator.clipboard.writeText(text);
      toast.success("Copied to clipboard");
    }
  }

  function reset() {
    setPreview(null); setBlob(null); setResult(null); setStatus("idle"); setSaved(false);
  }

  return (
    <div className="space-y-5 animate-in-up">
      <div>
        <h1 className="text-2xl font-bold">Scan food</h1>
        <p className="text-sm text-muted-foreground">Snap or upload a photo to analyze.</p>
      </div>

      <input ref={fileInput} type="file" accept="image/*" hidden onChange={(e) => handleFile(e.target.files?.[0])} />
      <input ref={cameraInput} type="file" accept="image/*" capture="environment" hidden onChange={(e) => handleFile(e.target.files?.[0])} />

      {!preview ? (
        <Card className="rounded-3xl border-dashed p-8 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
            <Camera className="h-9 w-9" />
          </div>
          <h2 className="mt-5 text-lg font-semibold">Ready when you are</h2>
          <p className="mt-1 text-sm text-muted-foreground">Center the whole meal in frame for best results.</p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <Button onClick={() => cameraInput.current?.click()} className="rounded-full gap-2">
              <Camera className="h-4 w-4" /> Take photo
            </Button>
            <Button variant="outline" onClick={() => fileInput.current?.click()} className="rounded-full gap-2">
              <Upload className="h-4 w-4" /> Upload
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-3xl shadow-soft">
            <img src={preview} alt="food preview" className="h-64 w-full object-cover sm:h-80" />
            <button
              onClick={reset}
              className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-full bg-background/90 backdrop-blur hover:bg-background"
              aria-label="Reset"
            ><X className="h-4 w-4" /></button>
            {status === "analyzing" && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/70 backdrop-blur-sm">
                <div className="flex flex-col items-center gap-3">
                  <div className="grid h-14 w-14 place-items-center rounded-full bg-primary/20">
                    <Loader2 className="h-7 w-7 animate-spin text-primary" />
                  </div>
                  <p className="text-sm font-medium">Analyzing your meal…</p>
                  <p className="text-xs text-muted-foreground">Detecting ingredients & portions</p>
                </div>
              </div>
            )}
          </div>

          {result && status === "done" && (
            <div className="space-y-4 animate-in-up">
              <Card className="rounded-3xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Badge variant="secondary" className="mb-2 rounded-full">
                      {Math.round(result.confidence * 100)}% confidence
                    </Badge>
                    <h2 className="truncate text-xl font-bold">{result.food_name}</h2>
                    {result.portion_size && <p className="text-sm text-muted-foreground">{result.portion_size}</p>}
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-extrabold text-primary">{Math.round(result.calories)}</div>
                    <div className="text-xs text-muted-foreground">kcal</div>
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <MacroCell label="Protein" grams={result.protein_g} color="bg-blue-500" />
                  <MacroCell label="Carbs" grams={result.carbs_g} color="bg-amber-500" />
                  <MacroCell label="Fat" grams={result.fat_g} color="bg-pink-500" />
                </div>
              </Card>

              <div className="grid gap-3 sm:grid-cols-2">
                <Card className="rounded-3xl border-none bg-gradient-to-br from-primary/15 to-primary/5 p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Walking to burn</span>
                    <Footprints className="h-5 w-5 text-primary" />
                  </div>
                  <div className="mt-2 text-3xl font-bold">{result.steps_needed.toLocaleString()}</div>
                  <div className="text-xs text-muted-foreground">steps</div>
                </Card>
                <Card className="rounded-3xl border-none bg-gradient-to-br from-amber-500/15 to-orange-500/5 p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">Walking time</span>
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="mt-2 text-3xl font-bold">{result.walking_minutes}</div>
                  <div className="text-xs text-muted-foreground">minutes</div>
                </Card>
              </div>

              <Card className="rounded-3xl p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-semibold">Health score</span>
                  <span className={`text-2xl font-bold ${result.health_score >= 70 ? "text-primary" : result.health_score >= 40 ? "text-amber-500" : "text-destructive"}`}>
                    {result.health_score}<span className="text-sm text-muted-foreground">/100</span>
                  </span>
                </div>
                <Progress value={result.health_score} className="h-2" />
                <p className="mt-3 text-sm">
                  {result.is_healthy
                    ? <span className="inline-flex items-center gap-1 text-primary"><Leaf className="h-4 w-4" /> Solid choice</span>
                    : <span className="inline-flex items-center gap-1 text-amber-600"><Flame className="h-4 w-4" /> Enjoy in moderation</span>}
                </p>
              </Card>

              {result.tips.length > 0 && (
                <Card className="rounded-3xl p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Healthy tips</span>
                  </div>
                  <ul className="space-y-2">
                    {result.tips.map((t, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </Card>
              )}

              {result.alternatives.length > 0 && (
                <Card className="rounded-3xl p-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Salad className="h-4 w-4 text-primary" />
                    <span className="text-sm font-semibold">Lower-calorie alternatives</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {result.alternatives.map((a, i) => (
                      <Badge key={i} variant="secondary" className="rounded-full">{a}</Badge>
                    ))}
                  </div>
                </Card>
              )}

              <p className="text-xs italic text-muted-foreground">
                These values are estimates and may not be completely accurate.
              </p>

              <div className="flex gap-2 pb-4">
                <Button onClick={saveAnalysis} disabled={saved} className="flex-1 rounded-full gap-2">
                  <Save className="h-4 w-4" /> {saved ? "Saved" : "Save"}
                </Button>
                <Button onClick={share} variant="outline" className="flex-1 rounded-full gap-2">
                  <Share2 className="h-4 w-4" /> Share
                </Button>
                <Button onClick={reset} variant="ghost" className="rounded-full">Delete</Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MacroCell({ label, grams, color }: { label: string; grams: number; color: string }) {
  return (
    <div className="rounded-2xl bg-muted/60 p-3 text-center">
      <div className={`mx-auto mb-1 h-1.5 w-6 rounded-full ${color}`} />
      <div className="text-lg font-bold">{Math.round(grams)}g</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { Suspense, useMemo, useState } from "react";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, Search, Flame, Footprints } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/history")({
  ssr: false,
  component: HistoryPage,
});

function HistoryPage() {
  return (
    <div className="space-y-5 animate-in-up">
      <h1 className="text-2xl font-bold">History</h1>
      <Suspense fallback={<Skeleton className="h-72 rounded-2xl" />}>
        <HistoryContent />
      </Suspense>
    </div>
  );
}

function HistoryContent() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [range, setRange] = useState<7 | 30 | 90>(7);

  const { data: analyses } = useSuspenseQuery({
    queryKey: ["all-analyses"],
    queryFn: async () => {
      const { data } = await supabase.from("analyses").select("*").order("created_at", { ascending: false }).limit(200);
      return data ?? [];
    },
  });

  const filtered = useMemo(
    () => analyses.filter(a => a.food_name.toLowerCase().includes(search.toLowerCase())),
    [analyses, search]
  );

  const chartData = useMemo(() => {
    const days: { date: string; calories: number; steps: number }[] = [];
    for (let i = range - 1; i >= 0; i--) {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
      days.push({ date: d.toISOString().slice(5, 10), calories: 0, steps: 0 });
    }
    const cutoff = new Date(); cutoff.setHours(0, 0, 0, 0); cutoff.setDate(cutoff.getDate() - (range - 1));
    analyses.forEach(a => {
      const d = new Date(a.created_at);
      if (d < cutoff) return;
      const key = d.toISOString().slice(5, 10);
      const row = days.find(x => x.date === key);
      if (row) { row.calories += Number(a.calories); row.steps += Number(a.steps_needed); }
    });
    return days;
  }, [analyses, range]);

  async function del(id: string) {
    const { error } = await supabase.from("analyses").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Deleted");
    qc.invalidateQueries();
  }

  return (
    <>
      <Card className="rounded-3xl p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Calorie trend</h2>
          <div className="flex gap-1 rounded-full bg-muted p-1 text-xs">
            {[7, 30, 90].map(n => (
              <button
                key={n}
                onClick={() => setRange(n as 7 | 30 | 90)}
                className={`rounded-full px-3 py-1 transition ${range === n ? "bg-background shadow-soft font-semibold" : "text-muted-foreground"}`}
              >{n}d</button>
            ))}
          </div>
        </div>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="calGrad" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.3} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 12 }} />
              <Line type="monotone" dataKey="calories" stroke="url(#calGrad)" strokeWidth={3} dot={{ r: 3, fill: "var(--primary)" }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search meals…"
          className="rounded-full pl-11"
        />
      </div>

      {filtered.length === 0 ? (
        <Card className="rounded-2xl border-dashed p-8 text-center text-sm text-muted-foreground">
          {analyses.length === 0 ? "No scans yet." : "No matches."}
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(a => (
            <Card key={a.id} className="flex items-center gap-3 rounded-2xl p-3">
              <div className="grid h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted place-items-center">
                {a.image_url
                  ? <img src={a.image_url} loading="lazy" alt="" className="h-full w-full object-cover" />
                  : <Flame className="h-6 w-6 text-muted-foreground" />}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">{a.food_name}</p>
                <p className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</p>
                <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><Flame className="h-3 w-3 text-orange-500" />{Math.round(Number(a.calories))} kcal</span>
                  <span className="inline-flex items-center gap-1"><Footprints className="h-3 w-3 text-primary" />{Number(a.steps_needed).toLocaleString()}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => del(a.id)} aria-label="Delete">
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

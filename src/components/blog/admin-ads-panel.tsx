import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Megaphone } from "lucide-react";
import { getAdSettings, updateAdSettings } from "@/lib/blog.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const FIELDS = [
  { key: "slot_header", label: "Header ad unit ID", hint: "Above the article list" },
  { key: "slot_in_article", label: "In-article ad unit ID", hint: "Inside every article, after the text" },
  { key: "slot_sidebar", label: "Sidebar ad unit ID", hint: "Right-hand column on wide screens" },
  { key: "slot_footer", label: "Bottom ad unit ID", hint: "Below the article list" },
] as const;

export function AdminAdsPanel() {
  const qc = useQueryClient();
  const loaded = useQuery({ queryKey: ["ad-settings"], queryFn: () => getAdSettings() });

  const [enabled, setEnabled] = useState(false);
  const [publisher, setPublisher] = useState("");
  const [slots, setSlots] = useState<Record<string, string>>({});
  const [showToSignedIn, setShowToSignedIn] = useState(false);
  const [contactEmail, setContactEmail] = useState("");

  useEffect(() => {
    const s = loaded.data;
    if (!s) return;
    setEnabled(Boolean(s.enabled));
    setPublisher(s.publisher_id ?? "");
    setSlots({
      slot_header: s.slot_header ?? "",
      slot_in_article: s.slot_in_article ?? "",
      slot_sidebar: s.slot_sidebar ?? "",
      slot_footer: s.slot_footer ?? "",
    });
    setShowToSignedIn(Boolean(s.show_to_signed_in));
    setContactEmail(s.contact_email ?? "");
  }, [loaded.data]);

  const save = useMutation({
    mutationFn: () =>
      updateAdSettings({
        data: {
          enabled,
          publisher_id: publisher.trim(),
          slot_header: (slots.slot_header ?? "").trim(),
          slot_in_article: (slots.slot_in_article ?? "").trim(),
          slot_sidebar: (slots.slot_sidebar ?? "").trim(),
          slot_footer: (slots.slot_footer ?? "").trim(),
          show_to_signed_in: showToSignedIn,
          contact_email: contactEmail.trim(),
        },
      }),
    onSuccess: () => {
      toast.success("Ad settings saved.");
      qc.invalidateQueries({ queryKey: ["ad-settings"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save ad settings."),
  });

  if (loaded.isLoading) return <p className="py-10 text-center text-sm text-muted-foreground">Loading ad settings…</p>;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="inline-flex items-center gap-2">
          <Megaphone className="h-4 w-4 text-primary" /> Advertising
        </CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <div className="flex items-center gap-3 sm:col-span-2">
          <Switch id="ads-enabled" checked={enabled} onCheckedChange={setEnabled} />
          <Label htmlFor="ads-enabled" className="text-sm font-normal text-muted-foreground">
            Show advertisements on the blog
          </Label>
        </div>

        <div className="sm:col-span-2">
          <Label>Google AdSense publisher ID</Label>
          <Input value={publisher} onChange={(e) => setPublisher(e.target.value)} placeholder="ca-pub-1234567890123456" className="font-mono" />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Found at the top of your AdSense dashboard, under Account. It always starts with “ca-pub-”.
          </p>
        </div>

        {FIELDS.map((f) => (
          <div key={f.key}>
            <Label>{f.label}</Label>
            <Input
              value={slots[f.key] ?? ""}
              onChange={(e) => setSlots((prev) => ({ ...prev, [f.key]: e.target.value }))}
              placeholder="1234567890"
              inputMode="numeric"
              className="font-mono"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">{f.hint}. Copy the number from ads.txt… sorry, from Ads → Ad units → the unit → “Get code”, the value in data-ad-slot.</p>
          </div>
        ))}

        <div className="flex items-center gap-3 sm:col-span-2">
          <Switch id="ads-signed-in" checked={showToSignedIn} onCheckedChange={setShowToSignedIn} />
          <Label htmlFor="ads-signed-in" className="text-sm font-normal text-muted-foreground">
            Also show ads to signed-in members (off keeps the app itself ad-free)
          </Label>
        </div>

        <div className="sm:col-span-2">
          <Label>Contact email shown on the About, Contact and Privacy pages</Label>
          <Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="hello@yourdomain.com" type="email" />
        </div>

        <div className="sm:col-span-2">
          <Button className="rounded-full" onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Save ad settings"}
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Ads only appear once the publisher ID and at least one ad unit ID are saved and advertising is switched on. New
            AdSense placements can take a few hours to start filling.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

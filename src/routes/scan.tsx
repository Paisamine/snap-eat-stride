import { createFileRoute, Link } from "@tanstack/react-router";
import logoAsset from "@/assets/logo.png.asset.json";
import { ScanView } from "@/components/scan-view";
import { GuestBottomNav } from "@/components/guest-nav";

export const Route = createFileRoute("/scan")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Free Food Calorie Scanner — Calorie Count" },
      { name: "description", content: "Snap a food photo and instantly see calories, macros, and how long your body takes to burn it. No login needed." },
      { property: "og:title", content: "Free Food Calorie Scanner — Calorie Count" },
      { property: "og:description", content: "Photo khinchiye, calories turant jaaniye. No login." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-2">
          <img src={logoAsset.url} alt="Calorie Count logo" className="h-8 w-8 rounded-full object-contain" />
          <span className="font-bold">Calorie<span className="text-primary"> Count</span></span>
        </Link>
        <Link to="/auth" className="text-sm font-medium text-primary">Sign in</Link>
      </header>
      <main className="mx-auto max-w-4xl px-4 pb-10"><ScanView guest /></main>
      <GuestBottomNav />
    </div>
  ),
});

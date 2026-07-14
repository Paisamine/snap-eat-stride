import { createFileRoute, Outlet, redirect, Link, useLocation, useRouter } from "@tanstack/react-router";
import { Home, History, User, Camera, Salad, LogOut, Moon, Sun } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "@/components/theme-provider";
import { useQueryClient } from "@tanstack/react-query";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    return { user: data.user };
  },
  component: AppShell,
});

function AppShell() {
  const location = useLocation();
  const router = useRouter();
  const qc = useQueryClient();
  const { theme, toggle } = useTheme();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  }

  const nav: Array<{ to: string; label: string; icon: any; primary?: boolean }> = [
    { to: "/home", label: "Home", icon: Home },
    { to: "/analyze", label: "Scan", icon: Camera, primary: true },
    { to: "/history", label: "History", icon: History },
    { to: "/profile", label: "Profile", icon: User },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/80 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <Link to="/home" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-soft">
              <Salad className="h-4 w-4" />
            </div>
            <span className="font-bold tracking-tight">CalorieSnap<span className="text-primary">AI</span></span>
          </Link>
          <div className="flex items-center gap-1">
            <button onClick={toggle} aria-label="Toggle theme" className="grid h-9 w-9 place-items-center rounded-full hover:bg-accent">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <button onClick={signOut} aria-label="Sign out" className="grid h-9 w-9 place-items-center rounded-full hover:bg-accent">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 pb-28 pt-4">
        <Outlet />
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-around px-4 py-2">
          {nav.map((item) => {
            const active = location.pathname.startsWith(item.to);
            const Icon = item.icon;
            if (item.primary) {
              return (
                <Link key={item.to} to={item.to as any} className="-mt-6 grid h-14 w-14 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow transition-transform hover:scale-105">
                  <Icon className="h-6 w-6" />
                </Link>
              );
            }
            return (
              <Link key={item.to} to={item.to as any} className={`flex flex-col items-center gap-0.5 rounded-xl px-4 py-1.5 text-xs transition ${active ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

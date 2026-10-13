import { Link, useLocation } from "@tanstack/react-router";
import { Home, Utensils, Camera, BookOpen, User } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Bottom bar for visitors who are not signed in. Hidden for signed-in users (they have the app bar). */
export function GuestBottomNav() {
  const location = useLocation();
  const [guest, setGuest] = useState(false);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setGuest(!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setGuest(!s));
    return () => sub.subscription.unsubscribe();
  }, []);
  if (!guest) return null;

  const nav = [
    { to: "/", label: "Home", icon: Home },
    { to: "/diet-preview", label: "Diet", icon: Utensils },
    { to: "/scan", label: "Scan", icon: Camera, primary: true },
    { to: "/blog", label: "Blog", icon: BookOpen },
    { to: "/auth", label: "Sign in", icon: User },
  ] as const;

  return (
    <>
      <div className="h-20" aria-hidden />
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center justify-around px-4 py-2">
          {nav.map((item) => {
            const Icon = item.icon;
            const active = item.to === "/" ? location.pathname === "/" : location.pathname.startsWith(item.to);
            if ("primary" in item) {
              return (
                <Link key={item.to} to={item.to} aria-label={item.label} className="-mt-6 grid h-14 w-14 place-items-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow">
                  <Icon className="h-6 w-6" />
                </Link>
              );
            }
            return (
              <Link key={item.to} to={item.to} className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-xs ${active ? "text-primary" : "text-muted-foreground"}`}>
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}

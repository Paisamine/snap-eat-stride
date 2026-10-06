import logoAsset from "@/assets/logo.png.asset.json";
import { Link } from "@tanstack/react-router";
import { Coffee, Moon, Sun, Rss } from "lucide-react";
import type { ReactNode } from "react";
import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";

export function BlogShell({ children }: { children: ReactNode }) {
  const { theme, toggle } = useTheme();
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 border-b border-border/70 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoAsset.url} alt="Calorie Count logo" className="h-9 w-9 rounded-full object-contain" />
            <span className="font-bold tracking-tight">
              Calorie<span className="text-primary"> Count</span>
            </span>
          </Link>
          <nav className="flex items-center gap-1">
            <Link to="/blog" className="hidden rounded-full px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground sm:block">
              Blog
            </Link>
            <a href="/rss.xml" aria-label="RSS feed" className="grid h-9 w-9 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground">
              <Rss className="h-4 w-4" />
            </a>
            <button onClick={toggle} aria-label="Toggle theme" className="grid h-9 w-9 place-items-center rounded-full hover:bg-accent">
              {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link to="/home">
              <Button size="sm" className="rounded-full">Open app</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 pb-20 pt-6 md:px-6">{children}</main>

      <footer className="border-t border-border/70 py-8">
        <div className="mx-auto max-w-6xl space-y-3 px-4 text-xs text-muted-foreground md:px-6">
          <p>
            This content is provided for general educational purposes and is not a substitute for professional medical or dietary advice.
          </p>
          <p>
            © {new Date().getFullYear()} Calorie Count · <Link to="/blog" className="underline">Health &amp; Nutrition Blog</Link> ·{" "}
            <a href="/rss.xml" className="underline">RSS</a> · <Link to="/about" className="underline">About</Link> ·{" "}
            <Link to="/contact" className="underline">Contact</Link> · <Link to="/privacy" className="underline">Privacy</Link> ·{" "}
            <Link to="/blog-admin" className="underline">Editor tools</Link>
          </p>
        </div>
      </footer>
    </div>
  );
}

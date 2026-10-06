import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { Mail, Send, CheckCircle2 } from "lucide-react";
import { BlogShell } from "@/components/blog/blog-shell";
import { getAdSettings, submitContactMessage } from "@/lib/blog.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/contact")({
  loader: () => getAdSettings(),
  head: () => ({
    meta: [
      { title: "Contact Calorie Count" },
      { name: "description", content: "Send Calorie Count a message about the calorie scanner, diet plans, the blog, or your account and data." },
      { property: "og:title", content: "Contact Calorie Count" },
      { property: "og:description", content: "Questions, corrections and account or data requests — tell us what you need." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const settings = Route.useLoaderData();
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bot, setBot] = useState("");

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const form = new FormData(e.currentTarget);
    try {
      await submitContactMessage({
        data: {
          name: String(form.get("name") ?? ""),
          email: String(form.get("email") ?? ""),
          subject: String(form.get("subject") ?? "") || undefined,
          message: String(form.get("message") ?? ""),
          honeypot: bot,
        },
      });
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The message could not be sent. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <BlogShell>
      <div className="mx-auto max-w-2xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <Mail className="h-3.5 w-3.5" /> Contact
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Get in touch</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Corrections to an article, a feature you want, or a request about your own data — all of it lands in the same inbox.
        </p>

        {sent ? (
          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-primary/30 bg-primary/10 p-5">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
            <div>
              <p className="font-semibold">Thank you — your message is in.</p>
              <p className="mt-1 text-sm text-muted-foreground">
                We read everything and reply within a few working days.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="mt-8 space-y-4 rounded-3xl border border-border/70 bg-card p-5 sm:p-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="name">Your name</Label>
                <Input id="name" name="name" required minLength={2} maxLength={80} placeholder="Full name" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required maxLength={160} placeholder="you@example.com" />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" name="subject" maxLength={120} placeholder="Article correction, feature request, my data…" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" name="message" required minLength={10} maxLength={4000} rows={6} placeholder="Tell us what you need" />
            </div>
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              value={bot}
              onChange={(e) => setBot(e.target.value)}
              className="pointer-events-none absolute left-[-9999px] h-0 w-0 opacity-0"
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit" disabled={busy} className="rounded-full">
              <Send className="mr-2 h-4 w-4" />
              {busy ? "Sending…" : "Send message"}
            </Button>
          </form>
        )}

        <div className="mt-6 space-y-2 text-sm text-muted-foreground">
          <p>
            Prefer email?{" "}
            {settings?.contact_email ? (
              <a href={`mailto:${settings.contact_email}`} className="text-primary underline">
                {settings.contact_email}
              </a>
            ) : (
              "This form is the fastest route — we answer within a few working days."
            )}
          </p>
          <p>
            For a copy or deletion of your own account data, mention the email address you signed up with so we can find your
            records.
          </p>
        </div>
      </div>
    </BlogShell>
  );
}

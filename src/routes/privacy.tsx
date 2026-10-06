import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { BlogShell } from "@/components/blog/blog-shell";
import { getAdSettings } from "@/lib/blog.functions";

export const Route = createFileRoute("/privacy")({
  loader: () => getAdSettings(),
  head: () => ({
    meta: [
      { title: "Privacy Policy — Calorie Count" },
      { name: "description", content: "How Calorie Count collects, stores and protects your account, health profile and food scan data, and how advertising cookies work on this site." },
      { property: "og:title", content: "Privacy Policy — Calorie Count" },
      { property: "og:description", content: "What we collect, why we collect it and how to get your data removed." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "index, follow" },
    ],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const settings = Route.useLoaderData();
  const email = settings?.contact_email;

  return (
    <BlogShell>
      <article className="mx-auto max-w-3xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <ShieldCheck className="h-3.5 w-3.5" /> Privacy
        </div>
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Privacy Policy</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated: {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</p>

        <div className="prose-blog mt-8 space-y-6 text-sm leading-relaxed text-foreground/90">
          <p>
            Calorie Count is a health and nutrition tool. This policy explains what we record, why we record it and what you can
            ask us to do with it. We do not sell your personal data.
          </p>

          <section>
            <h2 className="text-lg font-bold">What we collect</h2>
            <ul className="mt-2 list-disc space-y-1.5 pl-5">
              <li><strong>Account details</strong> — your email address and, if you sign in with Google or Apple, the name and profile picture those services share.</li>
              <li><strong>Health profile</strong> — the numbers you choose to enter: age, height, weight, body measurements, activity level, sleep, occupation, smoking and alcohol answers, country, dietary preferences, goals, and any allergies or medical conditions you tell us about.</li>
              <li><strong>Food scans</strong> — the photo you upload and the calorie estimate we return for it.</li>
              <li><strong>Weight check-ins and meal plans</strong> — the entries you save so your progress can be charted.</li>
              <li><strong>Blog reading data</strong> — which article was opened, when it was opened and the site it was referred from. This is counted per article, not linked to a named person.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-bold">Why we collect it</h2>
            <p className="mt-2">
              To calculate your calorie and step targets, build meal plans, show your progress over time and keep your saved data
              available when you sign in again. We do not use your health answers to train models or to build advertising profiles.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">Where it is stored</h2>
            <p className="mt-2">
              Your data is kept in a managed PostgreSQL database with row-level access rules, so an account can only read its own
              rows. Scan photos are held in private storage that is not publicly listed. Access is over HTTPS.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">Advertising</h2>
            <p className="mt-2">
              This site may show advertising served by Google AdSense. AdSense uses cookies to choose ads based on your previous
              visits to this or other websites, and it may adjust the ads you see without storing anything you type into the app.
              Your weight, calorie and health entries are never passed to an advertiser.
            </p>
            <p className="mt-2">
              You can stop personalised advertising at any time on Google's Ads Settings page
              (https://www.google.com/settings/ads), and you can opt out of personalised cookies at
              https://www.aboutads.info/choices. You can also block cookies in your browser settings; the calculator and scanner
              still work without advertising cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">Third parties</h2>
            <p className="mt-2">
              We use a small number of processors: the database and file storage that run the app, the artificial-intelligence
              service that reads your food photo and writes draft articles, and the advertising network named above. Food photos
              are sent to the AI provider only to produce your estimate.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">Children</h2>
            <p className="mt-2">
              The app is written for adults. It is not intended for people under 18, and we do not knowingly collect their data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">Your choices</h2>
            <p className="mt-2">
              You can edit or clear your profile and delete your check-ins and scans from inside the app. To have your whole
              account and everything attached to it removed, ask us and we will do it.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">Health disclaimer</h2>
            <p className="mt-2 rounded-2xl border border-border/70 bg-card p-4">
              This content is provided for general educational purposes and is not a substitute for professional medical or
              dietary advice.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold">Contact</h2>
            <p className="mt-2">
              Questions about this policy or your data: use the{" "}
              <a href="/contact" className="text-primary underline">contact page</a>
              {email ? <> or write to <a href={`mailto:${email}`} className="text-primary underline">{email}</a></> : null}.
            </p>
          </section>
        </div>
      </article>
    </BlogShell>
  );
}

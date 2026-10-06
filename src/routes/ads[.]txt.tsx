import { createFileRoute } from "@tanstack/react-router";

const ADS_TXT = "google.com, pub-2781157986167878, DIRECT, f08c47fec0942fa0\n";

export const Route = createFileRoute("/ads.txt")({
  server: {
    handlers: {
      GET: () =>
        new Response(ADS_TXT, {
          headers: { "Content-Type": "text/plain; charset=utf-8" },
        }),
    },
  },
});

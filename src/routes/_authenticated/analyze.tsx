import { createFileRoute } from "@tanstack/react-router";
import { ScanView } from "@/components/scan-view";

export const Route = createFileRoute("/_authenticated/analyze")({
  ssr: false,
  component: () => <ScanView />,
});


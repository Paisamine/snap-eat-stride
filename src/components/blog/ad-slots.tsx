import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AdSettings = {
  enabled: boolean;
  publisher_id: string | null;
  slot_header: string | null;
  slot_in_article: string | null;
  slot_footer: string | null;
  slot_sidebar: string | null;
  show_to_signed_in: boolean;
  contact_email: string | null;
};

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

let scriptRequested = false;

function ensureAdScript(publisherId: string) {
  if (scriptRequested) return;
  scriptRequested = true;
  const tag = document.createElement("script");
  tag.async = true;
  tag.crossOrigin = "anonymous";
  tag.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(publisherId)}`;
  document.head.appendChild(tag);
}

function useSignedIn() {
  const [signedIn, setSignedIn] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let alive = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!alive) return;
        setSignedIn(Boolean(data.session));
        setChecked(true);
      })
      .catch(() => alive && setChecked(true));
    return () => {
      alive = false;
    };
  }, []);

  return { signedIn, checked };
}

type AdSlotProps = {
  settings: AdSettings | null | undefined;
  slot: string | null | undefined;
  format?: string;
  className?: string;
};

/**
 * Renders one Google AdSense unit. Nothing is requested until the visitor's
 * session is known and ads are switched on in the admin panel, so signed-in
 * users can be excluded and no ad code loads while ads are off.
 */
export function AdSlot({ settings, slot, format = "auto", className }: AdSlotProps) {
  const { signedIn, checked } = useSignedIn();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!checked) return;
    const allowed =
      Boolean(settings?.enabled) &&
      Boolean(settings?.publisher_id) &&
      Boolean(slot) &&
      (settings?.show_to_signed_in || !signedIn);
    if (!allowed) return;
    ensureAdScript(settings!.publisher_id!);
    setVisible(true);
  }, [checked, signedIn, settings, slot]);

  useEffect(() => {
    if (!visible) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch {
      /* ad network unavailable — page continues without an ad */
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <div className={`space-y-1.5 ${className ?? ""}`}>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground/70">Advertisement</p>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={settings!.publisher_id!}
        data-ad-slot={slot!}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  );
}

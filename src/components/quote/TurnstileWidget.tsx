"use client";

import { useEffect, useRef } from "react";

/**
 * Cloudflare Turnstile widget (explicit render, dependency-free).
 *
 * The official script is loaded on demand from challenges.cloudflare.com
 * and rendered with `?render=explicit` so we control the mount point.
 * Rendered ONLY when a site key exists (see QuoteFormWizard: without a
 * key the form shows a discreet "anti-bot not configured" badge instead).
 */

interface TurnstileWindowApi {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileWindowApi;
  }
}

const TURNSTILE_SCRIPT_URL =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

export function TurnstileWidget({
  siteKey,
  onTokenChange,
}: {
  siteKey: string;
  onTokenChange: (token: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let cancelled = false;

    const renderWidget = () => {
      if (cancelled || !window.turnstile || !containerRef.current) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme: "dark",
        callback: (token: string) => onTokenChange(token),
        "expired-callback": () => onTokenChange(""),
        "error-callback": () => onTokenChange(""),
      });
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      const script = document.createElement("script");
      script.src = TURNSTILE_SCRIPT_URL;
      script.async = true;
      script.onload = renderWidget;
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
        widgetIdRef.current = null;
      }
      // The script tag is shared/removable; leaving it in the DOM is safe
      // (loading is idempotent thanks to ?render=explicit).
    };
  }, [siteKey, onTokenChange]);

  return (
    <div
      ref={containerRef}
      aria-label="Verifica anti-bot"
      data-testid="turnstile-widget"
    />
  );
}
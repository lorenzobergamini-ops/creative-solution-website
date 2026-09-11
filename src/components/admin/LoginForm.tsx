"use client";

/**
 * Admin login form (milestone M5).
 *
 * Email + password against Supabase Auth (signInWithPassword — NO signup is
 * ever offered: admin accounts are created manually by the owner). On success
 * it navigates to the ?next= return path (or /admin). If the user is already
 * authenticated it redirects to /admin immediately.
 *
 * Degradation without credentials: the form is still displayed with an
 * honest notice — submitting shows "configurazione non disponibile".
 */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CubeMark } from "@/components/icons";
import { AdminAlert } from "@/components/admin/admin-ui";
import {
  ADMIN_CONFIG_UNAVAILABLE_MESSAGE,
  getSupabaseAdminBrowserClient,
} from "@/lib/supabase/admin-client";
import { useEffect } from "react";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();

  // Already authenticated → straight to the panel (client-side check; the
  // matcher keeps /admin/login reachable even when logged in).
  useEffect(() => {
    const supabase = getSupabaseAdminBrowserClient();
    if (!supabase) return;
    let cancelled = false;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!cancelled && data.session) {
          router.replace(nextPath);
        }
      })
      .catch(() => {
        // Session check failed (network) — let the user try to sign in.
      });
    return () => {
      cancelled = true;
    };
  }, [router, nextPath]);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const supabase = getSupabaseAdminBrowserClient();
    if (!supabase) {
      setError(ADMIN_CONFIG_UNAVAILABLE_MESSAGE);
      return;
    }

    startSubmit(async () => {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError(
          signInError.message?.toLowerCase().includes("invalid login")
            ? "Credenziali non valide. Controlla email e password."
            : "Accesso non riuscito. Riprova tra poco.",
        );
        return;
      }
      router.replace(nextPath);
      router.refresh();
    });
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-start justify-center px-5 py-12 md:py-20">
      <div className="w-full max-w-md">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center border border-border text-accent">
            <CubeMark className="h-6 w-6" />
          </span>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Pannello di amministrazione
          </h1>
          <p className="text-sm text-muted">
            Accesso riservato al personale di Creative Solution.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-5 border border-border bg-surface p-7"
          noValidate
        >
          <div className="flex flex-col gap-2">
            <label htmlFor="admin-email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="admin-email"
              name="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="h-12 w-full border border-border bg-background px-4 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-0"
              placeholder="nome@esempio.it"
            />
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="admin-password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 w-full border border-border bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-0"
              placeholder="••••••••"
            />
          </div>

          {error ? <AdminAlert tone="error">{error}</AdminAlert> : null}

          <button
            type="submit"
            disabled={submitting}
            className="inline-flex h-12 items-center justify-center bg-accent px-6 font-display text-sm font-semibold uppercase tracking-[0.15em] text-background transition-colors hover:bg-foreground disabled:opacity-60"
          >
            {submitting ? "Accesso in corso…" : "Accedi"}
          </button>

          <p className="text-xs leading-relaxed text-muted">
            Non esiste una registrazione pubblica: gli account vengono creati
            manualmente dal proprietario.
          </p>
        </form>

        <div className="mt-6 text-center">
          <Link href="/" className="text-sm text-muted underline-offset-4 hover:text-accent hover:underline">
            Torna al sito pubblico
          </Link>
        </div>
      </div>
    </div>
  );
}
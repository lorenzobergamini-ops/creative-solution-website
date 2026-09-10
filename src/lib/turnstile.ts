/**
 * Cloudflare Turnstile — server-side token verification.
 *
 * Dev mode: when TURNSTILE_SECRET_KEY is not set, verification is skipped and
 * { success: true, debug: "not-configured" } is returned, documented as DEV
 * ONLY. TODO(M6): before production, enforce verification (fail closed) and
 * remove the bypass.
 */

export interface TurnstileVerification {
  success: boolean;
  /** Present only in dev mode: "not-configured". */
  debug?: string;
  /** Cloudflare error codes when verification fails (see Turnstile docs). */
  errorCodes?: string[];
}

const SITEVERIFY_URL =
  "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export function isTurnstileConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

export async function verifyTurnstileToken(
  token: string | null | undefined,
): Promise<TurnstileVerification> {
  // DEV ONLY — bypass when the secret is missing (local development / CI
  // without credentials). The client shows a "not configured" badge; the
  // server mirrors the configuration state.
  if (!isTurnstileConfigured()) {
    return { success: true, debug: "not-configured" };
  }

  if (!token || token.length === 0) {
    return { success: false, errorCodes: ["missing-input-response"] };
  }

  const body = new URLSearchParams({
    secret: process.env.TURNSTILE_SECRET_KEY!,
    response: token,
  });

  let response: Response;
  try {
    response = await fetch(SITEVERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
  } catch {
    return { success: false, errorCodes: ["network-error"] };
  }

  if (!response.ok) {
    return { success: false, errorCodes: [`http-${response.status}`] };
  }

  const data = (await response.json()) as {
    success?: boolean;
    "error-codes"?: string[];
  };
  return {
    success: Boolean(data.success),
    errorCodes: data["error-codes"] ?? [],
  };
}
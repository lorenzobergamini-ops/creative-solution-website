import type { Metadata } from "next";
import { LoginForm } from "@/components/admin/LoginForm";

export const metadata: Metadata = {
  title: "Accedi",
  description: "Accesso al pannello di amministrazione Creative Solution.",
};

/**
 * /admin/login — server page that only extracts the ?next= return path and
 * renders the client login form. The page is intentionally OUTSIDE the
 * (panel) layout: no sidebar, no auth gate (it IS the gate).
 */
export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const nextPath =
    typeof next === "string" &&
    (next.startsWith("/admin") || next === "/") &&
    !next.startsWith("//")
      ? next
      : "/admin";

  return <LoginForm nextPath={nextPath} />;
}
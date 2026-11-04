"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type AuthMode = "login" | "register";

export function AuthForm({ mode }: { mode: AuthMode }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isRegister = mode === "register";

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    const form = new FormData(event.currentTarget);
    const payload = isRegister
      ? { name: String(form.get("name") || ""), email: String(form.get("email") || ""), password: String(form.get("password") || ""), businessName: String(form.get("businessName") || "") }
      : { email: String(form.get("email") || ""), password: String(form.get("password") || "") };

    try {
      const response = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error || "We could not complete your request. Please try again.");
        return;
      }
      router.push(result.redirectTo || "/dashboard");
      router.refresh();
    } catch {
      setError("Unable to connect right now. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="form-card">
      <h2>{isRegister ? "Create your account" : "Welcome back"}</h2>
      <p className="form-note">{isRegister ? "Create your workspace with a secure password. Passwords must contain at least 12 characters." : "Sign in to continue to your commerce workspace."}</p>
      <form onSubmit={submit}>
        {isRegister && <>
          <label htmlFor="name">Your name</label>
          <input id="name" name="name" autoComplete="name" minLength={2} maxLength={80} required />
          <label htmlFor="businessName">Business / store name</label>
          <input id="businessName" name="businessName" autoComplete="organization" minLength={2} maxLength={100} required />
        </>}
        <label htmlFor="email">Email address</label>
        <input id="email" name="email" type="email" autoComplete="email" maxLength={254} required />
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete={isRegister ? "new-password" : "current-password"} minLength={isRegister ? 12 : 1} maxLength={128} required />
        {error && <p role="alert" className="auth-error">{error}</p>}
        <button className="button button-primary" type="submit" disabled={busy}>{busy ? "Please wait..." : isRegister ? "Create workspace" : "Sign in"}</button>
      </form>
      <p className="form-note">{isRegister ? "Already registered? " : "New to Ecom-Flash? "}<Link href={isRegister ? "/login" : "/register"}>{isRegister ? "Sign in" : "Create an account"}</Link></p>
    </div>
  );
}

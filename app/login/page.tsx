"use client";

import { useState } from "react";
//import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AppNav from "@/components/AppNav";

type AuthMode = "login" | "signup";

export default function LoginPage() {
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isMagicLinkLoading, setIsMagicLinkLoading] = useState(false);

  async function handlePasswordAuth(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setStatusMessage("");
    setErrorMessage("");
    setIsLoading(true);

    try {
      if (authMode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          throw error;
        }

        window.location.href = "/dashboard";
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        throw error;
      }

      setStatusMessage(
        "Account created. Check your email to confirm your account if required, then log in."
      );
      setPassword("");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to authenticate"
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handlePasswordReset() {
    setStatusMessage("");
    setErrorMessage("");

    if (!email.trim()) {
      setErrorMessage("Enter your email before requesting a password reset.");
      return;
    }

    setIsMagicLinkLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setIsMagicLinkLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setStatusMessage("Check your email for a password reset link.");
  }

  async function handleMagicLinkLogin() {
    setStatusMessage("");
    setErrorMessage("");
    setIsMagicLinkLoading(true);

    if (!email.trim()) {
      setErrorMessage("Enter your email before requesting a magic link.");
      setIsMagicLinkLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    setIsMagicLinkLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setStatusMessage("Check your email for a login link.");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-md">
        <AppNav />

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h1 className="text-3xl font-bold">
            {authMode === "login" ? "Log In" : "Create Account"}
          </h1>

          <p className="mt-3 text-slate-300">
            {authMode === "login"
              ? "Log in with your email and password, or use a magic link."
              : "Create an account with your email and password. Supabase may ask you to confirm your email before logging in."}
          </p>

          <form onSubmit={handlePasswordAuth} className="mt-8 space-y-4">
            <div>
              <label htmlFor="email" className="text-sm font-medium text-slate-300">
                Email address
              </label>

              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-400"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="text-sm font-medium text-slate-300"
              >
                Password
              </label>

              <div className="relative mt-2">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 pr-20 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-400"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-white transition hover:text-slate-300"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading
                ? authMode === "login"
                  ? "Logging in..."
                  : "Creating account..."
                : authMode === "login"
                  ? "Log in"
                  : "Create account"}
            </button>
          </form>

          <div className="mt-5 space-y-3 border-t border-slate-800 pt-5">
            <button
              type="button"
              onClick={handleMagicLinkLogin}
              disabled={isMagicLinkLoading}
              className="w-full rounded-xl border border-slate-700 px-6 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isMagicLinkLoading ? "Sending..." : "Send magic link instead"}
            </button>

            {authMode === "login" && (
              <button
                type="button"
                onClick={handlePasswordReset}
                disabled={isMagicLinkLoading}
                className="w-full rounded-xl border border-slate-700 px-6 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Reset password
              </button>
            )}
          </div>

          <div className="mt-5 text-center text-sm text-slate-400">
            {authMode === "login" ? (
              <button
                type="button"
                onClick={() => {
                  setAuthMode("signup");
                  setStatusMessage("");
                  setErrorMessage("");
                }}
                className="text-white underline-offset-4 hover:underline"
              >
                Need an account? Create one
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setAuthMode("login");
                  setStatusMessage("");
                  setErrorMessage("");
                }}
                className="text-white underline-offset-4 hover:underline"
              >
                Already have an account? Log in
              </button>
            )}
          </div>

          {statusMessage && (
            <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-green-800 bg-green-950/50 p-3 text-sm text-green-200">
              <p>{statusMessage}</p>

              <button
                type="button"
                onClick={() => setStatusMessage("")}
                className="rounded-lg px-2 py-1 text-green-200 transition hover:bg-green-900/60"
                aria-label="Dismiss success message"
              >
                ×
              </button>
            </div>
          )}

          {errorMessage && (
            <div className="mt-4 flex items-center justify-between gap-4 rounded-xl border border-red-800 bg-red-950/50 p-3 text-sm text-red-200">
              <p>{errorMessage}</p>

              <button
                type="button"
                onClick={() => setErrorMessage("")}
                className="rounded-lg px-2 py-1 text-red-200 transition hover:bg-red-900/60"
                aria-label="Dismiss error message"
              >
                ×
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
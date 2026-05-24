"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AppNav from "@/components/AppNav";

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function checkSession() {
      const { data } = await supabase.auth.getSession();

      setHasSession(Boolean(data.session));
      setIsCheckingSession(false);
    }

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
        (event, session) => {
            if (event === "PASSWORD_RECOVERY") {
                sessionStorage.setItem("password_reset_required", "true");
            }

            setHasSession(Boolean(session));
            setIsCheckingSession(false);
        }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  async function handleResetPassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setStatusMessage("");
    setErrorMessage("");

    if (newPassword.length < 6) {
      setErrorMessage("Password must be at least 6 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsUpdating(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      sessionStorage.removeItem("password_reset_required");
      setNewPassword("");
      setConfirmPassword("");
      setStatusMessage("Password updated. You can now go to your dashboard.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to update password"
      );
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleCancelReset() {
    sessionStorage.removeItem("password_reset_required");
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-md">
        <AppNav />

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
          <h1 className="text-3xl font-bold">Reset Password</h1>

          <p className="mt-3 text-slate-300">
            Enter a new password for your Steam Sale Watcher account.
          </p>

          {isCheckingSession && (
            <p className="mt-6 text-sm text-slate-400">
              Checking reset session...
            </p>
          )}

          {!isCheckingSession && !hasSession && (
            <div className="mt-6 rounded-xl border border-red-800 bg-red-950/50 p-3 text-sm text-red-200">
              This reset link is invalid, expired, or has already been used.
              Request a new password reset link from the login page.
            </div>
          )}

          {!isCheckingSession && hasSession && (
            <form onSubmit={handleResetPassword} className="mt-8 space-y-4">
              <div>
                <label
                  htmlFor="newPassword"
                  className="text-sm font-medium text-slate-300"
                >
                  New password
                </label>

                <div className="relative mt-2">
                  <input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 pr-20 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-400"
                  />

                  <button
                    type="button"
                    onClick={() => setShowNewPassword((current) => !current)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-white transition hover:text-slate-300"
                  >
                    {showNewPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <div>
                <label
                  htmlFor="confirmPassword"
                  className="text-sm font-medium text-slate-300"
                >
                  Confirm password
                </label>

                <div className="relative mt-2">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Re-enter password"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 pr-20 text-white outline-none transition placeholder:text-slate-500 focus:border-slate-400"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      setShowConfirmPassword((current) => !current)
                    }
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-white transition hover:text-slate-300"
                  >
                    {showConfirmPassword ? "Hide" : "Show"}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCancelReset}
                className="mt-5 rounded-xl border border-slate-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Cancel reset and sign out
              </button>

              <button
                type="submit"
                disabled={isUpdating}
                className="w-full rounded-xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isUpdating ? "Updating password..." : "Update password"}
              </button>
            </form>
          )}

          {statusMessage && (
            <div className="mt-4 rounded-xl border border-green-800 bg-green-950/50 p-3 text-sm text-green-200">
              <p>{statusMessage}</p>

              <Link
                href="/dashboard"
                className="mt-3 inline-block font-semibold text-white underline-offset-4 hover:underline"
              >
                Go to dashboard
              </Link>
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
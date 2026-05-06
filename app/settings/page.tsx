"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import AppNav from "@/components/AppNav";

type EmailAlertFrequency = "immediate" | "daily_digest" | "off";
type DefaultAlertType = "target_price" | "target_discount";
type DefaultHistoryRange = "1w" | "1m" | "3m" | "6m" | "1y" | "all";
type DisplayTimeZone =
  | "auto"
  | "UTC"
  | "America/New_York"
  | "America/Chicago"
  | "America/Denver"
  | "America/Los_Angeles"
  | "America/Phoenix"
  | "America/Anchorage"
  | "Pacific/Honolulu"
  | "Europe/London"
  | "Europe/Paris"
  | "Asia/Tokyo"
  | "Australia/Sydney";

type UserSettings = {
  email_alert_frequency: EmailAlertFrequency;
  default_alert_type: DefaultAlertType;
  default_history_range: DefaultHistoryRange;
  display_time_zone: DisplayTimeZone;
  hide_dlc: boolean;
  hide_soundtracks: boolean;
  hide_demos: boolean;
  hide_extras: boolean;
};

export default function SettingsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  const [settings, setSettings] = useState<UserSettings>({
    email_alert_frequency: "immediate",
    default_alert_type: "target_price",
    default_history_range: "1m",
    display_time_zone: "auto",
    hide_dlc: true,
    hide_soundtracks: true,
    hide_demos: true,
    hide_extras: true,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    async function loadSessionAndSettings() {
      setIsLoading(true);
      setErrorMessage("");

      const { data } = await supabase.auth.getSession();
      const sessionUser = data.session?.user;

      if (!sessionUser) {
        setUserId(null);
        setUserEmail(null);
        setIsLoading(false);
        return;
      }

      setUserId(sessionUser.id);
      setUserEmail(sessionUser.email ?? null);

      try {
        const response = await fetch(`/api/settings?userId=${sessionUser.id}`);
        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error ?? "Unable to load settings");
        }

        setSettings({
          email_alert_frequency: result.settings.email_alert_frequency,
          default_alert_type: result.settings.default_alert_type,
          default_history_range: result.settings.default_history_range,
          display_time_zone: result.settings.display_time_zone ?? "auto",
          hide_dlc: result.settings.hide_dlc,
          hide_soundtracks: result.settings.hide_soundtracks,
          hide_demos: result.settings.hide_demos,
          hide_extras: result.settings.hide_extras,
        });
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Unable to load settings"
        );
      } finally {
        setIsLoading(false);
      }
    }

    loadSessionAndSettings();
  }, []);

  async function handleSaveSettings() {
    setStatusMessage("");
    setErrorMessage("");

    if (!userId) {
      setErrorMessage("Please log in before changing settings.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userId,
          emailAlertFrequency: settings.email_alert_frequency,
          defaultAlertType: settings.default_alert_type,
          defaultHistoryRange: settings.default_history_range,
          displayTimeZone: settings.display_time_zone,
          hideDlc: settings.hide_dlc,
          hideSoundtracks: settings.hide_soundtracks,
          hideDemos: settings.hide_demos,
          hideExtras: settings.hide_extras,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to save settings");
      }

      setStatusMessage("Settings saved.");
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Unable to save settings"
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <section className="mx-auto max-w-3xl">
        <div className="flex items-center justify-between gap-4">
          <AppNav />
        </div>

        <div className="mt-8">
          <p className="text-sm text-slate-400">
            {userEmail ? `Logged in as ${userEmail}` : "Not logged in"}
          </p>

          <h1 className="mt-3 text-3xl font-bold">Settings</h1>
          <p className="mt-3 text-slate-300">
            Control your alert emails, default watchlist behavior, price history
            range, and Steam search filters.
          </p>
        </div>

        {isLoading && (
          <p className="mt-8 text-sm text-slate-400">Loading settings...</p>
        )}

        {!isLoading && !userId && (
          <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">Log in required</h2>
            <p className="mt-2 text-slate-400">
              You need to log in before changing settings.
            </p>

            <Link
              href="/login"
              className="mt-5 inline-block rounded-xl bg-white px-5 py-2 font-semibold text-slate-950 transition hover:bg-slate-200"
            >
              Log in
            </Link>
          </div>
        )}

        {!isLoading && userId && (
          <div className="mt-8 space-y-6">
            {statusMessage && (
              <div className="flex items-center justify-between gap-4 rounded-xl border border-green-800 bg-green-950/50 p-3 text-sm text-green-200">
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
              <div className="flex items-center justify-between gap-4 rounded-xl border border-red-800 bg-red-950/50 p-3 text-sm text-red-200">
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

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-xl font-semibold">Email alerts</h2>
              <p className="mt-2 text-sm text-slate-400">
                Choose how you want to receive deal emails. Dashboard alerts
                still appear even when email is turned off.
              </p>

              <select
                value={settings.email_alert_frequency}
                onChange={(event) =>
                  setSettings((current) => ({
                    ...current,
                    email_alert_frequency:
                      event.target.value as EmailAlertFrequency,
                  }))
                }
                className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-slate-400"
              >
                <option value="immediate">Immediate email alerts</option>
                <option value="daily_digest">Daily digest email</option>
                <option value="off">No email alerts</option>
              </select>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-xl font-semibold">Defaults</h2>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-300">
                    Default alert type
                  </label>
                  <select
                    value={settings.default_alert_type}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        default_alert_type:
                          event.target.value as DefaultAlertType,
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-slate-400"
                  >
                    <option value="target_price">Target price</option>
                    <option value="target_discount">Discount percent</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-300">
                    Default price history range
                  </label>
                  <select
                    value={settings.default_history_range}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        default_history_range:
                          event.target.value as DefaultHistoryRange,
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-slate-400"
                  >
                    <option value="1w">1 week</option>
                    <option value="1m">1 month</option>
                    <option value="3m">3 months</option>
                    <option value="6m">6 months</option>
                    <option value="1y">1 year</option>
                    <option value="all">All time</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300">
                    Display time zone
                  </label>
                  <select
                    value={settings.display_time_zone}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        display_time_zone: event.target.value as DisplayTimeZone,
                      }))
                    }
                    className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-slate-400"
                  >
                    <option value="auto">Auto-detect from browser</option>
                    <option value="UTC">UTC</option>
                    <option value="America/New_York">Eastern Time (ET)</option>
                    <option value="America/Chicago">Central Time (CT)</option>
                    <option value="America/Denver">Mountain Time (MT)</option>
                    <option value="America/Los_Angeles">Pacific Time (PT)</option>
                    <option value="America/Phoenix">Arizona Time (MST)</option>
                    <option value="America/Anchorage">Alaska Time (AKT)</option>
                    <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
                    <option value="Europe/London">UK Time (GMT/BST)</option>
                    <option value="Europe/Paris">Central European Time (CET/CEST)</option>
                    <option value="Asia/Tokyo">Japan Time (JST)</option>
                    <option value="Australia/Sydney">Australian Eastern Time (AET)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-xl font-semibold">Default search filters</h2>
              <p className="mt-2 text-sm text-slate-400">
                These defaults can help keep Steam search results focused on
                base games.
              </p>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-3 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={settings.hide_dlc}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        hide_dlc: event.target.checked,
                      }))
                    }
                    className="h-4 w-4"
                  />
                  Hide DLC
                </label>

                <label className="flex items-center gap-3 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={settings.hide_soundtracks}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        hide_soundtracks: event.target.checked,
                      }))
                    }
                    className="h-4 w-4"
                  />
                  Hide soundtracks
                </label>

                <label className="flex items-center gap-3 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={settings.hide_demos}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        hide_demos: event.target.checked,
                      }))
                    }
                    className="h-4 w-4"
                  />
                  Hide demos
                </label>

                <label className="flex items-center gap-3 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={settings.hide_extras}
                    onChange={(event) =>
                      setSettings((current) => ({
                        ...current,
                        hide_extras: event.target.checked,
                      }))
                    }
                    className="h-4 w-4"
                  />
                  Hide extras
                </label>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="w-full rounded-xl bg-white px-6 py-3 font-semibold text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Save settings"}
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
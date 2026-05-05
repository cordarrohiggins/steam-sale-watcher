"use client";

import { useEffect, useState } from "react";

type CountdownType = "two-hour-check" | "daily-history";

type CheckCountdownProps = {
  type: CountdownType;
};

function getNextTwoHourCheck(now: Date) {
  const next = new Date(now);

  // GitHub Actions cron:
  // 15 */2 * * *
  // This means every even UTC hour at minute 15.
  next.setUTCMinutes(15, 0, 0);

  while (next <= now || next.getUTCHours() % 2 !== 0) {
    next.setUTCHours(next.getUTCHours() + 1);
    next.setUTCMinutes(15, 0, 0);
  }

  return next;
}

function getNextDailyHistoryCheck(now: Date) {
  // GitHub Actions daily cron should be:
  // 20 20 * * *
  // timezone: America/New_York
  //
  // This function calculates the next 8:20 PM Eastern time.
  const easternFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = easternFormatter.formatToParts(now);

  const getPart = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value);

  const easternYear = getPart("year");
  const easternMonth = getPart("month");
  const easternDay = getPart("day");
  const easternHour = getPart("hour");
  const easternMinute = getPart("minute");

  const hasPassedToday =
    easternHour > 20 || (easternHour === 20 && easternMinute >= 20);

  const targetEasternDate = new Date(
    Date.UTC(easternYear, easternMonth - 1, easternDay + (hasPassedToday ? 1 : 0), 20, 20, 0)
  );

  // Convert the intended Eastern wall-clock time into the user's real Date.
  const offsetFormatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    timeZoneName: "shortOffset",
  });

  const offsetPart = offsetFormatter
    .formatToParts(targetEasternDate)
    .find((part) => part.type === "timeZoneName")?.value;

  const match = offsetPart?.match(/GMT([+-]\d{1,2})/);
  const offsetHours = match ? Number(match[1]) : -4;

  return new Date(
    Date.UTC(
      easternYear,
      easternMonth - 1,
      easternDay + (hasPassedToday ? 1 : 0),
      20 - offsetHours,
      20,
      0
    )
  );
}

function formatTimeRemaining(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours}h ${minutes}m ${seconds}s`;
}

export default function CheckCountdown({ type }: CheckCountdownProps) {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const nextCheck =
    type === "daily-history"
      ? getNextDailyHistoryCheck(now)
      : getNextTwoHourCheck(now);

  const timeRemaining = nextCheck.getTime() - now.getTime();

  const title =
    type === "daily-history"
      ? "Next daily digest"
      : "Next scheduled price check";

  const description =
    type === "daily-history"
      ? "Daily digest runs around 8:20 PM Eastern. GitHub Actions may start a few minutes late."
      : "Scheduled price checks run every 2 hours around minute 15 and power alerts, prices, and deal updates.";

  const estimatedTime =
    type === "daily-history"
      ? nextCheck.toLocaleString("en-US", {
          timeZone: "America/New_York",
          dateStyle: "medium",
          timeStyle: "short",
        }) + " ET"
      : nextCheck.toLocaleString();

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-sm text-slate-400">{title}</p>

      <p className="mt-1 text-2xl font-semibold">
        {formatTimeRemaining(timeRemaining)}
      </p>

      <p className="mt-2 text-sm text-slate-400">
        Estimated time: {estimatedTime}
      </p>

      <p className="mt-2 text-xs text-slate-500">{description}</p>
    </div>
  );
}
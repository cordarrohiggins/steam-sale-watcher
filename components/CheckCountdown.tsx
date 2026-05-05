"use client";

import { useEffect, useState } from "react";

type CountdownType = "two-hour-check" | "daily-history" | "daily-discovery";

type CheckCountdownProps = {
  type: CountdownType;
};

function getNextTwoHourCheck(now: Date) {
  const next = new Date(now);

  next.setUTCMinutes(15, 0, 0);

  while (next <= now || next.getUTCHours() % 2 !== 0) {
    next.setUTCHours(next.getUTCHours() + 1);
    next.setUTCMinutes(15, 0, 0);
  }

  return next;
}

function getNextDailyHistoryCheck(now: Date) {
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

  const targetDay = easternDay + (hasPassedToday ? 1 : 0);

  const targetEasternDate = new Date(
    Date.UTC(easternYear, easternMonth - 1, targetDay, 20, 20, 0)
  );

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
      targetDay,
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
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const tick = () => {
      setNow(new Date());
    };

    tick();

    const intervalId = window.setInterval(tick, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const title =
    type === "daily-history"
      ? "Next daily history point"
      : type === "daily-discovery"
        ? "Next discovery deals refresh"
        : "Next scheduled price check";

  const description =
    type === "daily-history"
      ? "Daily digest runs once per day around 8:20 PM Eastern. GitHub Actions may start a few minutes late."
      : type === "daily-discovery"
        ? "Discovery deals refresh once per day around 8:20 PM Eastern from Steam Specials and only show games currently on sale."
        : "Scheduled price checks run every 2 hours around minute 15 and power alerts, prices, and deal updates.";

  if (!now) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
        <p className="text-sm text-slate-400">{title}</p>

        <p className="mt-1 text-2xl font-semibold">Loading...</p>

        <p className="mt-2 text-sm text-slate-400">
          Estimated time: calculating...
        </p>

        <p className="mt-2 text-xs text-slate-500">{description}</p>
      </div>
    );
  }

  const nextCheck =
    type === "daily-history" || type === "daily-discovery"
      ? getNextDailyHistoryCheck(now)
      : getNextTwoHourCheck(now);

  const timeRemaining = nextCheck.getTime() - now.getTime();

  const estimatedTime =
    type === "daily-history"
      ? nextCheck.toLocaleString("en-US", {
          timeZone: "America/New_York",
          dateStyle: "medium",
          timeStyle: "short",
        }) + " Eastern"
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
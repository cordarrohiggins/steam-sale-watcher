"use client";

import { useEffect, useState } from "react";

type CountdownType = "two-hour-check" | "daily-history";

type CheckCountdownProps = {
  type: CountdownType;
};

function getNextTwoHourCheck(now: Date) {
  const next = new Date(now);

  next.setUTCMinutes(0, 0, 0);

  while (next <= now || next.getUTCHours() % 2 !== 0) {
    next.setUTCHours(next.getUTCHours() + 1);
  }

  return next;
}

function getNextDailyHistoryCheck(now: Date) {
  const next = new Date(now);

  next.setUTCHours(24, 0, 0, 0);

  return next;
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
      ? "Next daily history point"
      : "Next scheduled price check";

  const description =
    type === "daily-history"
      ? "Price history saves one shared point per tracked game each UTC day."
      : "Scheduled price checks run every 2 hours and power alerts, prices, and deal updates.";

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-sm text-slate-400">{title}</p>

      <p className="mt-1 text-2xl font-semibold">
        {formatTimeRemaining(timeRemaining)}
      </p>

      <p className="mt-2 text-sm text-slate-400">
        Estimated time: {nextCheck.toLocaleString()}
      </p>

      <p className="mt-2 text-xs text-slate-500">{description}</p>
    </div>
  );
}
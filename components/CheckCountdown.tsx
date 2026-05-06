"use client";

import { useEffect, useState } from "react";

type CountdownType =
  | "price-check"
  | "two-hour-check"
  | "daily-history"
  | "daily-discovery"
  | "daily-digest";

type CheckCountdownProps = {
  type: CountdownType;
  displayTimeZone?: string;
};

function getNextTwoHourPriceCheck(now: Date) {
  const next = new Date(now);

  next.setUTCSeconds(0, 0);

  while (
    next <= now ||
    next.getUTCMinutes() !== 15 ||
    next.getUTCHours() % 2 !== 0
  ) {
    next.setUTCMinutes(next.getUTCMinutes() + 1);
  }

  return next;
}

function getEasternDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === "year")?.value),
    month: Number(parts.find((part) => part.type === "month")?.value),
    day: Number(parts.find((part) => part.type === "day")?.value),
  };
}

function getEasternOffsetHours(date: Date) {
  const offsetName = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    timeZoneName: "shortOffset",
  })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;

  const offsetMatch = offsetName?.match(/GMT([+-]\d+)/);

  return offsetMatch ? Number(offsetMatch[1]) : -5;
}

function getUtcDateForEasternTime({
  year,
  month,
  day,
  hour,
  minute,
}: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
}) {
  const noonUtcForEasternDate = new Date(
    Date.UTC(year, month - 1, day, 12, 0, 0)
  );

  const easternOffsetHours = getEasternOffsetHours(noonUtcForEasternDate);

  return new Date(
    Date.UTC(
      year,
      month - 1,
      day,
      hour - easternOffsetHours,
      minute,
      0,
      0
    )
  );
}

function getNextDailyEasternTime(
  now: Date,
  easternHour: number,
  easternMinute: number
) {
  const easternToday = getEasternDateParts(now);

  const todayTarget = getUtcDateForEasternTime({
    ...easternToday,
    hour: easternHour,
    minute: easternMinute,
  });

  if (todayTarget > now) {
    return todayTarget;
  }

  const easternTomorrowNoonUtc = new Date(
    Date.UTC(
      easternToday.year,
      easternToday.month - 1,
      easternToday.day + 1,
      12,
      0,
      0
    )
  );

  const easternTomorrow = getEasternDateParts(easternTomorrowNoonUtc);

  return getUtcDateForEasternTime({
    ...easternTomorrow,
    hour: easternHour,
    minute: easternMinute,
  });
}

function getResolvedTimeZone(displayTimeZone?: string) {
  if (!displayTimeZone || displayTimeZone === "auto") {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  return displayTimeZone;
}

function formatEstimatedTime(date: Date, displayTimeZone?: string) {
  const timeZone = getResolvedTimeZone(displayTimeZone);

  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone,
    timeZoneName: "short",
  }).format(date);
}

function formatTimeRemaining(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));

  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) {
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  }

  return `${hours}h ${minutes}m ${seconds}s`;
}

function getCountdownDetails(type: CountdownType, now: Date) {
  if (type === "price-check" || type === "two-hour-check") {
    return {
      nextCheck: getNextTwoHourPriceCheck(now),
      title: "Next scheduled price check",
      description:
        "Scheduled price checks run every 2 hours at the 15-minute mark and power alerts, prices, and deal updates. GitHub Actions may start a few minutes late.",
    };
  }

  if (type === "daily-discovery") {
    return {
      nextCheck: getNextDailyEasternTime(now, 20, 40),
      title: "Next discovery deals refresh",
      description:
        "Discovery deals refresh once per day at 8:40 PM Eastern from Steam Specials and only show games currently on sale. GitHub Actions may start a few minutes late.",
    };
  }

  if (type === "daily-history") {
    return {
      nextCheck: getNextDailyEasternTime(now, 20, 45),
      title: "Next daily history point",
      description:
        "Price history saves one shared point per tracked game after the 8:45 PM Eastern scheduled price check. GitHub Actions may start a few minutes late.",
    };
  }

  return {
    nextCheck: getNextDailyEasternTime(now, 20, 50),
    title: "Next daily digest email",
    description:
      "Daily digest emails are scheduled once per day at 8:50 PM Eastern for users who selected daily digest alerts. GitHub Actions may start a few minutes late.",
  };
}

export default function CheckCountdown({
  type,
  displayTimeZone,
}: CheckCountdownProps) {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(new Date());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  if (!now) {
    return (
      <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
        <p className="text-sm text-slate-400">Loading schedule...</p>
        <p className="mt-1 text-2xl font-semibold">--</p>
      </div>
    );
  }

  const { nextCheck, title, description } = getCountdownDetails(type, now);
  const timeRemaining = nextCheck.getTime() - now.getTime();

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-sm text-slate-400">{title}</p>

      <p className="mt-1 text-2xl font-semibold">
        {formatTimeRemaining(timeRemaining)}
      </p>

      <p className="mt-2 text-sm text-slate-400">
        Estimated time: {formatEstimatedTime(nextCheck, displayTimeZone)}
      </p>

      <p className="mt-2 text-xs text-slate-500">{description}</p>
    </div>
  );
}
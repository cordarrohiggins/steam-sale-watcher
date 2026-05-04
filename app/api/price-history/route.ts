import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

function getRangeStartDate(range: string | null) {
  const now = new Date();

  if (range === "1w") {
    now.setDate(now.getDate() - 7);
    return now;
  }

  if (range === "1m") {
    now.setMonth(now.getMonth() - 1);
    return now;
  }

  if (range === "3m") {
    now.setMonth(now.getMonth() - 3);
    return now;
  }

  if (range === "6m") {
    now.setMonth(now.getMonth() - 6);
    return now;
  }

  if (range === "1y") {
    now.setFullYear(now.getFullYear() - 1);
    return now;
  }

  return null;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const gameId = searchParams.get("gameId");
    const range = searchParams.get("range") ?? "1m";

    if (!gameId) {
      return NextResponse.json(
        { error: "Missing game ID" },
        { status: 400 }
      );
    }

    const { data: game, error: gameError } = await supabaseServer
      .from("games")
      .select(
        `
        id,
        name,
        steam_app_id,
        store_url,
        header_image,
        current_price,
        original_price,
        discount_percent,
        currency,
        is_free,
        sale_ends_at
      `
      )
      .eq("id", gameId)
      .single();

    if (gameError) {
      return NextResponse.json(
        { error: gameError.message },
        { status: 500 }
      );
    }

    let query = supabaseServer
      .from("price_checks")
      .select(
        `
        id,
        price,
        original_price,
        discount_percent,
        currency,
        is_free,
        checked_at
      `
      )
      .eq("game_id", gameId)
      .order("checked_at", { ascending: false });

    const startDate = getRangeStartDate(range);

    if (startDate) {
      query = query.gte("checked_at", startDate.toISOString());
    }

    const { data, error } = await query.limit(365);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    const dailyHistoryMap = new Map<string, (typeof data)[number]>();

    for (const historyItem of data ?? []) {
        const dayKey = new Date(historyItem.checked_at).toISOString().split("T")[0];

        if (!dailyHistoryMap.has(dayKey)) {
            dailyHistoryMap.set(dayKey, historyItem);
        }
    }

    return NextResponse.json({
      game,
      priceHistory: Array.from(dailyHistoryMap.values()),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to load price history",
      },
      { status: 500 }
    );
  }
}
import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type GameRow = {
  id: string;
  steam_app_id: number;
  name: string;
  header_image: string | null;
  store_url: string | null;
  current_price: number | null;
  original_price: number | null;
  discount_percent: number | null;
  currency: string | null;
  is_free: boolean | null;
  sale_ends_at: string | null;
  last_checked_at: string | null;
};

type WatchlistCountRow = {
  game_id: string;
};

type DiscoveryDealRow = {
  game_id: string;
  source: "specials";
  source_rank: number | null;
  last_seen_at: string | null;
};

export async function GET() {
  try {
    const { data: games, error: gamesError } = await supabaseServer
      .from("games")
      .select(
        `
        id,
        steam_app_id,
        name,
        header_image,
        store_url,
        current_price,
        original_price,
        discount_percent,
        currency,
        is_free,
        sale_ends_at,
        last_checked_at
      `
      )
      .not("current_price", "is", null)
      .gt("current_price", 0)
      .gt("discount_percent", 0)
      .order("discount_percent", { ascending: false });

    if (gamesError) {
      return NextResponse.json({ error: gamesError.message }, { status: 500 });
    }

    const { data: watchlistRows, error: watchlistError } = await supabaseServer
      .from("watchlist_items")
      .select("game_id")
      .eq("alert_enabled", true);

    if (watchlistError) {
      return NextResponse.json(
        { error: watchlistError.message },
        { status: 500 }
      );
    }

    const { data: discoveryRows, error: discoveryError } = await supabaseServer
      .from("discovery_deals")
      .select("game_id, source, source_rank, last_seen_at");

    if (discoveryError) {
      return NextResponse.json(
        { error: discoveryError.message },
        { status: 500 }
      );
    }

    const trackedCounts = new Map<string, number>();

    for (const row of (watchlistRows ?? []) as WatchlistCountRow[]) {
      trackedCounts.set(row.game_id, (trackedCounts.get(row.game_id) ?? 0) + 1);
    }

    const discoveryByGame = new Map<
      string,
      {
        sources: DiscoveryDealRow["source"][];
        bestRank: number | null;
        lastSeenAt: string | null;
      }
    >();

    for (const row of (discoveryRows ?? []) as DiscoveryDealRow[]) {
      const existing = discoveryByGame.get(row.game_id) ?? {
        sources: [],
        bestRank: null,
        lastSeenAt: null,
      };

      if (!existing.sources.includes(row.source)) {
        existing.sources.push(row.source);
      }

      if (
        row.source_rank !== null &&
        (existing.bestRank === null || row.source_rank < existing.bestRank)
      ) {
        existing.bestRank = row.source_rank;
      }

      if (
        row.last_seen_at &&
        (!existing.lastSeenAt ||
          new Date(row.last_seen_at).getTime() >
            new Date(existing.lastSeenAt).getTime())
      ) {
        existing.lastSeenAt = row.last_seen_at;
      }

      discoveryByGame.set(row.game_id, existing);
    }

    const deals = ((games ?? []) as GameRow[]).map((game) => {
      const discoveryInfo = discoveryByGame.get(game.id);

      return {
        ...game,
        tracked_count: trackedCounts.get(game.id) ?? 0,
        discovery_sources: discoveryInfo?.sources ?? [],
        best_discovery_rank: discoveryInfo?.bestRank ?? null,
        discovery_last_seen_at: discoveryInfo?.lastSeenAt ?? null,
        is_discovery_deal: Boolean(discoveryInfo),
        is_tracked_deal: (trackedCounts.get(game.id) ?? 0) > 0,
      };
    });

    return NextResponse.json({ deals });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to load deals",
      },
      { status: 500 }
    );
  }
}
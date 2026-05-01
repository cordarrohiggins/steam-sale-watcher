import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { fetchSteamPrice } from "@/lib/steam/fetchSteamPrice";

type WatchedGameRow = {
  game_id: string;
  games: {
    id: string;
    steam_app_id: number;
  };
};

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const expectedSecret = process.env.CHECK_PRICES_SECRET;

    if (!expectedSecret) {
      return NextResponse.json(
        { error: "Missing CHECK_PRICES_SECRET" },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: watchedGames, error: watchedGamesError } =
      await supabaseServer
        .from("watchlist_items")
        .select(
          `
          game_id,
          games (
            id,
            steam_app_id
          )
        `
        )
        .eq("alert_enabled", true);

    if (watchedGamesError) {
      return NextResponse.json(
        { error: watchedGamesError.message },
        { status: 500 }
      );
    }

    const uniqueGames = new Map<number, WatchedGameRow["games"]>();

    for (const row of (watchedGames ?? []) as unknown as WatchedGameRow[]) {
      if (row.games?.steam_app_id) {
        uniqueGames.set(row.games.steam_app_id, row.games);
      }
    }

    const results = [];

    for (const game of uniqueGames.values()) {
      const priceData = await fetchSteamPrice(game.steam_app_id);

      const { error: updateGameError } = await supabaseServer
        .from("games")
        .update({
          name: priceData.name,
          header_image: priceData.headerImage,
          store_url: priceData.storeUrl,
          current_price: priceData.currentPrice,
          original_price: priceData.originalPrice,
          discount_percent: priceData.discountPercent,
          currency: priceData.currency,
          is_free: priceData.isFree,
          last_checked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", game.id);

      if (updateGameError) {
        throw new Error(updateGameError.message);
      }

      const { error: insertPriceCheckError } = await supabaseServer
        .from("price_checks")
        .insert({
          game_id: game.id,
          price: priceData.currentPrice,
          original_price: priceData.originalPrice,
          discount_percent: priceData.discountPercent,
          currency: priceData.currency,
          is_free: priceData.isFree,
        });

      if (insertPriceCheckError) {
        throw new Error(insertPriceCheckError.message);
      }

      results.push({
        steamAppId: priceData.steamAppId,
        name: priceData.name,
        currentPrice: priceData.currentPrice,
        originalPrice: priceData.originalPrice,
        discountPercent: priceData.discountPercent,
        currency: priceData.currency,
        isFree: priceData.isFree,
      });
    }

    return NextResponse.json({
      checkedGameCount: results.length,
      results,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to check prices",
      },
      { status: 500 }
    );
  }
}
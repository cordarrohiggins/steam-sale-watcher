import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type FreeToKeepRow = {
  id: string;
  game_id: string;
  steam_app_id: number;
  source: string;
  first_seen_at: string | null;
  last_seen_at: string | null;
  last_confirmed_free_at: string | null;
  is_active: boolean;
  games: {
    id: string;
    steam_app_id: number;
    name: string;
    header_image: string | null;
    store_url: string | null;
    current_price: number | null;
    original_price: number | null;
    discount_percent: number | null;
    currency: string | null;
    last_checked_at: string | null;
  } | null;
};

export async function GET() {
  try {
    const { data, error } = await supabaseServer
      .from("free_to_keep_games")
      .select(
        `
        id,
        game_id,
        steam_app_id,
        source,
        first_seen_at,
        last_seen_at,
        last_confirmed_free_at,
        is_active,
        games (
          id,
          steam_app_id,
          name,
          header_image,
          store_url,
          current_price,
          original_price,
          discount_percent,
          currency,
          last_checked_at
        )
      `
      )
      .eq("is_active", true)
      .order("last_confirmed_free_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      freeGames: (data ?? []) as unknown as FreeToKeepRow[],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to load free games",
      },
      { status: 500 }
    );
  }
}
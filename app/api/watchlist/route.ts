import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type AddWatchlistRequest = {
  userId: string;
  steamAppId: number;
  name: string;
  targetPrice: number;
  currentPrice?: number | null;
  originalPrice?: number | null;
  currency?: string;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing user ID" },
        { status: 400 }
      );
    }

    const { data: watchlistItems, error } = await supabaseServer
      .from("watchlist_items")
      .select(
        `
        id,
        target_price,
        alert_enabled,
        alert_triggered,
        games (
          steam_app_id,
          name,
          store_url,
          current_price,
          discount_percent,
          currency,
          is_free,
          last_checked_at
        )
      `
      )
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ watchlistItems });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to load watchlist",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AddWatchlistRequest;

    if (!body.userId || !body.steamAppId || !body.name || body.targetPrice < 0) {
      return NextResponse.json(
        { error: "Missing required watchlist information" },
        { status: 400 }
      );
    }

    const storeUrl = `https://store.steampowered.com/app/${body.steamAppId}`;

    const { data: game, error: gameError } = await supabaseServer
      .from("games")
      .upsert(
        {
          steam_app_id: body.steamAppId,
          name: body.name,
          store_url: storeUrl,
          current_price: body.currentPrice ?? null,
          original_price: body.originalPrice ?? null,
          currency: body.currency ?? "USD",
          last_checked_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "steam_app_id",
        }
      )
      .select("id")
      .single();

    if (gameError) {
      return NextResponse.json(
        { error: gameError.message },
        { status: 500 }
      );
    }

    const { data: watchlistItem, error: watchlistError } = await supabaseServer
      .from("watchlist_items")
      .insert({
        user_id: body.userId,
        game_id: game.id,
        target_price: body.targetPrice,
        alert_type: "target_price",
      })
      .select()
      .single();

    if (watchlistError) {
      return NextResponse.json(
        { error: watchlistError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ watchlistItem });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to add watchlist item",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const itemId = searchParams.get("itemId");
    const userId = searchParams.get("userId");

    if (!itemId || !userId) {
      return NextResponse.json(
        { error: "Missing watchlist item ID or user ID" },
        { status: 400 }
      );
    }

    const { error } = await supabaseServer
      .from("watchlist_items")
      .delete()
      .eq("id", itemId)
      .eq("user_id", userId);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to remove watchlist item",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    const itemId = body.itemId as string | undefined;
    const userId = body.userId as string | undefined;
    const targetPrice = Number(body.targetPrice);

    if (!itemId || !userId || Number.isNaN(targetPrice) || targetPrice < 0) {
      return NextResponse.json(
        { error: "Missing or invalid watchlist update information" },
        { status: 400 }
      );
    }

    const { error } = await supabaseServer
      .from("watchlist_items")
      .update({
        target_price: targetPrice,
        alert_triggered: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", itemId)
      .eq("user_id", userId);

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update watchlist item",
      },
      { status: 500 }
    );
  }
}
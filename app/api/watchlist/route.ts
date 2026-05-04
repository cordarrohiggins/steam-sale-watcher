import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type AddWatchlistRequest = {
  userId: string;
  steamAppId: number;
  name: string;
  alertType: "target_price" | "target_discount";
  targetPrice?: number | null;
  targetDiscountPercent?: number | null;
  currentPrice?: number | null;
  originalPrice?: number | null;
  currency?: string;
};

function isAlertCurrentlyMet({
  alertType,
  targetPrice,
  targetDiscountPercent,
  currentPrice,
  discountPercent,
}: {
  alertType: "target_price" | "target_discount";
  targetPrice: number | null;
  targetDiscountPercent: number | null;
  currentPrice: number | null;
  discountPercent: number | null;
}) {
  if (alertType === "target_price") {
    return (
      currentPrice !== null &&
      targetPrice !== null &&
      currentPrice <= targetPrice
    );
  }

  if (alertType === "target_discount") {
    return (
      discountPercent !== null &&
      targetDiscountPercent !== null &&
      discountPercent >= targetDiscountPercent
    );
  }

  return false;
}

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
        target_discount_percent,
        alert_type,
        alert_enabled,
        alert_triggered,
        games (
          id,
          steam_app_id,
          name,
          store_url,
          current_price,
          discount_percent,
          currency,
          is_free,
          last_checked_at,
          sale_ends_at
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

    const isValidAlertType =
      body.alertType === "target_price" || body.alertType === "target_discount";

    const targetPrice =
      body.targetPrice === null || body.targetPrice === undefined
        ? null
        : Number(body.targetPrice);

    const targetDiscountPercent =
      body.targetDiscountPercent === null || body.targetDiscountPercent === undefined
        ? null
        : Number(body.targetDiscountPercent);

    const isValidTargetPrice =
      targetPrice === null || (!Number.isNaN(targetPrice) && targetPrice >= 0);

    const isValidTargetDiscount =
      targetDiscountPercent === null ||
      (!Number.isNaN(targetDiscountPercent) &&
        targetDiscountPercent >= 0 &&
        targetDiscountPercent <= 100);

    if (
      !body.userId ||
      !body.steamAppId ||
      !body.name ||
      !isValidAlertType ||
      !isValidTargetPrice ||
      !isValidTargetDiscount
    ) {
      return NextResponse.json(
        { error: "Missing or invalid watchlist information" },
        { status: 400 }
      );
    }

    if (body.alertType === "target_price" && targetPrice === null) {
      return NextResponse.json(
        { error: "Please enter a valid target price." },
        { status: 400 }
      );
    }

    if (body.alertType === "target_discount" && targetDiscountPercent === null) {
      return NextResponse.json(
        { error: "Please enter a valid discount percent from 0 to 100." },
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

    const alertTriggered = isAlertCurrentlyMet({
      alertType: body.alertType,
      targetPrice,
      targetDiscountPercent,
      currentPrice: body.currentPrice ?? null,
      discountPercent:
        body.currentPrice !== null &&
        body.currentPrice !== undefined &&
        body.originalPrice !== null &&
        body.originalPrice !== undefined &&
        body.originalPrice > 0
          ? Math.round(
              ((body.originalPrice - body.currentPrice) / body.originalPrice) * 100
            )
          : null,
    });

    const { data: watchlistItem, error: watchlistError } = await supabaseServer
      .from("watchlist_items")
      .insert({
        user_id: body.userId,
        game_id: game.id,
        target_price: targetPrice,
        target_discount_percent: targetDiscountPercent,
        alert_type: body.alertType,
        alert_triggered: alertTriggered,
        last_alert_sent_at: null,
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
    const alertType = body.alertType as string | undefined;

    const targetPrice =
      body.targetPrice === null || body.targetPrice === undefined
        ? null
        : Number(body.targetPrice);

    const targetDiscountPercent =
      body.targetDiscountPercent === null ||
      body.targetDiscountPercent === undefined
        ? null
        : Number(body.targetDiscountPercent);

    const isValidAlertType =
      alertType === "target_price" || alertType === "target_discount";

    const isValidTargetPrice =
      targetPrice === null || (!Number.isNaN(targetPrice) && targetPrice >= 0);

    const isValidTargetDiscount =
      targetDiscountPercent === null ||
      (!Number.isNaN(targetDiscountPercent) &&
        targetDiscountPercent >= 0 &&
        targetDiscountPercent <= 100);

    if (
      !itemId ||
      !userId ||
      !isValidAlertType ||
      !isValidTargetPrice ||
      !isValidTargetDiscount
    ) {
      return NextResponse.json(
        { error: "Missing or invalid watchlist update information" },
        { status: 400 }
      );
    }

    const { data: existingItem, error: existingItemError } = await supabaseServer
      .from("watchlist_items")
      .select(
        `
        id,
        games (
          current_price,
          discount_percent
        )
      `
      )
      .eq("id", itemId)
      .eq("user_id", userId)
      .single();

    if (existingItemError) {
      return NextResponse.json(
        { error: existingItemError.message },
        { status: 500 }
      );
    }

    const gameData = Array.isArray(existingItem.games)
      ? existingItem.games[0]
      : existingItem.games;

    const alertTriggered = isAlertCurrentlyMet({
      alertType,
      targetPrice,
      targetDiscountPercent,
      currentPrice: gameData?.current_price ?? null,
      discountPercent: gameData?.discount_percent ?? null,
    });

    const { error } = await supabaseServer
      .from("watchlist_items")
      .update({
        alert_type: alertType,
        target_price: targetPrice,
        target_discount_percent: targetDiscountPercent,
        alert_triggered: alertTriggered,
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
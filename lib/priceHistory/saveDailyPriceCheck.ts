import { supabaseServer } from "@/lib/supabaseServer";

type SaveDailyPriceCheckParams = {
  gameId: string;
  price: number | null;
  originalPrice: number | null;
  discountPercent: number | null;
  currency: string | null;
  isFree: boolean | null;
};

export async function saveDailyPriceCheck({
  gameId,
  price,
  originalPrice,
  discountPercent,
  currency,
  isFree,
}: SaveDailyPriceCheckParams) {
  const now = new Date();

  const startOfToday = new Date(now);
  startOfToday.setUTCHours(0, 0, 0, 0);

  const { data: existingPriceCheckToday, error: existingPriceCheckError } =
    await supabaseServer
      .from("price_checks")
      .select("id")
      .eq("game_id", gameId)
      .gte("checked_at", startOfToday.toISOString())
      .order("checked_at", { ascending: false })
      .limit(1)
      .maybeSingle();

  if (existingPriceCheckError) {
    throw new Error(existingPriceCheckError.message);
  }

  if (existingPriceCheckToday) {
    const { error: updatePriceCheckError } = await supabaseServer
      .from("price_checks")
      .update({
        price,
        original_price: originalPrice,
        discount_percent: discountPercent,
        currency,
        is_free: isFree,
        checked_at: now.toISOString(),
      })
      .eq("id", existingPriceCheckToday.id);

    if (updatePriceCheckError) {
      throw new Error(updatePriceCheckError.message);
    }

    return;
  }

  const { error: insertPriceCheckError } = await supabaseServer
    .from("price_checks")
    .insert({
      game_id: gameId,
      price,
      original_price: originalPrice,
      discount_percent: discountPercent,
      currency,
      is_free: isFree,
      checked_at: now.toISOString(),
    });

  if (insertPriceCheckError) {
    throw new Error(insertPriceCheckError.message);
  }
}
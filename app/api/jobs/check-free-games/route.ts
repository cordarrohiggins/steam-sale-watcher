import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { fetchSteamPrice } from "@/lib/steam/fetchSteamPrice";
import { sendFreeGameAlertEmail } from "@/lib/email/sendFreeGameAlertEmail";
import { saveDailyPriceCheck } from "@/lib/priceHistory/saveDailyPriceCheck";

type ItadDeal = {
  id: string;
  slug: string;
  title: string;
  type?: string;
  deal?: {
    shop?: {
      id?: number;
      name?: string;
    };
    price?: {
      amount?: number;
      currency?: string;
    };
    regular?: {
      amount?: number;
      currency?: string;
    };
    cut?: number;
    url?: string;
  };
};

type FreeCandidate = {
  itadId: string;
  itadSlug: string;
  title: string;
  steamAppId: number;
  itadRegularPrice: number | null;
};

type UserSettingRow = {
  user_id: string;
};

type FreeGameEmailItem = {
  freeToKeepGameId: string;
  gameId: string;
  gameName: string;
  originalPrice: number | null;
  storeUrl: string | null;
};

const blockedNameTerms = [
  "soundtrack",
  "official soundtrack",
  "ost",
  "demo",
  "artbook",
  "upgrade",
  "starter pack",
  "founder's pack",
  "founders pack",
  "skin pack",
  "cosmetic",
  "wallpaper",
  "bonus content",
  "server",
  "test server",
  "dedicated server",
  "playtest",
];

function hasBlockedNameTerm(name: string) {
  const normalizedName = name.toLowerCase();

  return blockedNameTerms.some((term) => normalizedName.includes(term));
}

function extractSteamAppId(shopIds: string[] | null | undefined) {
  if (!shopIds) {
    return null;
  }

  for (const shopId of shopIds) {
    const match = shopId.match(/^app\/(\d+)$/);

    if (match) {
      return Number(match[1]);
    }
  }

  return null;
}

async function getItadFreeCandidates(apiKey: string) {
  const dealsResponse = await fetch(
    "https://api.isthereanydeal.com/deals/v2?country=US&shops=61&limit=100&sort=-cut",
    {
      headers: {
        "ITAD-API-Key": apiKey,
      },
      cache: "no-store",
    }
  );

  if (!dealsResponse.ok) {
    throw new Error(
      `ITAD deals request failed. Status: ${dealsResponse.status} ${dealsResponse.statusText}`
    );
  }

  const dealsData = await dealsResponse.json();

  const freeDeals = ((dealsData.list ?? []) as ItadDeal[]).filter((deal) => {
    return (
      deal.deal?.shop?.id === 61 &&
      deal.deal?.price?.amount === 0 &&
      (deal.deal?.regular?.amount ?? 0) > 0 &&
      deal.deal?.cut === 100
    );
  });

  const itadIds = freeDeals.map((deal) => deal.id);

  if (itadIds.length === 0) {
    return [];
  }

  const lookupResponse = await fetch(
    "https://api.isthereanydeal.com/lookup/shop/61/id/v1",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ITAD-API-Key": apiKey,
      },
      body: JSON.stringify(itadIds),
      cache: "no-store",
    }
  );

  if (!lookupResponse.ok) {
    throw new Error(
      `ITAD lookup request failed. Status: ${lookupResponse.status} ${lookupResponse.statusText}`
    );
  }

  const lookupData = (await lookupResponse.json()) as Record<string, string[]>;

  const candidates: FreeCandidate[] = [];

  for (const deal of freeDeals) {
    const shopIds = lookupData[deal.id] ?? [];
    const steamAppId = extractSteamAppId(shopIds);

    if (!steamAppId) {
      continue;
    }

    candidates.push({
      itadId: deal.id,
      itadSlug: deal.slug,
      title: deal.title,
      steamAppId,
      itadRegularPrice: deal.deal?.regular?.amount ?? null,
    });
  }

  return candidates;
}

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const expectedSecret = process.env.CHECK_PRICES_SECRET;
    const itadApiKey = process.env.ITAD_API_KEY;

    if (!expectedSecret) {
      return NextResponse.json(
        { error: "Missing CHECK_PRICES_SECRET" },
        { status: 500 }
      );
    }

    if (!itadApiKey) {
      return NextResponse.json(
        { error: "Missing ITAD_API_KEY" },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const candidates = await getItadFreeCandidates(itadApiKey);

    let checkedCount = 0;
    let verifiedFreeCount = 0;
    let savedFreeGameCount = 0;
    let emailCount = 0;

    const updatedFreeGames: Array<{
      name: string;
      steamAppId: number;
      freeToKeepGameId: string;
      lastConfirmedFreeAt: string;
    }> = [];

    const newFreeGames: FreeGameEmailItem[] = [];

    const activeSteamAppIds = new Set<number>();

    for (const candidate of candidates) {
      checkedCount += 1;

      try {
        const priceData = await fetchSteamPrice(candidate.steamAppId);

        if (hasBlockedNameTerm(priceData.name)) {
            continue;
            }

            const isVerifiedFreeToKeep =
                priceData.currentPrice === 0 &&
                candidate.itadRegularPrice !== null &&
                candidate.itadRegularPrice > 0 &&
                (priceData.discountPercent === 100 || priceData.isFree === true);

            if (!isVerifiedFreeToKeep) {
            continue;
            }

        verifiedFreeCount += 1;
        activeSteamAppIds.add(priceData.steamAppId);

        const { data: game, error: gameError } = await supabaseServer
          .from("games")
          .upsert(
            {
              steam_app_id: priceData.steamAppId,
              name: priceData.name,
              header_image: priceData.headerImage,
              store_url: priceData.storeUrl,
              current_price: priceData.currentPrice,
              original_price: priceData.originalPrice && priceData.originalPrice > 0
                ? priceData.originalPrice
                : candidate.itadRegularPrice,
              discount_percent: priceData.discountPercent,
              currency: priceData.currency,
              is_free: priceData.isFree,
              sale_ends_at: priceData.saleEndsAt,
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
          throw new Error(gameError.message);
        }

        const { data: freeGame, error: freeGameError } = await supabaseServer
          .from("free_to_keep_games")
          .upsert(
            {
              game_id: game.id,
              steam_app_id: priceData.steamAppId,
              itad_id: candidate.itadId,
              itad_slug: candidate.itadSlug,
              source: "isthereanydeal",
              last_seen_at: new Date().toISOString(),
              last_confirmed_free_at: new Date().toISOString(),
              is_active: true,
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "steam_app_id,source",
            }
          )
          .select("id")
          .single();

        if (freeGameError) {
          throw new Error(freeGameError.message);
        }

        updatedFreeGames.push({
          name: priceData.name,
          steamAppId: priceData.steamAppId,
          freeToKeepGameId: freeGame.id,
          lastConfirmedFreeAt: new Date().toISOString(),
        });

        await saveDailyPriceCheck({
          gameId: game.id,
          price: priceData.currentPrice,
          originalPrice:
            priceData.originalPrice && priceData.originalPrice > 0
              ? priceData.originalPrice
              : candidate.itadRegularPrice,
          discountPercent: priceData.discountPercent,
          currency: priceData.currency,
          isFree: priceData.isFree,
        });

        savedFreeGameCount += 1;

        newFreeGames.push({
          freeToKeepGameId: freeGame.id,
          gameId: game.id,
          gameName: priceData.name,
          originalPrice:
            priceData.originalPrice && priceData.originalPrice > 0
              ? priceData.originalPrice
              : candidate.itadRegularPrice,
          storeUrl: priceData.storeUrl,
        });
      } catch (error) {
        console.error(
          `Failed free-to-keep check for ${candidate.steamAppId}`,
          error
        );
      }
    }

    if (newFreeGames.length > 0) {
      const { data: subscribedUsers, error: subscribedUsersError } =
        await supabaseServer
          .from("user_settings")
          .select("user_id")
          .eq("free_game_email_alerts", true);

      if (subscribedUsersError) {
        throw new Error(subscribedUsersError.message);
      }

      for (const subscribedUser of (subscribedUsers ?? []) as UserSettingRow[]) {
        const unsentGamesForUser: FreeGameEmailItem[] = [];

        for (const freeGame of newFreeGames) {
          const { data: existingAlert, error: existingAlertError } =
            await supabaseServer
              .from("free_game_alerts_sent")
              .select("id")
              .eq("user_id", subscribedUser.user_id)
              .eq("free_to_keep_game_id", freeGame.freeToKeepGameId)
              .maybeSingle();

          if (existingAlertError) {
            throw new Error(existingAlertError.message);
          }

          if (!existingAlert) {
            unsentGamesForUser.push(freeGame);
          }
        }

        if (unsentGamesForUser.length === 0) {
          continue;
        }

        const { data: userData, error: userError } =
          await supabaseServer.auth.admin.getUserById(subscribedUser.user_id);

        if (userError) {
          throw new Error(userError.message);
        }

        const userEmail = userData.user?.email;

        if (!userEmail) {
          continue;
        }

        await sendFreeGameAlertEmail({
          to: userEmail,
          games: unsentGamesForUser.map((game) => ({
            gameName: game.gameName,
            originalPrice: game.originalPrice,
            storeUrl: game.storeUrl,
          })),
        });

        const { error: insertAlertsError } = await supabaseServer
          .from("free_game_alerts_sent")
          .insert(
            unsentGamesForUser.map((game) => ({
              user_id: subscribedUser.user_id,
              game_id: game.gameId,
              free_to_keep_game_id: game.freeToKeepGameId,
            }))
          );

        if (insertAlertsError) {
          throw new Error(insertAlertsError.message);
        }

        emailCount += 1;
      }
    }

    if (activeSteamAppIds.size > 0) {
      const { error: deactivateError } = await supabaseServer
        .from("free_to_keep_games")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("source", "isthereanydeal")
        .not(
          "steam_app_id",
          "in",
          `(${Array.from(activeSteamAppIds).join(",")})`
        );

      if (deactivateError) {
        throw new Error(deactivateError.message);
      }
    }

    return NextResponse.json({
      candidateCount: candidates.length,
      checkedCount,
      verifiedFreeCount,
      savedFreeGameCount,
      emailCount,
      updatedFreeGames,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to check free-to-keep games",
      },
      { status: 500 }
    );
  }
}
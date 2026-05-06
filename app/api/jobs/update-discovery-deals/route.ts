import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { fetchSteamPrice } from "@/lib/steam/fetchSteamPrice";

type DiscoverySource = "specials";

type DiscoveryCandidate = {
  steamAppId: number;
  source: DiscoverySource;
  sourceRank: number;
};

const MAX_PER_SOURCE = 100;

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

function extractAppIdsFromText(text: string) {
  const appIds = new Set<number>();
  const appRegex = /\/app\/(\d+)/g;

  let match = appRegex.exec(text);

  while (match !== null) {
    appIds.add(Number(match[1]));
    match = appRegex.exec(text);
  }

  return Array.from(appIds);
}

async function fetchAppIdsFromUrl(url: string) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": "SteamSaleWatcher/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch discovery source. Status: ${response.status} ${response.statusText}`
    );
  }

  const text = await response.text();

  return extractAppIdsFromText(text).slice(0, 50);
}

async function fetchSpecials() {
  const pageOneAppIds = await fetchAppIdsFromUrl(
    "https://store.steampowered.com/search/?specials=1&ndl=1&start=0"
  );

  const pageTwoAppIds = await fetchAppIdsFromUrl(
    "https://store.steampowered.com/search/?specials=1&ndl=1&start=50"
  );

  const uniqueAppIds = Array.from(new Set([...pageOneAppIds, ...pageTwoAppIds]))
    .slice(0, MAX_PER_SOURCE);

  return uniqueAppIds.map((steamAppId, index) => ({
    steamAppId,
    source: "specials" as const,
    sourceRank: index + 1,
  }));
}

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

    const sourceNames: DiscoverySource[] = ["specials"];

    const sourceResults = await Promise.allSettled([fetchSpecials()]);

    const candidates: DiscoveryCandidate[] = [];
    const sourceCounts: Record<DiscoverySource, number> = {
      specials: 0,
    };

    sourceResults.forEach((result, index) => {
      const sourceName = sourceNames[index];

      if (result.status === "fulfilled") {
        sourceCounts[sourceName] = result.value.length;
        candidates.push(...result.value);
      } else {
        console.error(result.reason);
      }
    });

    const uniqueCandidates = new Map<string, DiscoveryCandidate>();

    for (const candidate of candidates) {
      const key = `${candidate.source}-${candidate.steamAppId}`;
      uniqueCandidates.set(key, candidate);
    }

    let checkedCount = 0;
    let discountedCount = 0;
    let savedDiscoveryCount = 0;

    for (const candidate of uniqueCandidates.values()) {
      checkedCount += 1;

      try {
        const priceData = await fetchSteamPrice(candidate.steamAppId);

        if (hasBlockedNameTerm(priceData.name)) {
          continue;
        }

        if (!priceData.discountPercent || priceData.discountPercent <= 0) {
          continue;
        }

        discountedCount += 1;

        const { data: game, error: gameError } = await supabaseServer
          .from("games")
          .upsert(
            {
              steam_app_id: priceData.steamAppId,
              name: priceData.name,
              header_image: priceData.headerImage,
              store_url: priceData.storeUrl,
              current_price: priceData.currentPrice,
              original_price: priceData.originalPrice,
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

        const { error: discoveryError } = await supabaseServer
          .from("discovery_deals")
          .upsert(
            {
              game_id: game.id,
              steam_app_id: priceData.steamAppId,
              source: candidate.source,
              source_rank: candidate.sourceRank,
              last_seen_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            },
            {
              onConflict: "source,steam_app_id",
            }
          );

        if (discoveryError) {
          throw new Error(discoveryError.message);
        }

        const startOfToday = new Date();
        startOfToday.setUTCHours(0, 0, 0, 0);

        const { data: existingPriceCheckToday, error: existingPriceCheckError } =
          await supabaseServer
            .from("price_checks")
            .select("id")
            .eq("game_id", game.id)
            .gte("checked_at", startOfToday.toISOString())
            .limit(1)
            .maybeSingle();

        if (existingPriceCheckError) {
          throw new Error(existingPriceCheckError.message);
        }

        if (!existingPriceCheckToday) {
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
        }

        savedDiscoveryCount += 1;
      } catch (error) {
        console.error(`Failed discovery check for ${candidate.steamAppId}`, error);
      }
    }

    return NextResponse.json({
      sourceCounts,
      totalCandidates: candidates.length,
      uniqueSourceGamePairs: uniqueCandidates.size,
      checkedCount,
      discountedCount,
      savedDiscoveryCount,
      sourceErrors: sourceResults.filter((result) => result.status === "rejected")
        .length,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to update discovery deals",
      },
      { status: 500 }
    );
  }
}
import { NextResponse } from "next/server";

type SteamStoreSearchItem = {
  id: number;
  name: string;
  price?: {
    currency?: string;
    initial?: number;
    final?: number;
  };
};

type SteamStoreSearchResponse = {
  total: number;
  items?: SteamStoreSearchItem[];
};

type SteamAppDetailsResponse = {
  [appId: string]: {
    success: boolean;
    data?: {
      type?: string;
      name?: string;
    };
  };
};

const dlcTerms = [
  "dlc",
  "season pass",
  "expansion pass",
  "expansion",
];

const soundtrackTerms = [
  "soundtrack",
  "official soundtrack",
  "ost",
];

const demoTerms = [
  "demo",
  "playtest",
  "beta",
];

const extraContentTerms = [
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
];

function hasAnyTerm(name: string, terms: string[]) {
  const normalizedName = name.toLowerCase();

  return terms.some((term) => normalizedName.includes(term));
}

function shouldHideByName(
  name: string,
  filters: {
    hideDlc: boolean;
    hideSoundtracks: boolean;
    hideDemos: boolean;
    hideExtras: boolean;
  }
) {
  if (filters.hideDlc && hasAnyTerm(name, dlcTerms)) {
    return true;
  }

  if (filters.hideSoundtracks && hasAnyTerm(name, soundtrackTerms)) {
    return true;
  }

  if (filters.hideDemos && hasAnyTerm(name, demoTerms)) {
    return true;
  }

  if (filters.hideExtras && hasAnyTerm(name, extraContentTerms)) {
    return true;
  }

  return false;
}

function getBetterSteamImage(steamAppId: number) {
  return `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${steamAppId}/header.jpg`;
}

async function getSteamAppTypes(appIds: number[]) {
  const appTypes = new Map<number, string | null>();

  for (const appId of appIds) {
    const response = await fetch(
      `https://store.steampowered.com/api/appdetails?appids=${appId}&filters=basic&cc=us&l=english`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      appTypes.set(appId, null);
      continue;
    }

    const data = (await response.json()) as SteamAppDetailsResponse;
    const appData = data[String(appId)];

    appTypes.set(appId, appData?.data?.type ?? null);
  }

  return appTypes;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  const hideDlc = searchParams.get("hideDlc") !== "false";
  const hideSoundtracks = searchParams.get("hideSoundtracks") !== "false";
  const hideDemos = searchParams.get("hideDemos") !== "false";
  const hideExtras = searchParams.get("hideExtras") !== "false";

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] });
  }

  try {
    const response = await fetch(
      `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(
        query
      )}&cc=us&l=english`,
      {
        cache: "no-store",
      }
    );

    if (!response.ok) {
      throw new Error(
        `Steam search failed. Status: ${response.status} ${response.statusText}`
      );
    }

    const data = (await response.json()) as SteamStoreSearchResponse;

    const initialResults = data.items?.slice(0, 12) ?? [];
    const appTypes = await getSteamAppTypes(
      initialResults.map((item) => item.id)
    );

    const filteredResults = initialResults.filter((item) => {
      const appType = appTypes.get(item.id);

      if (
        shouldHideByName(item.name, {
          hideDlc,
          hideSoundtracks,
          hideDemos,
          hideExtras,
        })
      ) {
        return false;
      }

      if (hideDlc && appType === "dlc") {
        return false;
      }

      if (hideSoundtracks && appType === "music") {
        return false;
      }

      if (hideDemos && appType === "demo") {
        return false;
      }

      return true;
    });

    const results = filteredResults.slice(0, 12).map((item) => ({
      steamAppId: item.id,
      name: item.name,
      image: getBetterSteamImage(item.id),
      currentPrice:
        item.price?.final !== undefined ? item.price.final / 100 : null,
      originalPrice:
        item.price?.initial !== undefined ? item.price.initial / 100 : null,
      currency: item.price?.currency ?? "USD",
      appType: appTypes.get(item.id),
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Unable to search Steam games",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
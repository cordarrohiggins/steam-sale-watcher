type SteamAppDetailsResponse = {
  [appId: string]: {
    success: boolean;
    data?: {
      name?: string;
      header_image?: string;
      is_free?: boolean;
      price_overview?: {
        currency: string;
        initial: number;
        final: number;
        discount_percent: number;
      };
    };
  };
};

export type SteamPriceData = {
  steamAppId: number;
  name: string;
  headerImage: string | null;
  storeUrl: string;
  currentPrice: number | null;
  originalPrice: number | null;
  discountPercent: number;
  currency: string;
  isFree: boolean;
};

export async function fetchSteamPrice(
  steamAppId: number,
  countryCode = "us"
): Promise<SteamPriceData> {
  const response = await fetch(
    `https://store.steampowered.com/api/appdetails?appids=${steamAppId}&cc=${countryCode}&filters=basic,price_overview`,
    {
      cache: "no-store",
    }
  );

  if (!response.ok) {
    throw new Error(
      `Failed to fetch Steam price. Status: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as SteamAppDetailsResponse;
  const appData = data[String(steamAppId)];

  if (!appData?.success || !appData.data) {
    throw new Error("Steam returned no game data for this app ID.");
  }

  const game = appData.data;
  const priceOverview = game.price_overview;

  const isFree = game.is_free ?? false;

  return {
    steamAppId,
    name: game.name ?? `Steam App ${steamAppId}`,
    headerImage: game.header_image ?? null,
    storeUrl: `https://store.steampowered.com/app/${steamAppId}`,
    currentPrice: isFree ? 0 : priceOverview ? priceOverview.final / 100 : null,
    originalPrice: isFree
      ? 0
      : priceOverview
        ? priceOverview.initial / 100
        : null,
    discountPercent: priceOverview?.discount_percent ?? 0,
    currency: priceOverview?.currency ?? "USD",
    isFree,
  };
}
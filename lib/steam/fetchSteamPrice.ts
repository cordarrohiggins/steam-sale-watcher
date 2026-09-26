type SteamAppDetailsResponse = {
  [appId: string]: {
    success: boolean;
    data?: {
      steam_appid?: number;
      name?: string;
      header_image?: string;
      is_free?: boolean;
      price_overview?: {
        currency: string;
        initial: number;
        final: number;
        discount_percent: number;
        discount_expiration?: number;
      };
      package_groups?: {
        subs?: {
          discount_expiration?: number;
        }[];
      }[];
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
  saleEndsAt: string | null;
};

function getSaleEndsAt(
  priceOverview?: {
    discount_expiration?: number;
  },
  packageGroups?: {
    subs?: {
      discount_expiration?: number;
    }[];
  }[]
) {
  if (priceOverview?.discount_expiration) {
    return new Date(
      priceOverview.discount_expiration * 1000
    ).toISOString();
  }

  const packageExpirationDates =
    packageGroups
      ?.flatMap((group) => group.subs ?? [])
      .map((sub) => sub.discount_expiration)
      .filter(
        (expiration): expiration is number => Boolean(expiration)
      ) ?? [];

  if (packageExpirationDates.length === 0) {
    return null;
  }

  const soonestExpiration = Math.min(...packageExpirationDates);

  return new Date(
    soonestExpiration * 1000
  ).toISOString();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchSteamPrice(
  steamAppId: number,
  countryCode = "us"
): Promise<SteamPriceData> {
  const maxAttempts = 3;

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (attempt > 1) {
        const delayMs = (attempt - 1) * 1000;

        console.log(
          `Retrying Steam app ${steamAppId} in ${delayMs}ms (attempt ${attempt}/${maxAttempts})`
        );

        await sleep(delayMs);
      }

      const response = await fetch(
        `https://store.steampowered.com/api/appdetails?appids=${steamAppId}&cc=${countryCode}&l=english`,
        {
          cache: "no-store",
          headers: {
            "User-Agent": "steam-sale-watcher/1.0",
          },
        }
      );

      if (!response.ok) {
        throw new Error(
          `Steam request failed for app ${steamAppId}. Status: ${response.status} ${response.statusText}`
        );
      }

      let data: SteamAppDetailsResponse;

      try {
        data =
          (await response.json()) as SteamAppDetailsResponse;
      } catch {
        throw new Error(
          `Steam returned invalid JSON for app ${steamAppId}.`
        );
      }

      // Steam normally returns the requested app under its app ID key.
      // Occasionally the top-level key can be incorrect, even though the
      // returned game's internal steam_appid is correct.
      let appData = data[String(steamAppId)];

      if (
        !appData?.data ||
        appData.data.steam_appid !== steamAppId
      ) {
        const matchingEntry = Object.values(data).find(
          (entry) =>
            entry.success &&
            entry.data?.steam_appid === steamAppId
        );

        if (matchingEntry) {
          console.warn(
            `Steam returned app ${steamAppId} under an unexpected response key. Using matching steam_appid instead.`
          );

          appData = matchingEntry;
        }
      }

      if (!appData) {
        throw new Error(
          `Steam returned no response entry for app ${steamAppId}.`
        );
      }

      if (!appData.success || !appData.data) {
        throw new Error(
          `Steam returned no game data for app ${steamAppId}.`
        );
      }

      if (
        appData.data.steam_appid !== undefined &&
        appData.data.steam_appid !== steamAppId
      ) {
        throw new Error(
          `Steam returned mismatched game data for app ${steamAppId}. Returned steam_appid: ${appData.data.steam_appid}.`
        );
      }

      const game = appData.data;
      const priceOverview = game.price_overview;
      const isFree = game.is_free ?? false;

      return {
        steamAppId,
        name:
          game.name ?? `Steam App ${steamAppId}`,
        headerImage:
          game.header_image ?? null,
        storeUrl:
          `https://store.steampowered.com/app/${steamAppId}`,
        currentPrice: isFree
          ? 0
          : priceOverview
            ? priceOverview.final / 100
            : null,
        originalPrice: isFree
          ? 0
          : priceOverview
            ? priceOverview.initial / 100
            : null,
        discountPercent:
          priceOverview?.discount_percent ?? 0,
        currency:
          priceOverview?.currency ?? "USD",
        saleEndsAt: getSaleEndsAt(
          priceOverview,
          game.package_groups
        ),
        isFree,
      };
    } catch (error) {
      lastError = error;

      const message =
        error instanceof Error
          ? error.message
          : String(error);

      console.warn(
        `Steam app ${steamAppId} failed on attempt ${attempt}/${maxAttempts}: ${message}`
      );
    }
  }

  const lastMessage =
    lastError instanceof Error
      ? lastError.message
      : String(lastError);

  throw new Error(
    `Steam app ${steamAppId} failed after ${maxAttempts} attempts. Last error: ${lastMessage}`
  );
}

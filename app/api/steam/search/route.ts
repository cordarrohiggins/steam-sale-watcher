import { NextResponse } from "next/server";

type SteamStoreSearchItem = {
  id: number;
  name: string;
  tiny_image?: string;
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

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();

  if (!query) {
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

    const results =
      data.items?.slice(0, 20).map((item) => ({
        steamAppId: item.id,
        name: item.name,
        image: item.tiny_image ?? null,
        currentPrice:
          item.price?.final !== undefined ? item.price.final / 100 : null,
        originalPrice:
          item.price?.initial !== undefined ? item.price.initial / 100 : null,
        currency: item.price?.currency ?? "USD",
      })) ?? [];

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
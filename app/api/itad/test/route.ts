import { NextResponse } from "next/server";

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

export async function GET() {
  try {
    const apiKey = process.env.ITAD_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing ITAD_API_KEY" },
        { status: 500 }
      );
    }

    const dealsResponse = await fetch(
      "https://api.isthereanydeal.com/deals/v2?country=US&shops=61&limit=100&sort=-cut",
      {
        headers: {
          "ITAD-API-Key": apiKey,
        },
        cache: "no-store",
      }
    );

    const dealsData = await dealsResponse.json();

    const freeCandidates = ((dealsData.list ?? []) as ItadDeal[])
      .filter((deal) => {
        return (
          deal.deal?.shop?.id === 61 &&
          deal.deal?.price?.amount === 0 &&
          (deal.deal?.regular?.amount ?? 0) > 0 &&
          deal.deal?.cut === 100
        );
      })
      .slice(0, 20);

    const candidateIds = freeCandidates.map((candidate) => candidate.id);

    if (candidateIds.length === 0) {
      return NextResponse.json({
        dealsStatus: dealsResponse.status,
        freeCandidateCount: 0,
        mappedCandidates: [],
      });
    }

    const lookupResponse = await fetch(
      "https://api.isthereanydeal.com/lookup/shop/61/id/v1",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ITAD-API-Key": apiKey,
        },
        body: JSON.stringify(candidateIds),
        cache: "no-store",
      }
    );

    const lookupData = (await lookupResponse.json()) as Record<string, string[]>;

    const mappedCandidates = freeCandidates.map((candidate) => {
      const shopIds = lookupData[candidate.id] ?? [];
      const steamAppId = extractSteamAppId(shopIds);

      return {
        itadId: candidate.id,
        title: candidate.title,
        slug: candidate.slug,
        shopIds,
        steamAppId,
        price: candidate.deal?.price?.amount,
        regular: candidate.deal?.regular?.amount,
        cut: candidate.deal?.cut,
        itadUrl: candidate.deal?.url ?? null,
      };
    });

    return NextResponse.json({
      dealsStatus: dealsResponse.status,
      lookupStatus: lookupResponse.status,
      freeCandidateCount: freeCandidates.length,
      mappedCandidates,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to test ITAD API",
      },
      { status: 500 }
    );
  }
}
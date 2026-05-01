import { NextResponse } from "next/server";

type SteamSearchResult = {
  steamAppId: number;
  name: string;
};

const starterGames: SteamSearchResult[] = [
  { steamAppId: 105600, name: "Terraria" },
  { steamAppId: 413150, name: "Stardew Valley" },
  { steamAppId: 620, name: "Portal 2" },
  { steamAppId: 400, name: "Portal" },
  { steamAppId: 70, name: "Half-Life" },
  { steamAppId: 220, name: "Half-Life 2" },
  { steamAppId: 250900, name: "The Binding of Isaac: Rebirth" },
  { steamAppId: 367520, name: "Hollow Knight" },
  { steamAppId: 504230, name: "Celeste" },
  { steamAppId: 268910, name: "Cuphead" },
  { steamAppId: 1145360, name: "Hades" },
  { steamAppId: 646570, name: "Slay the Spire" },
  { steamAppId: 588650, name: "Dead Cells" },
  { steamAppId: 1091500, name: "Cyberpunk 2077" },
  { steamAppId: 292030, name: "The Witcher 3: Wild Hunt" },
  { steamAppId: 1245620, name: "ELDEN RING" },
  { steamAppId: 1086940, name: "Baldur's Gate 3" },
  { steamAppId: 1174180, name: "Red Dead Redemption 2" },
  { steamAppId: 271590, name: "Grand Theft Auto V Enhanced" },
  { steamAppId: 230410, name: "Warframe" },
  { steamAppId: 730, name: "Counter-Strike 2" },
  { steamAppId: 570, name: "Dota 2" },
  { steamAppId: 440, name: "Team Fortress 2" },
  { steamAppId: 578080, name: "PUBG: BATTLEGROUNDS" },
  { steamAppId: 252490, name: "Rust" },
  { steamAppId: 322330, name: "Don't Starve Together" },
  { steamAppId: 892970, name: "Valheim" },
  { steamAppId: 548430, name: "Deep Rock Galactic" },
  { steamAppId: 394360, name: "Hearts of Iron IV" },
  { steamAppId: 289070, name: "Sid Meier's Civilization VI" },
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim().toLowerCase();

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const results = starterGames
    .filter((game) => game.name.toLowerCase().includes(query))
    .slice(0, 20);

  return NextResponse.json({ results });
}
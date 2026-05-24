import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  throw new Error("Missing RESEND_API_KEY");
}

const resend = new Resend(resendApiKey);

type FreeGameEmailItem = {
  gameName: string;
  originalPrice: number | null;
  storeUrl: string | null;
};

type SendFreeGameAlertEmailParams = {
  to: string;
  games: FreeGameEmailItem[];
};

export async function sendFreeGameAlertEmail({
  to,
  games,
}: SendFreeGameAlertEmailParams) {
  const subject =
    games.length === 1
      ? `${games[0].gameName} is free to keep on Steam`
      : `${games.length} Steam games are free to keep`;

  const gameListHtml = games
    .map((game) => {
      const originalPriceText =
        game.originalPrice === null
          ? "Normally paid"
          : `$${game.originalPrice.toFixed(2)}`;

      return `
        <li style="margin-bottom: 18px;">
          <strong>${game.gameName}</strong><br />
          Original price: ${originalPriceText}<br />
          Current price: Free<br />
          ${
            game.storeUrl
              ? `<a href="${game.storeUrl}">View on Steam</a>`
              : ""
          }
        </li>
      `;
    })
    .join("");

  const { data, error } = await resend.emails.send({
    from: "Steam Sale Watcher <onboarding@resend.dev>",
    to,
    subject,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h1>Steam games free to keep</h1>

        <p>
          Steam Sale Watcher found the following normally paid Steam game${
            games.length === 1 ? "" : "s"
          } that appear to be temporarily free to keep.
        </p>

        <ul>
          ${gameListHtml}
        </ul>

        <p style="font-size: 13px; color: #555;">
          Free-to-keep detection uses curated deal sources and Steam verification. Promotions can change quickly.
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  throw new Error("Missing RESEND_API_KEY");
}

const resend = new Resend(resendApiKey);

type DigestDeal = {
  gameName: string;
  currentPrice: number | null;
  discountPercent: number | null;
  storeUrl: string | null;
};

type SendDailyDigestEmailParams = {
  to: string;
  deals: DigestDeal[];
};

export async function sendDailyDigestEmail({
  to,
  deals,
}: SendDailyDigestEmailParams) {
  const dealListHtml = deals
    .map((deal) => {
      const priceText =
        deal.currentPrice === null
          ? "Price unavailable"
          : `$${deal.currentPrice.toFixed(2)}`;

      const discountText =
        deal.discountPercent === null ? "0% off" : `${deal.discountPercent}% off`;

      return `
        <li style="margin-bottom: 16px;">
          <strong>${deal.gameName}</strong><br />
          Current price: ${priceText}<br />
          Discount: ${discountText}<br />
          ${
            deal.storeUrl
              ? `<a href="${deal.storeUrl}">View on Steam</a>`
              : ""
          }
        </li>
      `;
    })
    .join("");

  const { data, error } = await resend.emails.send({
    from: "Steam Sale Watcher <onboarding@resend.dev>",
    to,
    subject: "Your daily Steam Sale Watcher deal digest",
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h1>Your Steam Sale Watcher daily digest</h1>
        <p>These watched games currently match your alert rules:</p>
        <ul>
          ${dealListHtml}
        </ul>
      </div>
    `,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
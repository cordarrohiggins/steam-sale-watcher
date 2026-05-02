import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  throw new Error("Missing RESEND_API_KEY");
}

const resend = new Resend(resendApiKey);

type SendPriceAlertEmailParams = {
  to: string;
  gameName: string;
  currentPrice: number;
  targetPrice: number;
  storeUrl: string;
};

export async function sendPriceAlertEmail({
  to,
  gameName,
  currentPrice,
  targetPrice,
  storeUrl,
}: SendPriceAlertEmailParams) {
  const { data, error } = await resend.emails.send({
    from: "Steam Sale Watcher <onboarding@resend.dev>",
    to,
    subject: `${gameName} dropped below your target price`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h1>${gameName} is on sale</h1>
        <p>${gameName} is now <strong>$${currentPrice.toFixed(2)}</strong>.</p>
        <p>Your target price was <strong>$${targetPrice.toFixed(2)}</strong>.</p>
        <p>
          <a href="${storeUrl}">View it on Steam</a>
        </p>
      </div>
    `,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
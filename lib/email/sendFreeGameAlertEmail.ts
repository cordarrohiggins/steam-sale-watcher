import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;

if (!resendApiKey) {
  throw new Error("Missing RESEND_API_KEY");
}

const resend = new Resend(resendApiKey);

type SendFreeGameAlertEmailParams = {
  to: string;
  gameName: string;
  originalPrice: number | null;
  storeUrl: string | null;
};

export async function sendFreeGameAlertEmail({
  to,
  gameName,
  originalPrice,
  storeUrl,
}: SendFreeGameAlertEmailParams) {
  const originalPriceText =
    originalPrice === null ? "a paid price" : `$${originalPrice.toFixed(2)}`;

  const { data, error } = await resend.emails.send({
    from: "Steam Sale Watcher <onboarding@resend.dev>",
    to,
    subject: `${gameName} is free to keep on Steam`,
    html: `
      <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <h1>${gameName} is free to keep</h1>

        <p>
          Steam Sale Watcher found a normally paid Steam game that appears to be temporarily free to keep.
        </p>

        <p>
          Original price: ${originalPriceText}<br />
          Current price: Free
        </p>

        ${
          storeUrl
            ? `<p><a href="${storeUrl}">View it on Steam</a></p>`
            : ""
        }

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
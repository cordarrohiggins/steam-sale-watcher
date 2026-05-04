import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";
import { sendDailyDigestEmail } from "@/lib/email/sendDailyDigestEmail";

type DigestAlertRow = {
  id: string;
  user_id: string;
  price_at_alert: number | null;
  discount_at_alert: number | null;
  games: {
    name: string;
    store_url: string | null;
  } | null;
};

export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const expectedSecret = process.env.CHECK_PRICES_SECRET;

    if (!expectedSecret) {
      return NextResponse.json(
        { error: "Missing CHECK_PRICES_SECRET" },
        { status: 500 }
      );
    }

    if (authHeader !== `Bearer ${expectedSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: alerts, error: alertsError } = await supabaseServer
      .from("alerts_sent")
      .select(
        `
        id,
        user_id,
        price_at_alert,
        discount_at_alert,
        games (
          name,
          store_url
        )
      `
      )
      .eq("email_delivery_type", "daily_digest")
      .is("digest_email_sent_at", null)
      .order("sent_at", { ascending: true });

    if (alertsError) {
      return NextResponse.json(
        { error: alertsError.message },
        { status: 500 }
      );
    }

    const alertsByUser = new Map<string, DigestAlertRow[]>();

    for (const alert of (alerts ?? []) as unknown as DigestAlertRow[]) {
      const currentAlerts = alertsByUser.get(alert.user_id) ?? [];
      currentAlerts.push(alert);
      alertsByUser.set(alert.user_id, currentAlerts);
    }

    let digestEmailCount = 0;
    let includedAlertCount = 0;

    for (const [userId, userAlerts] of alertsByUser.entries()) {
      const { data: userData, error: userError } =
        await supabaseServer.auth.admin.getUserById(userId);

      if (userError) {
        throw new Error(userError.message);
      }

      const userEmail = userData.user?.email;

      if (!userEmail) {
        continue;
      }

      await sendDailyDigestEmail({
        to: userEmail,
        deals: userAlerts.map((alert) => ({
          gameName: alert.games?.name ?? "Unknown game",
          currentPrice: alert.price_at_alert,
          discountPercent: alert.discount_at_alert,
          storeUrl: alert.games?.store_url ?? null,
        })),
      });

      const alertIds = userAlerts.map((alert) => alert.id);

      const { error: updateError } = await supabaseServer
        .from("alerts_sent")
        .update({
          digest_email_sent_at: new Date().toISOString(),
        })
        .in("id", alertIds);

      if (updateError) {
        throw new Error(updateError.message);
      }

      digestEmailCount += 1;
      includedAlertCount += userAlerts.length;
    }

    return NextResponse.json({
      digestEmailCount,
      includedAlertCount,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to send daily digest",
      },
      { status: 500 }
    );
  }
}
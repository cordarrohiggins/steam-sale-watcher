import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabaseServer";

type DisplayTimeZone =
  | "auto"
  | "UTC"
  | "America/New_York"
  | "America/Chicago"
  | "America/Denver"
  | "America/Los_Angeles"
  | "America/Phoenix"
  | "America/Anchorage"
  | "Pacific/Honolulu"
  | "Europe/London"
  | "Europe/Paris"
  | "Asia/Tokyo"
  | "Australia/Sydney";

type UserSettingsRequest = {
  userId: string;
  emailAlertFrequency: "immediate" | "daily_digest" | "off";
  defaultAlertType: "target_price" | "target_discount";
  defaultHistoryRange: "1w" | "1m" | "3m" | "6m" | "1y" | "all";
  displayTimeZone: DisplayTimeZone;
  hideDlc: boolean;
  hideSoundtracks: boolean;
  hideDemos: boolean;
  hideExtras: boolean;
};

const defaultSettings = {
  email_alert_frequency: "immediate",
  default_alert_type: "target_price",
  default_history_range: "1m",
  display_time_zone: "auto",
  hide_dlc: true,
  hide_soundtracks: true,
  hide_demos: true,
  hide_extras: true,
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "Missing user ID" },
        { status: 400 }
      );
    }

    const { data: existingSettings, error: settingsError } =
      await supabaseServer
        .from("user_settings")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

    if (settingsError) {
      return NextResponse.json(
        { error: settingsError.message },
        { status: 500 }
      );
    }

    if (existingSettings) {
      return NextResponse.json({ settings: existingSettings });
    }

    const { data: createdSettings, error: createError } = await supabaseServer
      .from("user_settings")
      .insert({
        user_id: userId,
        ...defaultSettings,
      })
      .select()
      .single();

    if (createError) {
      return NextResponse.json(
        { error: createError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ settings: createdSettings });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to load settings",
      },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as UserSettingsRequest;

    const validEmailFrequencies = ["immediate", "daily_digest", "off"];
    const validAlertTypes = ["target_price", "target_discount"];
    const validHistoryRanges = ["1w", "1m", "3m", "6m", "1y", "all"];
    const validDisplayTimeZones = [
      "auto",
      "UTC",
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "America/Phoenix",
      "America/Anchorage",
      "Pacific/Honolulu",
      "Europe/London",
      "Europe/Paris",
      "Asia/Tokyo",
      "Australia/Sydney",
    ];

    if (
      !body.userId ||
      !validEmailFrequencies.includes(body.emailAlertFrequency) ||
      !validAlertTypes.includes(body.defaultAlertType) ||
      !validHistoryRanges.includes(body.defaultHistoryRange) ||
      !validDisplayTimeZones.includes(body.displayTimeZone)
    ) {
      return NextResponse.json(
        { error: "Missing or invalid settings information" },
        { status: 400 }
      );
    }

    const { data: settings, error } = await supabaseServer
      .from("user_settings")
      .upsert(
        {
          user_id: body.userId,
          email_alert_frequency: body.emailAlertFrequency,
          default_alert_type: body.defaultAlertType,
          default_history_range: body.defaultHistoryRange,
          display_time_zone: body.displayTimeZone,
          hide_dlc: body.hideDlc,
          hide_soundtracks: body.hideSoundtracks,
          hide_demos: body.hideDemos,
          hide_extras: body.hideExtras,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "user_id",
        }
      )
      .select()
      .single();

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ settings });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Unable to update settings",
      },
      { status: 500 }
    );
  }
}
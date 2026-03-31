import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = createServerClient();

  // Get the user's session to access their Google OAuth token
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const providerToken = session.provider_token;

  if (!providerToken) {
    return NextResponse.json(
      { error: "No Google token. Please re-login with Google to grant calendar access." },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const timeMin = searchParams.get("timeMin") || new Date().toISOString();
  const timeMax = searchParams.get("timeMax") || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  const maxResults = searchParams.get("maxResults") || "20";

  try {
    const calendarRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
        new URLSearchParams({
          timeMin,
          timeMax,
          maxResults,
          singleEvents: "true",
          orderBy: "startTime",
        }),
      {
        headers: {
          Authorization: `Bearer ${providerToken}`,
        },
      }
    );

    if (!calendarRes.ok) {
      const err = await calendarRes.json();
      return NextResponse.json(
        { error: err.error?.message || "Failed to fetch calendar events" },
        { status: calendarRes.status }
      );
    }

    const data = await calendarRes.json();

    const events = (data.items || []).map((event: {
      id: string;
      summary?: string;
      start?: { dateTime?: string; date?: string };
      end?: { dateTime?: string; date?: string };
      hangoutLink?: string;
      conferenceData?: { entryPoints?: { uri: string; entryPointType: string }[] };
      status?: string;
    }) => ({
      id: event.id,
      title: event.summary || "No title",
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      meetLink: event.hangoutLink || event.conferenceData?.entryPoints?.find(
        (e) => e.entryPointType === "video"
      )?.uri || null,
      status: event.status,
    }));

    return NextResponse.json(events);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Calendar fetch failed" },
      { status: 500 }
    );
  }
}

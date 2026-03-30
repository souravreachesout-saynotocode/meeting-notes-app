import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  const [meetingRes, transcriptRes, summaryRes] = await Promise.all([
    supabase.from("meetings").select("*").eq("id", id).single(),
    supabase.from("transcripts").select("*").eq("meeting_id", id).single(),
    supabase.from("summaries").select("*").eq("meeting_id", id).single(),
  ]);

  if (meetingRes.error) {
    return NextResponse.json(
      { error: "Meeting not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    ...meetingRes.data,
    transcript: transcriptRes.data,
    summary: summaryRes.data,
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("meetings")
    .update(body)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = createServerClient();

  // Delete audio from storage
  const { data: meeting } = await supabase
    .from("meetings")
    .select("audio_path")
    .eq("id", id)
    .single();

  if (meeting?.audio_path) {
    await supabase.storage.from("meeting-audio").remove([meeting.audio_path]);
  }

  const { error } = await supabase.from("meetings").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

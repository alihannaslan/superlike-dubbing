import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/get-user";
import { getDubbingResource, updateSegment, dubSegments } from "@/lib/elevenlabs";

// GET: Fetch all segments for a dubbing job
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const job = await prisma.dubbingJob.findFirst({
      where: { id, userId: user.id },
    });

    if (!job || !job.dubbingId) {
      return NextResponse.json({ error: "Job bulunamadı" }, { status: 404 });
    }

    const resource = await getDubbingResource(job.dubbingId);

    // Transform segments into a flat array sorted by start_time
    const segments = Object.entries(resource.speaker_segments).map(
      ([segmentId, segment]) => ({
        segmentId,
        startTime: segment.start_time,
        endTime: segment.end_time,
        sourceText: segment.text,
        targetText: segment.dubs[job.targetLang]?.text || "",
        audioStale: segment.dubs[job.targetLang]?.audio_stale ?? false,
      })
    );

    segments.sort((a, b) => a.startTime - b.startTime);

    return NextResponse.json({
      segments,
      sourceLang: resource.source_language,
      targetLang: job.targetLang,
    });
  } catch (error) {
    console.error("GET /api/dubbing/[id]/segments error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sunucu hatası" },
      { status: 500 }
    );
  }
}

// PATCH: Update segment text and optionally re-dub
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const job = await prisma.dubbingJob.findFirst({
      where: { id, userId: user.id },
    });

    if (!job || !job.dubbingId) {
      return NextResponse.json({ error: "Job bulunamadı" }, { status: 404 });
    }

    const { segmentId, text, startTime, endTime } = await req.json();

    if (!segmentId) {
      return NextResponse.json({ error: "segmentId gerekli" }, { status: 400 });
    }

    const updates: { text?: string; start_time?: number; end_time?: number } = {};
    if (text !== undefined) updates.text = text;
    if (startTime !== undefined) updates.start_time = startTime;
    if (endTime !== undefined) updates.end_time = endTime;

    await updateSegment(job.dubbingId, segmentId, job.targetLang, updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/dubbing/[id]/segments error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sunucu hatası" },
      { status: 500 }
    );
  }
}

// POST: Re-dub segments after editing
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;

    const job = await prisma.dubbingJob.findFirst({
      where: { id, userId: user.id },
    });

    if (!job || !job.dubbingId) {
      return NextResponse.json({ error: "Job bulunamadı" }, { status: 404 });
    }

    const { segmentIds } = await req.json();

    if (!segmentIds || !Array.isArray(segmentIds) || segmentIds.length === 0) {
      return NextResponse.json({ error: "segmentIds gerekli" }, { status: 400 });
    }

    await dubSegments(job.dubbingId, segmentIds, [job.targetLang]);

    // Update job status back to processing while re-dubbing
    await prisma.dubbingJob.update({
      where: { id: job.id },
      data: { status: "PROCESSING", completedAt: null, dubbedFilePath: null },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/dubbing/[id]/segments error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sunucu hatası" },
      { status: 500 }
    );
  }
}

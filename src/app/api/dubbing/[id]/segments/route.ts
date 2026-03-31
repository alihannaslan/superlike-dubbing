import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/get-user";
import {
  getDubbingResource,
  getTranscriptSRT,
  updateSegment,
  dubSegments,
} from "@/lib/elevenlabs";

interface SRTSegment {
  index: number;
  startTime: number;
  endTime: number;
  text: string;
}

function parseSRT(srt: string): SRTSegment[] {
  const segments: SRTSegment[] = [];
  const blocks = srt.trim().split(/\n\n+/);

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length < 3) continue;

    const index = parseInt(lines[0], 10);
    if (isNaN(index)) continue;

    const timeMatch = lines[1].match(
      /(\d{2}):(\d{2}):(\d{2})[,.](\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})[,.](\d{3})/
    );
    if (!timeMatch) continue;

    const startTime =
      parseInt(timeMatch[1]) * 3600 +
      parseInt(timeMatch[2]) * 60 +
      parseInt(timeMatch[3]) +
      parseInt(timeMatch[4]) / 1000;

    const endTime =
      parseInt(timeMatch[5]) * 3600 +
      parseInt(timeMatch[6]) * 60 +
      parseInt(timeMatch[7]) +
      parseInt(timeMatch[8]) / 1000;

    const text = lines.slice(2).join("\n").trim();
    segments.push({ index, startTime, endTime, text });
  }

  return segments;
}

// GET: Fetch segments — try resource API first (editable), fallback to SRT (read-only)
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

    // Try resource API first (available when dubbing_studio=true)
    try {
      const resource = await getDubbingResource(job.dubbingId);

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
        editable: true,
        targetLang: job.targetLang,
      });
    } catch {
      // Fallback to SRT transcript (read-only)
      const targetSRT = await getTranscriptSRT(job.dubbingId, job.targetLang);
      const segments = parseSRT(targetSRT);

      return NextResponse.json({
        segments: segments.map((s) => ({
          index: s.index,
          startTime: s.startTime,
          endTime: s.endTime,
          targetText: s.text,
        })),
        editable: false,
        targetLang: job.targetLang,
      });
    }
  } catch (error) {
    console.error("GET /api/dubbing/[id]/segments error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sunucu hatası" },
      { status: 500 }
    );
  }
}

// PATCH: Update segment text (only works with resource API / dubbing_studio)
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

    const { segmentId, text } = await req.json();

    if (!segmentId || text === undefined) {
      return NextResponse.json({ error: "segmentId ve text gerekli" }, { status: 400 });
    }

    await updateSegment(job.dubbingId, segmentId, job.targetLang, { text });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/dubbing/[id]/segments error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sunucu hatası" },
      { status: 500 }
    );
  }
}

// POST: Re-dub segments after editing (only works with resource API)
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

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/dubbing/[id]/segments error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sunucu hatası" },
      { status: 500 }
    );
  }
}

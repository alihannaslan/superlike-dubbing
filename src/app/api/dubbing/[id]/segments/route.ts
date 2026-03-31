import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/get-user";
import { getTranscriptSRT } from "@/lib/elevenlabs";

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

// GET: Fetch transcript segments from SRT
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

    // ElevenLabs only provides transcript for target language, not source
    const targetSRT = await getTranscriptSRT(job.dubbingId, job.targetLang);
    const segments = parseSRT(targetSRT);

    return NextResponse.json({
      segments: segments.map((s) => ({
        index: s.index,
        startTime: s.startTime,
        endTime: s.endTime,
        targetText: s.text,
      })),
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

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

    // Fetch both source and target transcripts
    const [sourceSRT, targetSRT] = await Promise.all([
      getTranscriptSRT(job.dubbingId, "tr"),
      getTranscriptSRT(job.dubbingId, job.targetLang),
    ]);

    const sourceSegments = parseSRT(sourceSRT);
    const targetSegments = parseSRT(targetSRT);

    // Merge by index
    const segments = sourceSegments.map((src) => {
      const target = targetSegments.find((t) => t.index === src.index);
      return {
        index: src.index,
        startTime: src.startTime,
        endTime: src.endTime,
        sourceText: src.text,
        targetText: target?.text || "",
      };
    });

    return NextResponse.json({
      segments,
      sourceLang: "tr",
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

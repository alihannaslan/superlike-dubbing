import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/get-user";
import {
  getDubbingResource,
  dubSegments,
  getDubbingStatus,
  getDubbedAudio,
  getTranscriptSRT,
} from "@/lib/elevenlabs";
import { burnSubtitles } from "@/lib/ffmpeg";

export const maxDuration = 600; // 10 minutes for processing

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const { subtitleEnabled } = await req.json();

    const job = await prisma.dubbingJob.findFirst({
      where: { id, userId: user.id },
    });

    if (!job || !job.dubbingId) {
      return NextResponse.json({ error: "Job bulunamadı" }, { status: 404 });
    }

    // Update job with subtitle preference
    await prisma.dubbingJob.update({
      where: { id: job.id },
      data: {
        subtitleEnabled: !!subtitleEnabled,
        status: "FINALIZING",
        completedAt: null,
        dubbedFilePath: null,
      },
    });

    // Check if any segments need re-dubbing
    const resource = await getDubbingResource(job.dubbingId);
    const staleSegmentIds = Object.entries(resource.speaker_segments)
      .filter(([, seg]) => seg.dubs[job.targetLang]?.audio_stale)
      .map(([segId]) => segId);

    if (staleSegmentIds.length > 0) {
      // Re-dub stale segments
      await dubSegments(job.dubbingId, staleSegmentIds, [job.targetLang]);

      // Poll until re-dubbing is complete
      let attempts = 0;
      const maxAttempts = 120; // 10 minutes max
      while (attempts < maxAttempts) {
        await new Promise((r) => setTimeout(r, 5000));
        const status = await getDubbingStatus(job.dubbingId);
        if (status.status === "dubbed") break;
        if (status.error) {
          await prisma.dubbingJob.update({
            where: { id: job.id },
            data: { status: "FAILED", errorMessage: status.error },
          });
          return NextResponse.json({ error: status.error }, { status: 500 });
        }
        attempts++;
      }
    }

    // Download dubbed video
    const audioBuffer = await getDubbedAudio(job.dubbingId, job.targetLang);
    const dubbedFileName = `${job.dubbingId}-${job.targetLang}.mp4`;
    const dubbedPath = path.join(process.cwd(), "dubbed", dubbedFileName);
    await writeFile(dubbedPath, audioBuffer);

    let finalPath = dubbedPath;

    // Burn subtitles if requested
    if (subtitleEnabled) {
      const srtContent = await getTranscriptSRT(job.dubbingId, job.targetLang);
      const subtitledPath = path.join(
        process.cwd(),
        "dubbed",
        `${job.dubbingId}-${job.targetLang}-subtitled.mp4`
      );
      await burnSubtitles(dubbedPath, srtContent, subtitledPath);
      finalPath = subtitledPath;
    }

    await prisma.dubbingJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        dubbedFilePath: finalPath,
        completedAt: new Date(),
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/dubbing/[id]/finalize error:", error);

    // Try to update job status to failed
    try {
      const { id } = await params;
      await prisma.dubbingJob.update({
        where: { id },
        data: {
          status: "FAILED",
          errorMessage: error instanceof Error ? error.message : "Finalize hatası",
        },
      });
    } catch {}

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sunucu hatası" },
      { status: 500 }
    );
  }
}

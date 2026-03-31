import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/get-user";
import { getDubbedAudio, getTranscriptSRT } from "@/lib/elevenlabs";
import { burnSubtitles } from "@/lib/ffmpeg";

export const maxDuration = 600;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { subtitleEnabled } = await req.json();

    const job = await prisma.dubbingJob.findFirst({
      where: { id, userId: user.id },
    });

    if (!job || !job.dubbingId) {
      return NextResponse.json({ error: "Job bulunamadı" }, { status: 404 });
    }

    await prisma.dubbingJob.update({
      where: { id: job.id },
      data: {
        subtitleEnabled: !!subtitleEnabled,
        status: "FINALIZING",
        completedAt: null,
        dubbedFilePath: null,
      },
    });

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

    try {
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

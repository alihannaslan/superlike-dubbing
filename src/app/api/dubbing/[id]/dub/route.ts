import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/get-user";
import { getDubbedAudio } from "@/lib/elevenlabs";
import { extractFrame } from "@/lib/ffmpeg";

export const maxDuration = 600;

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const job = await prisma.dubbingJob.findFirst({
      where: { id, userId: user.id },
    });

    if (!job || !job.dubbingId) {
      return NextResponse.json({ error: "Job bulunamadı" }, { status: 404 });
    }

    await prisma.dubbingJob.update({
      where: { id: job.id },
      data: {
        status: "DUBBING",
        completedAt: null,
        dubbedFilePath: null,
        intermediateFilePath: null,
        previewFramePath: null,
      },
    });

    const audioBuffer = await getDubbedAudio(job.dubbingId, job.targetLang);
    const dubbedFileName = `${job.dubbingId}-${job.targetLang}.mp4`;
    const dubbedPath = path.join(process.cwd(), "dubbed", dubbedFileName);
    await writeFile(dubbedPath, audioBuffer);

    const framePath = path.join(
      process.cwd(),
      "dubbed",
      `${job.dubbingId}-${job.targetLang}-frame.jpg`
    );
    try {
      await extractFrame(dubbedPath, framePath, 1);
    } catch (frameErr) {
      console.error("Frame extract failed, continuing without preview:", frameErr);
    }

    await prisma.dubbingJob.update({
      where: { id: job.id },
      data: {
        status: "SUBTITLE_REVIEW",
        intermediateFilePath: dubbedPath,
        previewFramePath: framePath,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/dubbing/[id]/dub error:", error);

    try {
      await prisma.dubbingJob.update({
        where: { id },
        data: {
          status: "FAILED",
          errorMessage: error instanceof Error ? error.message : "Dublaj hatası",
        },
      });
    } catch {}

    return NextResponse.json(
      { error: "Bir hata oluştu, lütfen tekrar deneyin" },
      { status: 500 }
    );
  }
}

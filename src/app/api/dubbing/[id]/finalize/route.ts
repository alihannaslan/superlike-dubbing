import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { copyFile, unlink } from "fs/promises";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/get-user";
import { getTranscriptSRT } from "@/lib/elevenlabs";
import { burnSubtitles, SUBTITLE_FONTS, type SubtitleStyle } from "@/lib/ffmpeg";

export const maxDuration = 600;

interface FinalizeBody {
  subtitleEnabled: boolean;
  style?: {
    font?: string;
    size?: number;
    color?: string;
    bgColor?: string;
    bgOpacity?: number;
  };
}

function isHexColor(value: string): boolean {
  return /^#[0-9A-Fa-f]{6}$/.test(value);
}

function validateStyle(input: FinalizeBody["style"]): SubtitleStyle | null {
  if (!input) return null;
  const fontMatch = SUBTITLE_FONTS.find((f) => f.ffmpegName === input.font);
  if (!fontMatch) return null;
  const size = Number(input.size);
  if (!Number.isFinite(size) || size < 10 || size > 40) return null;
  if (!input.color || !isHexColor(input.color)) return null;
  if (!input.bgColor || !isHexColor(input.bgColor)) return null;
  const opacity = Number(input.bgOpacity);
  if (!Number.isFinite(opacity) || opacity < 0 || opacity > 100) return null;
  return {
    font: fontMatch.ffmpegName,
    size,
    color: input.color,
    bgColor: input.bgColor,
    bgOpacity: opacity,
  };
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = (await req.json()) as FinalizeBody;
    const { subtitleEnabled } = body;

    let style: SubtitleStyle | null = null;
    if (subtitleEnabled) {
      style = validateStyle(body.style);
      if (!style) {
        return NextResponse.json(
          { error: "Geçersiz altyazı ayarları" },
          { status: 400 }
        );
      }
    }

    const job = await prisma.dubbingJob.findFirst({
      where: { id, userId: user.id },
    });

    if (!job || !job.dubbingId || !job.intermediateFilePath) {
      return NextResponse.json({ error: "Job bulunamadı" }, { status: 404 });
    }

    await prisma.dubbingJob.update({
      where: { id: job.id },
      data: {
        status: "FINALIZING",
        subtitleEnabled,
        subtitleFont: style?.font ?? null,
        subtitleSize: style?.size ?? null,
        subtitleColor: style?.color ?? null,
        subtitleBgColor: style?.bgColor ?? null,
        subtitleBgOpacity: style?.bgOpacity ?? null,
        completedAt: null,
      },
    });

    const subtitledPath = path.join(
      process.cwd(),
      "dubbed",
      `${job.dubbingId}-${job.targetLang}-subtitled.mp4`
    );
    const noSubsPath = path.join(
      process.cwd(),
      "dubbed",
      `${job.dubbingId}-${job.targetLang}-final.mp4`
    );

    let finalPath: string;

    if (subtitleEnabled && style) {
      const srtContent = await getTranscriptSRT(job.dubbingId, job.targetLang);
      await burnSubtitles(job.intermediateFilePath, srtContent, subtitledPath, style);
      finalPath = subtitledPath;
      await unlink(noSubsPath).catch(() => {});
    } else {
      await copyFile(job.intermediateFilePath, noSubsPath);
      finalPath = noSubsPath;
      await unlink(subtitledPath).catch(() => {});
      await unlink(subtitledPath.replace(/\.mp4$/, ".srt")).catch(() => {});
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
      { error: "Bir hata oluştu, lütfen tekrar deneyin" },
      { status: 500 }
    );
  }
}

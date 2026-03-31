export const maxDuration = 300; // 5 minutes for large uploads

import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/get-user";
import { createDubbing } from "@/lib/elevenlabs";
import { SUPPORTED_LANGUAGES } from "@/lib/languages";

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const ALLOWED_TYPES = ["video/mp4", "video/quicktime", "audio/mpeg", "audio/wav"];

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const targetLang = formData.get("targetLang") as string | null;

    if (!file || !targetLang) {
      return NextResponse.json({ error: "Dosya ve hedef dil gerekli" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Dosya boyutu 500MB'ı aşamaz" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase();
    const ALLOWED_EXTENSIONS = ["mp4", "mov", "mp3", "wav"];
    if (!ext || !ALLOWED_EXTENSIONS.includes(ext)) {
      return NextResponse.json({ error: "Sadece MP4, MOV, MP3, WAV dosyaları kabul edilir" }, { status: 400 });
    }

    const language = SUPPORTED_LANGUAGES.find((l) => l.code === targetLang);
    if (!language) {
      return NextResponse.json({ error: "Geçersiz dil seçimi" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const uniqueName = `${Date.now()}-${file.name}`;
    const filePath = path.join(process.cwd(), "uploads", uniqueName);
    await writeFile(filePath, buffer);

    const job = await prisma.dubbingJob.create({
      data: {
        userId: user.id,
        originalFileName: file.name,
        originalFilePath: filePath,
        originalFileSize: file.size,
        targetLang: language.code,
        targetLangName: language.name,
        status: "UPLOADING",
      },
    });

    try {
      const result = await createDubbing(buffer, file.name, targetLang);
      await prisma.dubbingJob.update({
        where: { id: job.id },
        data: {
          dubbingId: result.dubbing_id,
          expectedDuration: Math.ceil(result.expected_duration_sec),
          status: "PROCESSING",
        },
      });
    } catch (error) {
      await prisma.dubbingJob.update({
        where: { id: job.id },
        data: {
          status: "FAILED",
          errorMessage: error instanceof Error ? error.message : "Bilinmeyen hata",
        },
      });
    }

    return NextResponse.json({ id: job.id });
  } catch (error) {
    console.error("POST /api/dubbing error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sunucu hatası" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const jobs = await prisma.dubbingJob.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      originalFileName: true,
      targetLang: true,
      targetLangName: true,
      status: true,
      createdAt: true,
      completedAt: true,
    },
  });

  return NextResponse.json(jobs);
}

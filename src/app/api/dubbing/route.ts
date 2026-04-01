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

    // Per-user daily job limit
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dailyJobCount = await prisma.dubbingJob.count({
      where: { userId: user.id, createdAt: { gte: today } },
    });
    if (dailyJobCount >= 20) {
      return NextResponse.json(
        { error: "Günlük çeviri limitine ulaştınız (max 20)" },
        { status: 429 }
      );
    }

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
    const safeFileName = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
    const filePath = path.join(process.cwd(), "uploads", safeFileName);
    const resolved = path.resolve(filePath);
    if (!resolved.startsWith(path.resolve(process.cwd(), "uploads"))) {
      return NextResponse.json({ error: "Geçersiz dosya adı" }, { status: 400 });
    }
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
      { error: "Bir hata oluştu, lütfen tekrar deneyin" },
      { status: 500 }
    );
  }
}

export async function GET() {
  const user = await getUser();
  if (!user || !user.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  console.log("GET /api/dubbing — userId:", user.id, "email:", user.email);

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

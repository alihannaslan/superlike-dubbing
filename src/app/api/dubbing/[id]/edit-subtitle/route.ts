import { NextRequest, NextResponse } from "next/server";
import { access } from "fs/promises";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/get-user";

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

    if (!job) {
      return NextResponse.json({ error: "Job bulunamadı" }, { status: 404 });
    }

    if (job.status !== "COMPLETED") {
      return NextResponse.json(
        { error: "Sadece tamamlanmış işlerde düzenleme yapılabilir" },
        { status: 400 }
      );
    }

    if (!job.intermediateFilePath) {
      return NextResponse.json(
        { error: "Ara dosya kayıtlı değil" },
        { status: 400 }
      );
    }

    try {
      await access(job.intermediateFilePath);
    } catch {
      return NextResponse.json(
        { error: "Ara dosya bulunamadı, yeni job başlatın" },
        { status: 400 }
      );
    }

    const result = await prisma.dubbingJob.updateMany({
      where: { id: job.id, status: "COMPLETED" },
      data: {
        status: "SUBTITLE_REVIEW",
        completedAt: null,
        dubbedFilePath: null,
      },
    });

    if (result.count === 0) {
      return NextResponse.json(
        { error: "Sadece tamamlanmış işlerde düzenleme yapılabilir" },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("POST /api/dubbing/[id]/edit-subtitle error:", error);
    return NextResponse.json(
      { error: "Bir hata oluştu, lütfen tekrar deneyin" },
      { status: 500 }
    );
  }
}

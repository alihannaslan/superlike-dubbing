import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/get-user";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const job = await prisma.dubbingJob.findFirst({
    where: { id, userId: user.id },
    select: { previewFramePath: true },
  });

  if (!job || !job.previewFramePath) {
    return NextResponse.json({ error: "Önizleme yok" }, { status: 404 });
  }

  try {
    const fileBuffer = await readFile(job.previewFramePath);
    return new NextResponse(fileBuffer, {
      headers: {
        "Content-Type": "image/jpeg",
        "Cache-Control": "private, max-age=300",
      },
    });
  } catch {
    return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 404 });
  }
}

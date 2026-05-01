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
    where: { id, userId: user.id, status: "COMPLETED" },
  });

  if (!job || !job.dubbedFilePath) {
    return NextResponse.json({ error: "Dosya bulunamadı" }, { status: 404 });
  }

  const fileBuffer = await readFile(job.dubbedFilePath);
  const rawName = `${job.originalFileName.replace(/\.[^.]+$/, "")}-${job.targetLangName}.mp4`;
  const safeName = rawName.replace(/[^\w.\-]/g, "_");

  if (!job.downloadedAt) {
    await prisma.dubbingJob.update({
      where: { id: job.id },
      data: { downloadedAt: new Date() },
    });
  }

  return new NextResponse(fileBuffer, {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Disposition": `attachment; filename="${safeName}"`,
    },
  });
}

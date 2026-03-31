import { NextRequest, NextResponse } from "next/server";
import { writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/get-user";
import { getDubbingStatus, getDubbedAudio } from "@/lib/elevenlabs";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  const job = await prisma.dubbingJob.findFirst({
    where: { id, userId: user.id },
  });

  if (!job) {
    return NextResponse.json({ error: "Job bulunamadı" }, { status: 404 });
  }

  if (!job.dubbingId || job.status === "COMPLETED" || job.status === "FAILED") {
    return NextResponse.json({ status: job.status });
  }

  try {
    const result = await getDubbingStatus(job.dubbingId);

    if (result.status === "dubbed") {
      const audioBuffer = await getDubbedAudio(job.dubbingId, job.targetLang);
      const dubbedFileName = `${job.dubbingId}-${job.targetLang}.mp4`;
      const dubbedPath = path.join(process.cwd(), "dubbed", dubbedFileName);
      await writeFile(dubbedPath, audioBuffer);

      await prisma.dubbingJob.update({
        where: { id: job.id },
        data: {
          status: "COMPLETED",
          dubbedFilePath: dubbedPath,
          completedAt: new Date(),
        },
      });

      return NextResponse.json({ status: "COMPLETED" });
    }

    if (result.error) {
      await prisma.dubbingJob.update({
        where: { id: job.id },
        data: { status: "FAILED", errorMessage: result.error },
      });
      return NextResponse.json({ status: "FAILED", error: result.error });
    }

    return NextResponse.json({ status: "PROCESSING" });
  } catch (error) {
    return NextResponse.json({
      status: "PROCESSING",
      error: error instanceof Error ? error.message : "Status check failed",
    });
  }
}

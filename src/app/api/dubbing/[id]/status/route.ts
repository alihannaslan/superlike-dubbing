import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/get-user";
import { getDubbingStatus } from "@/lib/elevenlabs";

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

  // Terminal states — no polling needed
  if (!job.dubbingId || ["COMPLETED", "FAILED", "REVIEW"].includes(job.status)) {
    return NextResponse.json({ status: job.status });
  }

  try {
    const result = await getDubbingStatus(job.dubbingId);

    if (result.status === "dubbed") {
      // Move to REVIEW — user needs to approve translations before finalizing
      await prisma.dubbingJob.update({
        where: { id: job.id },
        data: { status: "REVIEW" },
      });

      return NextResponse.json({ status: "REVIEW" });
    }

    if (result.error) {
      await prisma.dubbingJob.update({
        where: { id: job.id },
        data: { status: "FAILED", errorMessage: result.error },
      });
      return NextResponse.json({ status: "FAILED", error: result.error });
    }

    return NextResponse.json({ status: job.status });
  } catch (error) {
    return NextResponse.json({
      status: job.status,
      error: error instanceof Error ? error.message : "Status check failed",
    });
  }
}

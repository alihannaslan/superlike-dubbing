import { NextRequest, NextResponse } from "next/server";
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
  });

  if (!job) {
    return NextResponse.json({ error: "Job bulunamadı" }, { status: 404 });
  }

  const {
    originalFilePath: _originalFilePath,
    dubbedFilePath: _dubbedFilePath,
    intermediateFilePath: _intermediateFilePath,
    previewFramePath,
    ...safe
  } = job;

  return NextResponse.json({
    ...safe,
    hasPreviewFrame: !!previewFramePath,
  });
}

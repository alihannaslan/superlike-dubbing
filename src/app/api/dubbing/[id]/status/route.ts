import { NextRequest, NextResponse } from "next/server";
import { readFile } from "fs/promises";
import { prisma } from "@/lib/db";
import { getUser } from "@/lib/get-user";
import {
  createDubbingFromCsv,
  getDubbingStatus,
  getTranscriptSRT,
} from "@/lib/elevenlabs";
import {
  applyGlossary,
  buildDubbingCsv,
  parseBrandTerms,
  parseSRT,
} from "@/lib/glossary";

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

  // Skip ElevenLabs check for our internal post-review states
  if (
    !job.dubbingId ||
    ["COMPLETED", "FAILED", "REVIEW", "DUBBING", "SUBTITLE_REVIEW", "FINALIZING"].includes(
      job.status
    )
  ) {
    return NextResponse.json({ status: job.status });
  }

  try {
    const result = await getDubbingStatus(job.dubbingId);

    if (result.status === "dubbed") {
      const brands = parseBrandTerms(job.brandTerms);
      const shouldApplyGlossary = brands.length > 0 && !job.glossaryApplied;

      if (shouldApplyGlossary) {
        try {
          // ElevenLabs public API only exposes target-language transcript.
          // We apply glossary to target only and reuse it for the CSV's
          // transcription column too — manual mode TTS uses the translation
          // column, so source-language fidelity is not critical here.
          const targetSrt = await getTranscriptSRT(job.dubbingId, job.targetLang);
          const targetSegs = parseSRT(targetSrt);
          const hasMatch = targetSegs.some(
            (s) => applyGlossary(s.text, brands) !== s.text
          );

          if (hasMatch && targetSegs.length > 0) {
            const { csv } = buildDubbingCsv(targetSegs, targetSegs, brands);
            const buffer = await readFile(job.originalFilePath);
            const csvDub = await createDubbingFromCsv(
              buffer,
              job.originalFileName,
              csv,
              job.sourceLang,
              job.targetLang
            );
            await prisma.dubbingJob.update({
              where: { id: job.id },
              data: {
                dubbingId: csvDub.dubbing_id,
                expectedDuration: Math.ceil(csvDub.expected_duration_sec),
                glossaryApplied: true,
                status: "PROCESSING",
              },
            });
            return NextResponse.json({ status: "PROCESSING" });
          }

          // No matches found — mark glossary as applied to avoid retry loops
          await prisma.dubbingJob.update({
            where: { id: job.id },
            data: { glossaryApplied: true, status: "REVIEW" },
          });
          return NextResponse.json({ status: "REVIEW" });
        } catch (glossaryErr) {
          console.error("Glossary CSV re-dub failed:", glossaryErr);
          // Fall through to normal REVIEW so user isn't blocked
          await prisma.dubbingJob.update({
            where: { id: job.id },
            data: { glossaryApplied: true, status: "REVIEW" },
          });
          return NextResponse.json({ status: "REVIEW" });
        }
      }

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
      return NextResponse.json({ status: "FAILED", error: "Çeviri başarısız oldu" });
    }

    return NextResponse.json({ status: job.status });
  } catch (error) {
    return NextResponse.json({
      status: job.status,
      error: error instanceof Error ? error.message : "Status check failed",
    });
  }
}

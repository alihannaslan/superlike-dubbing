-- AlterTable
ALTER TABLE "DubbingJob" ADD COLUMN     "brandTerms" TEXT,
ADD COLUMN     "glossaryApplied" BOOLEAN NOT NULL DEFAULT false;

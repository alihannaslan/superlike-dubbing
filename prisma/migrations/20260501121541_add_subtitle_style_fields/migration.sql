-- AlterTable
ALTER TABLE "DubbingJob" ADD COLUMN     "intermediateFilePath" TEXT,
ADD COLUMN     "previewFramePath" TEXT,
ADD COLUMN     "subtitleBgColor" TEXT,
ADD COLUMN     "subtitleBgOpacity" INTEGER,
ADD COLUMN     "subtitleColor" TEXT,
ADD COLUMN     "subtitleFont" TEXT,
ADD COLUMN     "subtitleSize" INTEGER;

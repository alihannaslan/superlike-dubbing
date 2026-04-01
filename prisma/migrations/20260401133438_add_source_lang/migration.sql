-- AlterTable
ALTER TABLE "DubbingJob" ADD COLUMN     "sourceLang" TEXT NOT NULL DEFAULT 'tr',
ADD COLUMN     "sourceLangName" TEXT NOT NULL DEFAULT 'Türkçe';

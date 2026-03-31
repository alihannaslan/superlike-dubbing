-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DubbingJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "originalFileName" TEXT NOT NULL,
    "originalFilePath" TEXT NOT NULL,
    "originalFileSize" INTEGER NOT NULL,
    "targetLang" TEXT NOT NULL,
    "targetLangName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "dubbingId" TEXT,
    "expectedDuration" INTEGER,
    "dubbedFilePath" TEXT,
    "subtitleEnabled" BOOLEAN NOT NULL DEFAULT false,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" DATETIME,
    CONSTRAINT "DubbingJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DubbingJob" ("completedAt", "createdAt", "dubbedFilePath", "dubbingId", "errorMessage", "expectedDuration", "id", "originalFileName", "originalFilePath", "originalFileSize", "status", "targetLang", "targetLangName", "userId") SELECT "completedAt", "createdAt", "dubbedFilePath", "dubbingId", "errorMessage", "expectedDuration", "id", "originalFileName", "originalFilePath", "originalFileSize", "status", "targetLang", "targetLangName", "userId" FROM "DubbingJob";
DROP TABLE "DubbingJob";
ALTER TABLE "new_DubbingJob" RENAME TO "DubbingJob";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

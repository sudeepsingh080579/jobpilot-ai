-- Resume versions (ATS-enhanced copies; the uploaded original is never modified)
CREATE TABLE "ResumeVersion" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resumeId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "targetRole" TEXT NOT NULL DEFAULT '',
    "content" TEXT NOT NULL DEFAULT '{}',
    "atsBefore" INTEGER NOT NULL DEFAULT 0,
    "atsAfter" INTEGER NOT NULL DEFAULT 0,
    "detail" TEXT NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ResumeVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "ResumeVersion_resumeId_version_key" ON "ResumeVersion"("resumeId", "version");
CREATE INDEX "ResumeVersion_userId_createdAt_idx" ON "ResumeVersion"("userId", "createdAt");
ALTER TABLE "ResumeVersion" ADD CONSTRAINT "ResumeVersion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ResumeVersion" ADD CONSTRAINT "ResumeVersion_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hunt settings: daily schedule, freshness, abroad rules
ALTER TABLE "HuntSettings"
  ADD COLUMN "autoRunHour" INTEGER NOT NULL DEFAULT 8,
  ADD COLUMN "autoRunMinute" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  ADD COLUMN "lastAutoRunAt" TIMESTAMP(3),
  ADD COLUMN "freshnessDays" INTEGER NOT NULL DEFAULT 3,
  ADD COLUMN "includeUnknownDate" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "remoteAbroad" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "hybridAbroad" BOOLEAN NOT NULL DEFAULT false,
  ALTER COLUMN "companiesPerRun" SET DEFAULT 300;
UPDATE "HuntSettings" SET "companiesPerRun" = 300 WHERE "companiesPerRun" IN (25, 60);

ALTER TABLE "HuntRun"
  ADD COLUMN "stale" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "undated" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "locationSkipped" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "HuntJob"
  ADD COLUMN "tailoredContent" TEXT NOT NULL DEFAULT '{}',
  ADD COLUMN "postedAt" TIMESTAMP(3),
  ADD COLUMN "dateKind" TEXT NOT NULL DEFAULT 'unknown',
  ADD COLUMN "source" TEXT NOT NULL DEFAULT 'ats';

-- In-app notifications
CREATE TABLE "UserNotice" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL DEFAULT 'hunt',
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "href" TEXT NOT NULL DEFAULT '',
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserNotice_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "UserNotice_userId_createdAt_idx" ON "UserNotice"("userId", "createdAt");
ALTER TABLE "UserNotice" ADD CONSTRAINT "UserNotice_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

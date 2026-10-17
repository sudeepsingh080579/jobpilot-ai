-- CreateTable
CREATE TABLE "HuntCompany" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ats" TEXT NOT NULL,
    "boardToken" TEXT NOT NULL,
    "industry" TEXT NOT NULL DEFAULT '',
    "source" TEXT NOT NULL DEFAULT 'user',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastFetchedAt" TIMESTAMP(3),
    "lastStatus" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HuntCompany_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HuntSettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "threshold" INTEGER NOT NULL DEFAULT 70,
    "allowedCountries" TEXT[] DEFAULT ARRAY['India', 'United Arab Emirates', 'United Kingdom', 'Germany', 'Netherlands']::TEXT[],
    "allowUsWithSponsorship" BOOLEAN NOT NULL DEFAULT true,
    "needsSponsorship" BOOLEAN NOT NULL DEFAULT false,
    "homeCountry" TEXT NOT NULL DEFAULT 'India',
    "companiesPerRun" INTEGER NOT NULL DEFAULT 25,
    "autoRun" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HuntSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HuntRun" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trigger" TEXT NOT NULL DEFAULT 'manual',
    "status" TEXT NOT NULL DEFAULT 'running',
    "companies" INTEGER NOT NULL DEFAULT 0,
    "fetched" INTEGER NOT NULL DEFAULT 0,
    "relevant" INTEGER NOT NULL DEFAULT 0,
    "fresh" INTEGER NOT NULL DEFAULT 0,
    "queued" INTEGER NOT NULL DEFAULT 0,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT NOT NULL DEFAULT '[]',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "HuntRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HuntJob" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "runId" TEXT,
    "company" TEXT NOT NULL,
    "ats" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT NOT NULL DEFAULT '',
    "country" TEXT NOT NULL DEFAULT '',
    "url" TEXT NOT NULL,
    "score" INTEGER NOT NULL DEFAULT 0,
    "scoreDetail" TEXT NOT NULL DEFAULT '{}',
    "decision" TEXT NOT NULL,
    "skipReason" TEXT NOT NULL DEFAULT '',
    "tailored" TEXT NOT NULL DEFAULT '',
    "answers" TEXT NOT NULL DEFAULT '[]',
    "needsInput" TEXT[],
    "appliedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HuntJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SavedAnswer" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "HuntCompany_userId_idx" ON "HuntCompany"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "HuntCompany_userId_ats_boardToken_key" ON "HuntCompany"("userId", "ats", "boardToken");

-- CreateIndex
CREATE UNIQUE INDEX "HuntSettings_userId_key" ON "HuntSettings"("userId");

-- CreateIndex
CREATE INDEX "HuntRun_userId_startedAt_idx" ON "HuntRun"("userId", "startedAt");

-- CreateIndex
CREATE INDEX "HuntJob_userId_decision_idx" ON "HuntJob"("userId", "decision");

-- CreateIndex
CREATE UNIQUE INDEX "HuntJob_userId_key_key" ON "HuntJob"("userId", "key");

-- CreateIndex
CREATE INDEX "SavedAnswer_userId_idx" ON "SavedAnswer"("userId");

-- AddForeignKey
ALTER TABLE "HuntCompany" ADD CONSTRAINT "HuntCompany_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HuntSettings" ADD CONSTRAINT "HuntSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HuntRun" ADD CONSTRAINT "HuntRun_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HuntJob" ADD CONSTRAINT "HuntJob_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedAnswer" ADD CONSTRAINT "SavedAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


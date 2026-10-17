-- CreateTable
CREATE TABLE "UpiPayment" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ref" TEXT NOT NULL,
    "utr" TEXT NOT NULL,
    "amountPaise" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "note" TEXT NOT NULL DEFAULT '',
    "periodEnd" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UpiPayment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "id" TEXT NOT NULL,
    "actorEmail" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "detail" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UpiPayment_ref_key" ON "UpiPayment"("ref");

-- CreateIndex
CREATE UNIQUE INDEX "UpiPayment_utr_key" ON "UpiPayment"("utr");

-- CreateIndex
CREATE INDEX "UpiPayment_status_createdAt_idx" ON "UpiPayment"("status", "createdAt");

-- CreateIndex
CREATE INDEX "UpiPayment_userId_idx" ON "UpiPayment"("userId");

-- CreateIndex
CREATE INDEX "AdminAuditLog_targetType_targetId_idx" ON "AdminAuditLog"("targetType", "targetId");

-- AddForeignKey
ALTER TABLE "UpiPayment" ADD CONSTRAINT "UpiPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;


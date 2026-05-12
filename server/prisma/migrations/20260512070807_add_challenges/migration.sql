-- CreateTable
CREATE TABLE "Challenge" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "targetValue" INTEGER NOT NULL,
    "durationDays" INTEGER NOT NULL,
    "entryFee" INTEGER NOT NULL,
    "rewardXp" INTEGER NOT NULL,
    "rewardCredits" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserChallenge" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "challengeId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "progressData" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserChallenge_userId_status_idx" ON "UserChallenge"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "UserChallenge_userId_challengeId_key" ON "UserChallenge"("userId", "challengeId");

-- AddForeignKey
ALTER TABLE "UserChallenge" ADD CONSTRAINT "UserChallenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserChallenge" ADD CONSTRAINT "UserChallenge_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

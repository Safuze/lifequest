-- CreateTable
CREATE TABLE "ActiveBooster" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL DEFAULT 2.0,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "stackable" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ActiveBooster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermanentPerk" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "bonusPercent" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PermanentPerk_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActiveBooster_userId_expiresAt_idx" ON "ActiveBooster"("userId", "expiresAt");

-- CreateIndex
CREATE INDEX "PermanentPerk_userId_idx" ON "PermanentPerk"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "PermanentPerk_userId_type_key" ON "PermanentPerk"("userId", "type");

-- AddForeignKey
ALTER TABLE "ActiveBooster" ADD CONSTRAINT "ActiveBooster_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermanentPerk" ADD CONSTRAINT "PermanentPerk_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

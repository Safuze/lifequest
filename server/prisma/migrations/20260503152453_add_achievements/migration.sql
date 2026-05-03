/*
  Warnings:

  - You are about to drop the column `earnedAt` on the `Achievement` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,type]` on the table `Achievement` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Achievement" DROP COLUMN "earnedAt",
ADD COLUMN     "description" TEXT NOT NULL DEFAULT 'Описание достижения',
ADD COLUMN     "icon" TEXT NOT NULL DEFAULT '🏆',
ADD COLUMN     "rarity" TEXT NOT NULL DEFAULT 'common';

-- CreateIndex
CREATE UNIQUE INDEX "Achievement_userId_type_key" ON "Achievement"("userId", "type");

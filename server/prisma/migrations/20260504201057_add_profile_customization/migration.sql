/*
  Warnings:

  - You are about to drop the column `characterClass` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Achievement" ALTER COLUMN "description" SET DEFAULT '';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "characterClass",
ADD COLUMN     "avatarBorder" TEXT NOT NULL DEFAULT 'none',
ADD COLUMN     "profileBg" TEXT NOT NULL DEFAULT 'default';

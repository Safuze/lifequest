-- AlterTable
ALTER TABLE "User" ADD COLUMN     "activePomodoroSound" TEXT DEFAULT 'default',
ADD COLUMN     "activePomodoroTimer" TEXT DEFAULT 'default';

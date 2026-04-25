-- CreateTable
CREATE TABLE "PomodoroSettings" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "workDuration" INTEGER NOT NULL DEFAULT 25,
    "shortBreak" INTEGER NOT NULL DEFAULT 5,
    "longBreak" INTEGER NOT NULL DEFAULT 15,
    "cyclesBeforeLong" INTEGER NOT NULL DEFAULT 4,

    CONSTRAINT "PomodoroSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PomodoroSettings_userId_key" ON "PomodoroSettings"("userId");

-- AddForeignKey
ALTER TABLE "PomodoroSettings" ADD CONSTRAINT "PomodoroSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

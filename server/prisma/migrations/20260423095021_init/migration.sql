-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "oauthProvider" TEXT,
    "oauthId" TEXT,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "characterClass" TEXT NOT NULL DEFAULT 'warrior',
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "gold" INTEGER NOT NULL DEFAULT 0,
    "theme" TEXT NOT NULL DEFAULT 'dark',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Goal" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "horizon" TEXT NOT NULL,
    "plannedHours" DOUBLE PRECISION,
    "spentHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Goal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "goalId" INTEGER,
    "projectId" INTEGER,
    "parentId" INTEGER,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "category" TEXT,
    "labels" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'todo',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isFocusToday" BOOLEAN NOT NULL DEFAULT false,
    "timeSpent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PomodoroSession" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "taskId" INTEGER NOT NULL,
    "goalId" INTEGER,
    "plannedDuration" INTEGER NOT NULL,
    "actualDuration" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "cycleNumber" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "PomodoroSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Habit" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "trackingType" TEXT NOT NULL DEFAULT 'discrete',
    "frequency" TEXT NOT NULL DEFAULT 'daily',
    "timesPerDay" INTEGER NOT NULL DEFAULT 1,
    "timesPerWeek" INTEGER,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "bestStreak" INTEGER NOT NULL DEFAULT 0,
    "startDate" TIMESTAMP(3),
    "isDayTrackingEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Habit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HabitLog" (
    "id" SERIAL NOT NULL,
    "habitId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "repetition" INTEGER NOT NULL DEFAULT 1,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HabitLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HabitTemplate" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "tracking" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "icon" TEXT,

    CONSTRAINT "HabitTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardTransaction" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "sessionId" INTEGER,
    "sourceType" TEXT NOT NULL,
    "sourceId" INTEGER NOT NULL DEFAULT 0,
    "rewardType" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "itemType" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rarity" TEXT NOT NULL DEFAULT 'common',
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "isEquipped" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT NOT NULL DEFAULT 'shop',
    "price" INTEGER,
    "dropChance" DOUBLE PRECISION,
    "assetUrl" TEXT,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Friendship" (
    "id" SERIAL NOT NULL,
    "senderId" INTEGER NOT NULL,
    "receiverId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyReport" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "totalPomodoroMin" INTEGER NOT NULL DEFAULT 0,
    "totalTasks" INTEGER NOT NULL DEFAULT 0,
    "totalXp" INTEGER NOT NULL DEFAULT 0,
    "totalGold" INTEGER NOT NULL DEFAULT 0,
    "habitsRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "categoryData" JSONB NOT NULL DEFAULT '{}',
    "recommendations" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WeeklyReport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_publicId_key" ON "User"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Goal_userId_idx" ON "Goal"("userId");

-- CreateIndex
CREATE INDEX "Project_userId_idx" ON "Project"("userId");

-- CreateIndex
CREATE INDEX "Task_userId_idx" ON "Task"("userId");

-- CreateIndex
CREATE INDEX "Task_goalId_idx" ON "Task"("goalId");

-- CreateIndex
CREATE INDEX "Task_dueDate_idx" ON "Task"("dueDate");

-- CreateIndex
CREATE INDEX "PomodoroSession_userId_idx" ON "PomodoroSession"("userId");

-- CreateIndex
CREATE INDEX "PomodoroSession_taskId_idx" ON "PomodoroSession"("taskId");

-- CreateIndex
CREATE INDEX "PomodoroSession_startedAt_idx" ON "PomodoroSession"("startedAt");

-- CreateIndex
CREATE INDEX "Habit_userId_idx" ON "Habit"("userId");

-- CreateIndex
CREATE INDEX "HabitLog_habitId_idx" ON "HabitLog"("habitId");

-- CreateIndex
CREATE INDEX "HabitLog_date_idx" ON "HabitLog"("date");

-- CreateIndex
CREATE UNIQUE INDEX "HabitLog_habitId_date_repetition_key" ON "HabitLog"("habitId", "date", "repetition");

-- CreateIndex
CREATE INDEX "Achievement_userId_idx" ON "Achievement"("userId");

-- CreateIndex
CREATE INDEX "RewardTransaction_userId_idx" ON "RewardTransaction"("userId");

-- CreateIndex
CREATE INDEX "RewardTransaction_createdAt_idx" ON "RewardTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "InventoryItem_userId_idx" ON "InventoryItem"("userId");

-- CreateIndex
CREATE INDEX "Friendship_senderId_idx" ON "Friendship"("senderId");

-- CreateIndex
CREATE INDEX "Friendship_receiverId_idx" ON "Friendship"("receiverId");

-- CreateIndex
CREATE UNIQUE INDEX "Friendship_senderId_receiverId_key" ON "Friendship"("senderId", "receiverId");

-- CreateIndex
CREATE INDEX "WeeklyReport_userId_idx" ON "WeeklyReport"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "WeeklyReport_userId_weekStart_key" ON "WeeklyReport"("userId", "weekStart");

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Task"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PomodoroSession" ADD CONSTRAINT "PomodoroSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PomodoroSession" ADD CONSTRAINT "PomodoroSession_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PomodoroSession" ADD CONSTRAINT "PomodoroSession_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "Goal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Habit" ADD CONSTRAINT "Habit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HabitLog" ADD CONSTRAINT "HabitLog_habitId_fkey" FOREIGN KEY ("habitId") REFERENCES "Habit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardTransaction" ADD CONSTRAINT "RewardTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardTransaction" ADD CONSTRAINT "RewardTransaction_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PomodoroSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_receiverId_fkey" FOREIGN KEY ("receiverId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyReport" ADD CONSTRAINT "WeeklyReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

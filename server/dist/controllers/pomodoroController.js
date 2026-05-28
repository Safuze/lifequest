"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getTodayStats = exports.getActiveSession = exports.completeSession = exports.startSession = exports.updateSettings = exports.getSettings = exports.completeSessionSchema = exports.createSessionSchema = exports.settingsSchema = void 0;
const zod_1 = require("zod");
const prisma_1 = require("../prisma");
const achievementService_1 = require("../services/achievementService");
const levelService_1 = require("../services/levelService");
const boosterService_1 = require("../services/boosterService");
const challengeService_1 = require("../services/challengeService");
exports.settingsSchema = zod_1.z.object({
    workDuration: zod_1.z.number().min(5).max(120).optional(),
    shortBreak: zod_1.z.number().min(1).max(60).optional(),
    longBreak: zod_1.z.number().min(1).max(120).optional(),
    cyclesBeforeLong: zod_1.z.number().min(2).max(10).optional(),
});
exports.createSessionSchema = zod_1.z.object({
    taskId: zod_1.z.number().positive().nullable().optional(),
    goalId: zod_1.z.number().positive().nullable().optional(),
    plannedDuration: zod_1.z.number().min(5).max(120),
});
exports.completeSessionSchema = zod_1.z.object({
    actualDuration: zod_1.z.number().min(0).max(120),
});
const getSettings = async (req, res) => {
    try {
        let settings = await prisma_1.prisma.pomodoroSettings.findUnique({
            where: { userId: req.userId }
        });
        if (!settings) {
            settings = await prisma_1.prisma.pomodoroSettings.create({
                data: { userId: req.userId }
            });
        }
        res.json({ settings });
    }
    catch (error) {
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
};
exports.getSettings = getSettings;
const updateSettings = async (req, res) => {
    try {
        const settings = await prisma_1.prisma.pomodoroSettings.upsert({
            where: { userId: req.userId },
            update: req.body,
            create: { userId: req.userId, ...req.body }
        });
        res.json({ settings });
    }
    catch (error) {
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
};
exports.updateSettings = updateSettings;
const startSession = async (req, res) => {
    try {
        const { taskId, goalId, plannedDuration } = req.body;
        if (taskId) {
            const task = await prisma_1.prisma.task.findFirst({
                where: {
                    id: taskId,
                    userId: req.userId,
                },
                select: {
                    id: true,
                    status: true,
                }
            });
            if (!task) {
                res.status(404).json({ error: 'Задача не найдена' });
                return;
            }
            if (task.status === 'done') {
                res.status(400).json({
                    error: 'Нельзя запускать Pomodoro для выполненной задачи'
                });
                return;
            }
        }
        await prisma_1.prisma.pomodoroSession.updateMany({
            where: { userId: req.userId, status: 'active' },
            data: { status: 'cancelled' }
        });
        let resolvedGoalId = goalId || null;
        if (taskId && !resolvedGoalId) {
            const task = await prisma_1.prisma.task.findUnique({
                where: { id: taskId },
                select: { goalId: true }
            });
            resolvedGoalId = task?.goalId || null;
        }
        const session = await prisma_1.prisma.pomodoroSession.create({
            data: {
                userId: req.userId,
                taskId: taskId || null,
                goalId: resolvedGoalId,
                plannedDuration,
                status: 'active',
                startedAt: new Date(),
            }
        });
        res.status(201).json({ session });
    }
    catch (error) {
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
};
exports.startSession = startSession;
const completeSession = async (req, res) => {
    try {
        const sessionId = parseInt(req.params.id, 10);
        const { actualDuration } = req.body;
        const session = await prisma_1.prisma.pomodoroSession.findFirst({
            where: { id: sessionId, userId: req.userId }
        });
        if (!session) {
            res.status(404).json({ error: 'Сессия не найдена' });
            return;
        }
        if (session.status === 'completed') {
            res.json({ session, reward: { xp: 0, gold: 0 }, cycleBonus: false, achievements: [], levelUp: null });
        }
        // Сброс — ничего не начисляем
        if (!actualDuration || actualDuration <= 0) {
            res.json({ session, reward: { xp: 0, gold: 0 }, cycleBonus: false, achievements: [], levelUp: null });
            return;
        }
        // Базовые награды за время
        const BASE_XP_PER_MIN = 2;
        const BASE_GOLD_PER_MIN = 0.4;
        let xpForSession = Math.max(1, Math.floor(actualDuration * BASE_XP_PER_MIN));
        let goldForSession = Math.max(0.1, actualDuration * BASE_GOLD_PER_MIN);
        // Бонус за фокус-задачу (×1.5)
        let hasFocusBonus = false;
        if (session.taskId !== null) {
            const task = await prisma_1.prisma.task.findUnique({
                where: { id: session.taskId },
                select: { isFocusToday: true }
            });
            hasFocusBonus = task?.isFocusToday === true;
        }
        const { xp: boostedSessionXp, gold: boostedSessionGold, } = await (0, boosterService_1.applyBoosters)({
            userId: req.userId,
            baseXp: xpForSession,
            baseGold: goldForSession,
            hasFocusBonus,
        });
        await prisma_1.prisma.pomodoroSession.update({
            where: { id: sessionId },
            data: {
                status: actualDuration > 0 ? 'completed' : 'cancelled',
                actualDuration,
                completedAt: new Date(),
                // сохраняем реальные награды сессии
                earnedXp: boostedSessionXp,
                earnedGold: boostedSessionGold,
            }
        });
        // Проверяем завершение цикла
        const settings = await prisma_1.prisma.pomodoroSettings.findUnique({
            where: { userId: req.userId }
        });
        const cyclesBeforeLong = settings?.cyclesBeforeLong || 4;
        // Проверяем не устарел ли счётчик цикла
        const lastSessionDate = settings?.lastSessionDate;
        const todayStr = new Date().toISOString().split('T')[0];
        const lastSessionStr = lastSessionDate ? new Date(lastSessionDate).toISOString().split('T')[0] : null;
        // Если последняя сессия была не сегодня — счётчик цикла устарел, сбрасываем
        const currentCycleSessions = (lastSessionStr === todayStr) ? (settings?.currentCycleSessions || 0) : 0;
        const updatedCycleSessions = currentCycleSessions + 1;
        const isNewCycleCompleted = updatedCycleSessions >= cyclesBeforeLong;
        let cycleBonusXp = 0;
        let cycleBonusGold = 0;
        if (isNewCycleCompleted) {
            // Алгоритм: бонус = сумма XP всех сессий текущего цикла / 4
            // Берём XP последних cyclesBeforeLong сессий из RewardTransaction
            const recentSessions = await prisma_1.prisma.pomodoroSession.findMany({
                where: {
                    userId: req.userId,
                    status: 'completed',
                },
                orderBy: {
                    completedAt: 'desc'
                },
                // текущая сессия уже сохранена,
                // поэтому берём весь цикл
                take: cyclesBeforeLong,
            });
            const totalCycleXp = recentSessions.reduce((sum, s) => {
                const baseXp = Math.max(1, Math.floor(s.actualDuration * BASE_XP_PER_MIN));
                return sum + baseXp;
            }, 0);
            const totalCycleGold = recentSessions.reduce((sum, s) => {
                const baseGold = Math.max(0.1, s.actualDuration * BASE_GOLD_PER_MIN);
                return sum + baseGold;
            }, 0);
            cycleBonusXp = Math.max(1, Math.round(totalCycleXp / 4));
            cycleBonusGold = Math.max(0.1, totalCycleGold / 4);
        }
        const userBefore = await prisma_1.prisma.user.findUnique({
            where: { id: req.userId },
            select: { level: true }
        });
        const finalXp = boostedSessionXp + cycleBonusXp;
        const finalGold = boostedSessionGold + cycleBonusGold;
        await prisma_1.prisma.$transaction(async (tx) => {
            await tx.pomodoroSettings.update({
                where: { userId: req.userId },
                data: {
                    currentCycleSessions: isNewCycleCompleted ? 0 : updatedCycleSessions,
                    lastSessionDate: new Date(),
                }
            });
            const updatedUser = await tx.user.update({
                where: { id: req.userId },
                data: {
                    xp: {
                        increment: finalXp
                    },
                    gold: {
                        increment: finalGold
                    },
                }
            });
            // Автообновление уровня
            const newLevel = (0, levelService_1.getLevelFromXp)(updatedUser.xp);
            if (newLevel !== updatedUser.level) {
                await tx.user.update({ where: { id: req.userId }, data: { level: newLevel } });
            }
            // RewardTransaction
            const rewardRows = [
                { userId: req.userId, sessionId, sourceType: 'pomodoro', sourceId: sessionId, rewardType: 'xp', amount: boostedSessionXp },
                { userId: req.userId, sessionId, sourceType: 'pomodoro', sourceId: sessionId, rewardType: 'gold', amount: boostedSessionGold },
            ];
            if (isNewCycleCompleted) {
                rewardRows.push({ userId: req.userId, sessionId, sourceType: 'cycle_bonus', sourceId: sessionId, rewardType: 'xp', amount: cycleBonusXp }, { userId: req.userId, sessionId, sourceType: 'cycle_bonus', sourceId: sessionId, rewardType: 'gold', amount: cycleBonusGold });
            }
            await tx.rewardTransaction.createMany({ data: rewardRows });
            // Обновляем время задачи
            if (session.taskId) {
                await tx.task.update({
                    where: { id: session.taskId },
                    data: { timeSpent: { increment: actualDuration } }
                });
            }
            // Обновляем часы цели
            if (session.goalId) {
                await tx.goal.update({
                    where: { id: session.goalId },
                    data: { spentHours: { increment: actualDuration / 60 } }
                });
            }
        });
        const userAfter = await prisma_1.prisma.user.findUnique({
            where: { id: req.userId },
            select: { level: true }
        });
        const levelUp = userBefore?.level !== undefined &&
            userAfter?.level !== undefined &&
            userAfter.level > userBefore.level
            ? {
                level: userAfter.level,
                levelName: (0, levelService_1.getLevelName)(userAfter.level)
            }
            : null;
        const newAchievements = await (0, achievementService_1.checkAchievementsForUser)(req.userId);
        res.json({
            session,
            reward: { xp: finalXp, gold: Number(finalGold.toFixed(1)) },
            cycleBonus: isNewCycleCompleted ? {
                xp: cycleBonusXp,
                gold: Number(cycleBonusGold.toFixed(1))
            } : null,
            achievements: newAchievements,
            levelUp,
        });
        void (0, challengeService_1.updateUserChallenges)(req.userId).catch(error => {
            console.error('updateUserChallenges error:', error);
        });
    }
    catch (error) {
        console.error('completeSession error:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
};
exports.completeSession = completeSession;
const getActiveSession = async (req, res) => {
    try {
        const session = await prisma_1.prisma.pomodoroSession.findFirst({
            where: { userId: req.userId, status: 'active' },
            include: { task: { select: { id: true, title: true, isFocusToday: true } } }
        });
        res.json({ session });
    }
    catch (error) {
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
};
exports.getActiveSession = getActiveSession;
const getTodayStats = async (req, res) => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const sessions = await prisma_1.prisma.pomodoroSession.findMany({
            where: {
                userId: req.userId,
                status: 'completed',
                completedAt: { gte: today, lt: tomorrow }
            }
        });
        const totalMinutes = sessions.reduce((sum, s) => sum + s.actualDuration, 0);
        const settings = await prisma_1.prisma.pomodoroSettings.findUnique({
            where: { userId: req.userId }
        });
        const cyclesBeforeLong = settings?.cyclesBeforeLong || 4;
        const completedCycles = Math.floor(sessions.length / cyclesBeforeLong);
        res.json({ totalMinutes, sessionsCount: sessions.length, completedCycles });
    }
    catch (error) {
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
};
exports.getTodayStats = getTodayStats;

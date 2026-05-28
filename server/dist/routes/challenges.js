"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const prisma_1 = require("../prisma");
const challengeService_1 = require("../services/challengeService");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authMiddleware);
// Все доступные испытания
router.get('/', async (req, res) => {
    try {
        const [challenges, myActive] = await Promise.all([
            prisma_1.prisma.challenge.findMany({ where: { isActive: true }, orderBy: { entryFee: 'asc' } }),
            prisma_1.prisma.userChallenge.findMany({
                where: { userId: req.userId, status: 'active' },
                select: { challengeId: true }
            })
        ]);
        const activeIds = new Set(myActive.map(u => u.challengeId));
        res.json({
            challenges: challenges.map(c => ({
                ...c,
                isJoined: activeIds.has(c.id),
            }))
        });
    }
    catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});
// Мои испытания
router.get('/my', async (req, res) => {
    try {
        // Обновляем прогресс при каждом запросе страницы
        await (0, challengeService_1.updateUserChallenges)(req.userId);
        const userChallenges = await prisma_1.prisma.userChallenge.findMany({
            where: { userId: req.userId },
            include: { challenge: true },
            orderBy: { startedAt: 'desc' }
        });
        res.json({ challenges: userChallenges });
    }
    catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});
// Присоединиться к испытанию
router.post('/join/:id', async (req, res) => {
    try {
        const challengeId = parseInt(req.params.id, 10);
        const challenge = await prisma_1.prisma.challenge.findUnique({ where: { id: challengeId } });
        if (!challenge || !challenge.isActive) {
            res.status(404).json({ error: 'Испытание не найдено' });
            return;
        }
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: req.userId },
            select: { gold: true }
        });
        if (!user || user.gold < challenge.entryFee) {
            res.status(400).json({ error: `Нужно ${challenge.entryFee} баллов для участия` });
            return;
        }
        // Проверка: уже участвует?
        const existing = await prisma_1.prisma.userChallenge.findUnique({
            where: { userId_challengeId: { userId: req.userId, challengeId } }
        });
        if (existing && existing.status === 'active') {
            res.status(400).json({ error: 'Вы уже участвуете в этом испытании' });
            return;
        }
        // Провалившееся можно перепройти
        if (existing && existing.status === 'failed') {
            await prisma_1.prisma.userChallenge.delete({ where: { id: existing.id } });
        }
        if (existing && existing.status === 'completed') {
            res.status(400).json({ error: 'Испытание уже пройдено' });
            return;
        }
        const now = new Date();
        // начало сегодняшнего дня
        const startedAt = new Date(now);
        startedAt.setHours(0, 0, 0, 0);
        // конец последнего дня испытания
        const expiresAt = new Date(startedAt);
        expiresAt.setDate(expiresAt.getDate() + challenge.durationDays - 1);
        expiresAt.setHours(23, 59, 59, 999);
        await prisma_1.prisma.$transaction(async (tx) => {
            await tx.user.update({
                where: { id: req.userId },
                data: { gold: { decrement: challenge.entryFee } }
            });
            await tx.userChallenge.create({
                data: {
                    userId: req.userId,
                    challengeId,
                    status: 'active',
                    progress: 0,
                    startedAt,
                    expiresAt,
                }
            });
        });
        await (0, challengeService_1.updateUserChallenges)(req.userId);
        res.json({ success: true, message: `Вы вступили в испытание "${challenge.title}"` });
    }
    catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});
exports.default = router;

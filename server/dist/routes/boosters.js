"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const prisma_1 = require("../prisma");
const boosterService_1 = require("../services/boosterService");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authMiddleware);
// Получить активные бустеры и перки
router.get('/active', async (req, res) => {
    try {
        await (0, boosterService_1.cleanExpiredBoosters)(); // очищаем просроченные при каждом запросе
        const now = new Date();
        const [boosters, perks] = await Promise.all([
            prisma_1.prisma.activeBooster.findMany({
                where: { userId: req.userId, expiresAt: { gte: now } },
                orderBy: { expiresAt: 'asc' }
            }),
            prisma_1.prisma.permanentPerk.findMany({ where: {
                    userId: req.userId,
                } })
        ]);
        const boostersWithRemaining = boosters.map(b => ({
            ...b,
            remainingSeconds: Math.max(0, Math.floor((b.expiresAt.getTime() - now.getTime()) / 1000)),
            remainingMinutes: Math.max(0, Math.floor((b.expiresAt.getTime() - now.getTime()) / 60000)),
        }));
        res.json({ boosters: boostersWithRemaining, perks });
    }
    catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});
// Активировать бустер напрямую (например из инвентаря)
router.post('/activate', async (req, res) => {
    try {
        const { type, multiplier, durationMinutes, stackable } = req.body;
        const validTypes = ['xp_boost', 'gold_boost', 'combo_boost'];
        if (!validTypes.includes(type)) {
            res.status(400).json({ error: 'Неверный тип бустера' });
            return;
        }
        if (!multiplier || multiplier <= 1 || multiplier > 10) {
            res.status(400).json({ error: 'Неверный множитель (1..10)' });
            return;
        }
        if (!durationMinutes || durationMinutes < 1 || durationMinutes > 1440) {
            res.status(400).json({ error: 'Неверная длительность (1..1440 минут)' });
            return;
        }
        await (0, boosterService_1.activateBooster)(req.userId, type, multiplier, durationMinutes);
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Ошибка активации' });
    }
});
// Включить / выключить перк
router.post('/perk-toggle', async (req, res) => {
    try {
        const { type, isActive } = req.body;
        if (!['xp_bonus', 'gold_bonus'].includes(type)) {
            res.status(400).json({
                error: 'Неверный тип перка'
            });
            return;
        }
        const perk = await prisma_1.prisma.permanentPerk.findUnique({
            where: {
                userId_type: {
                    userId: req.userId,
                    type,
                }
            }
        });
        if (!perk) {
            res.status(404).json({
                error: 'Перк не найден'
            });
            return;
        }
        await prisma_1.prisma.permanentPerk.update({
            where: {
                userId_type: {
                    userId: req.userId,
                    type,
                }
            },
            data: {
                isActive,
            }
        });
        res.json({
            success: true
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Ошибка переключения перка'
        });
    }
});
exports.default = router;

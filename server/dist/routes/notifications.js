"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createNotification = createNotification;
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const prisma_1 = require("../prisma");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authMiddleware);
// Получить уведомления
router.get('/', async (req, res) => {
    try {
        const notifications = await prisma_1.prisma.notification.findMany({
            where: { userId: req.userId },
            orderBy: { createdAt: 'desc' },
            take: 50,
        });
        const unreadCount = await prisma_1.prisma.notification.count({
            where: { userId: req.userId, isRead: false }
        });
        res.json({ notifications, unreadCount });
    }
    catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});
// Пометить как прочитанные
router.patch('/read-all', async (req, res) => {
    try {
        await prisma_1.prisma.notification.updateMany({
            where: { userId: req.userId, isRead: false },
            data: { isRead: true }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});
router.patch('/:id/read', async (req, res) => {
    try {
        await prisma_1.prisma.notification.update({
            where: { id: parseInt(req.params.id, 10), userId: req.userId },
            data: { isRead: true }
        });
        res.json({ success: true });
    }
    catch (error) {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});
exports.default = router;
// Утилита для создания уведомлений — импортируй в других контроллерах
async function createNotification(userId, type, title, body, data) {
    try {
        await prisma_1.prisma.notification.create({ data: { userId, type, title, body, data } });
    }
    catch (error) {
        console.error('createNotification error:', error);
    }
}

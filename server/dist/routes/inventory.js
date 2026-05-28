"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const authMiddleware_1 = require("../middleware/authMiddleware");
const prisma_1 = require("../prisma");
const router = (0, express_1.Router)();
router.use(authMiddleware_1.authMiddleware);
router.get('/', async (req, res) => {
    try {
        const items = await prisma_1.prisma.inventoryItem.findMany({
            where: { userId: req.userId },
            select: { itemId: true, itemType: true, name: true, isActive: true, isEquipped: true, rarity: true, }
        });
        res.json({ items });
    }
    catch {
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});
router.post('/equip', async (req, res) => {
    try {
        const { itemName } = req.body;
        if (!itemName) {
            res.status(400).json({ error: 'itemName required' });
            return;
        }
        const item = await prisma_1.prisma.inventoryItem.findFirst({
            where: {
                userId: req.userId,
                name: itemName,
            }
        });
        if (!item) {
            res.status(404).json({ error: 'Предмет не найден' });
            return;
        }
        // ПИТОМЕЦ
        if (item.itemType === 'pet') {
            await prisma_1.prisma.user.update({
                where: { id: req.userId },
                data: {
                    activePetId: item.name
                }
            });
            res.json({
                success: true,
                activePetId: item.name
            });
            return;
        }
        // ОСТАЛЬНАЯ КОСМЕТИКА 
        await prisma_1.prisma.inventoryItem.updateMany({
            where: {
                userId: req.userId,
                itemType: item.itemType
            },
            data: {
                isEquipped: false,
                isActive: false
            }
        });
        const updated = await prisma_1.prisma.inventoryItem.update({
            where: { id: item.id },
            data: {
                isEquipped: true,
                isActive: true
            }
        });
        // sync user table
        if (item.itemType === 'avatar_border') {
            await prisma_1.prisma.user.update({
                where: { id: req.userId },
                data: {
                    avatarBorder: item.name
                }
            });
        }
        if (item.itemType === 'profile_bg') {
            await prisma_1.prisma.user.update({
                where: { id: req.userId },
                data: {
                    profileBg: item.name
                }
            });
        }
        res.json({
            success: true,
            item: updated
        });
    }
    catch (error) {
        console.error(error);
        res.status(500).json({
            error: 'Ошибка сервера'
        });
    }
});
exports.default = router;

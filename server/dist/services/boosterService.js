"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.applyBoosters = applyBoosters;
exports.activateBooster = activateBooster;
exports.addPermanentPerk = addPermanentPerk;
exports.cleanExpiredBoosters = cleanExpiredBoosters;
const prisma_1 = require("../prisma");
const PERK_PRICES = [500, 600, 750, 950, 1200];
const MAX_PERK_LEVEL = 5;
// Главная функция — применяет все активные бустеры и перки
async function applyBoosters({ userId, baseXp, baseGold, hasFocusBonus = false, }) {
    const boosters = await prisma_1.prisma.activeBooster.findMany({
        where: {
            userId,
            expiresAt: {
                gte: new Date()
            }
        }
    });
    const perks = await prisma_1.prisma.permanentPerk.findMany({
        where: {
            userId,
            isActive: true,
        }
    });
    let xpMultiplier = 1;
    let goldMultiplier = 1;
    // ===== FOCUS BONUS =====
    if (hasFocusBonus) {
        xpMultiplier *= 1.5;
        goldMultiplier *= 1.5;
    }
    // ===== BOOSTERS =====
    const xpBooster = boosters
        .filter(b => b.type === 'xp_boost' || b.type === 'combo_boost')
        .sort((a, b) => b.multiplier - a.multiplier)[0];
    if (xpBooster) {
        xpMultiplier *= xpBooster.multiplier;
    }
    const goldBooster = boosters
        .filter(b => b.type === 'gold_boost' || b.type === 'combo_boost')
        .sort((a, b) => b.multiplier - a.multiplier)[0];
    if (goldBooster) {
        goldMultiplier *= goldBooster.multiplier;
    }
    // ===== PERKS =====
    const xpPerk = perks.find(p => p.type === 'xp_bonus');
    if (xpPerk) {
        xpMultiplier *= (1 + xpPerk.bonusPercent / 100);
    }
    const goldPerk = perks.find(p => p.type === 'gold_bonus');
    if (goldPerk) {
        goldMultiplier *= (1 + goldPerk.bonusPercent / 100);
    }
    // ===== FINAL =====
    const xp = Math.round(baseXp * xpMultiplier);
    const gold = Number((baseGold * goldMultiplier).toFixed(2));
    return { xp, gold };
}
// Активировать временный бустер
async function activateBooster(userId, type, multiplier, durationMinutes) {
    const existing = await prisma_1.prisma.activeBooster.findFirst({
        where: {
            userId,
            type,
            expiresAt: {
                gte: new Date()
            }
        }
    });
    // Если уже есть активный бустер такого типа —
    // просто продлеваем время
    if (existing) {
        await prisma_1.prisma.activeBooster.update({
            where: { id: existing.id },
            data: {
                expiresAt: new Date(existing.expiresAt.getTime() + durationMinutes * 60000),
                multiplier: Math.max(existing.multiplier, multiplier),
            }
        });
        return;
    }
    // Иначе создаём новый
    await prisma_1.prisma.activeBooster.create({
        data: {
            userId,
            type,
            multiplier,
            expiresAt: new Date(Date.now() + durationMinutes * 60000),
        }
    });
}
// Добавить/улучшить постоянный перк
async function addPermanentPerk(userId, type) {
    const existing = await prisma_1.prisma.permanentPerk.findUnique({
        where: {
            userId_type: {
                userId,
                type
            }
        }
    });
    // Создаём новый
    if (!existing) {
        await prisma_1.prisma.permanentPerk.create({
            data: {
                userId,
                type,
                level: 1,
                bonusPercent: 10,
                isActive: true,
            }
        });
        return;
    }
    // MAX LEVEL
    if (existing.level >= MAX_PERK_LEVEL) {
        throw new Error('Перк уже максимального уровня');
    }
    const nextLevel = existing.level + 1;
    await prisma_1.prisma.permanentPerk.update({
        where: {
            userId_type: {
                userId,
                type
            }
        },
        data: {
            level: nextLevel,
            bonusPercent: nextLevel * 10,
            isActive: true,
        }
    });
}
// Очистка просроченных (можно вызывать по крону)
async function cleanExpiredBoosters() {
    const result = await prisma_1.prisma.activeBooster.deleteMany({
        where: { expiresAt: { lt: new Date() } }
    });
    return result.count;
}

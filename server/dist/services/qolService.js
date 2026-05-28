"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DAILY_TASK_MAX = exports.TASK_SLOTS_MAX = exports.HABIT_SLOTS_MAX = void 0;
exports.habitUpgradeLevel = habitUpgradeLevel;
exports.taskUpgradeLevel = taskUpgradeLevel;
exports.habitNextPrice = habitNextPrice;
exports.taskNextPrice = taskNextPrice;
exports.buyHabitSlot = buyHabitSlot;
exports.buyTaskSlot = buyTaskSlot;
const prisma_1 = require("../prisma");
const HABIT_SLOT_PRICES = [50, 60, 70, 80, 90, 100, 110, 120, 130, 140];
const TASK_SLOT_PRICES = [40, 50, 60, 70, 80, 90, 100, 110, 120, 130];
const HABIT_SLOTS_DEFAULT = 10;
const TASK_SLOTS_DEFAULT = 20;
exports.HABIT_SLOTS_MAX = 20;
exports.TASK_SLOTS_MAX = 30;
exports.DAILY_TASK_MAX = 20;
// Текущий уровень = сколько докуплено слотов
function habitUpgradeLevel(current) { return current - HABIT_SLOTS_DEFAULT; }
function taskUpgradeLevel(current) { return current - TASK_SLOTS_DEFAULT; }
function habitNextPrice(current) {
    const level = habitUpgradeLevel(current);
    return level < HABIT_SLOT_PRICES.length ? HABIT_SLOT_PRICES[level] : null;
}
function taskNextPrice(current) {
    const level = taskUpgradeLevel(current);
    return level < TASK_SLOT_PRICES.length ? TASK_SLOT_PRICES[level] : null;
}
async function buyHabitSlot(userId) {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: { gold: true, habitSlots: true }
    });
    if (!user)
        return { error: 'Пользователь не найден' };
    if (user.habitSlots >= exports.HABIT_SLOTS_MAX)
        return { error: 'Достигнут максимум слотов привычек' };
    const price = habitNextPrice(user.habitSlots);
    if (!price)
        return { error: 'Максимум достигнут' };
    if (user.gold < price)
        return { error: `Нужно ${price} баллов` };
    const updated = await prisma_1.prisma.user.update({
        where: { id: userId },
        data: { gold: { decrement: price }, habitSlots: { increment: 1 } },
        select: { habitSlots: true }
    });
    return { newLimit: updated.habitSlots };
}
async function buyTaskSlot(userId) {
    const user = await prisma_1.prisma.user.findUnique({
        where: { id: userId },
        select: { gold: true, taskSlots: true, dailyTaskLimit: true }
    });
    if (!user)
        return { error: 'Пользователь не найден' };
    if (user.taskSlots >= exports.TASK_SLOTS_MAX)
        return { error: 'Достигнут максимум слотов задач' };
    const price = taskNextPrice(user.taskSlots);
    if (!price)
        return { error: 'Максимум достигнут' };
    if (user.gold < price)
        return { error: `Нужно ${price} баллов` };
    const updated = await prisma_1.prisma.user.update({
        where: { id: userId },
        data: {
            gold: { decrement: price },
            taskSlots: { increment: 1 },
            dailyTaskLimit: user.dailyTaskLimit < exports.DAILY_TASK_MAX ? { increment: 1 } : undefined,
        },
        select: { taskSlots: true, dailyTaskLimit: true }
    });
    return { newLimit: updated.taskSlots };
}

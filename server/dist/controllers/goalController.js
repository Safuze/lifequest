"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteGoal = exports.updateGoal = exports.createGoal = exports.getGoals = exports.updateGoalSchema = exports.createGoalSchema = void 0;
const zod_1 = require("zod");
const prisma_1 = require("../prisma");
exports.createGoalSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(100),
    category: zod_1.z.enum(['учёба', 'работа', 'здоровье', 'хобби', 'личное', 'проект']).optional(),
    horizon: zod_1.z.enum(['day', 'week', 'month', 'year', 'longterm']).optional().default('longterm'),
    plannedHours: zod_1.z.number().positive().optional(),
    deadline: zod_1.z.string().optional(),
});
exports.updateGoalSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(100).optional(),
    category: zod_1.z.enum(['учёба', 'работа', 'здоровье', 'хобби', 'личное', 'проект']).optional(),
    horizon: zod_1.z.enum(['day', 'week', 'month', 'year', 'longterm']).optional(),
    plannedHours: zod_1.z.number().positive().nullable().optional(),
    deadline: zod_1.z.string().optional().nullable(),
    status: zod_1.z.enum(['active', 'completed', 'paused']).optional(),
});
// Автоопределение категории по ключевым словам
function detectCategory(title) {
    const lower = title.toLowerCase();
    if (['диплом', 'учёба', 'курс', 'экзамен', 'лекция', 'университет', 'учить'].some(w => lower.includes(w)))
        return 'учёба';
    if (['работа', 'проект', 'задача', 'клиент', 'офис', 'дедлайн'].some(w => lower.includes(w)))
        return 'работа';
    if (['спорт', 'здоровье', 'бег', 'зал', 'тренировка', 'питание', 'сон'].some(w => lower.includes(w)))
        return 'здоровье';
    if (['читать', 'книга', 'музыка', 'рисовать', 'игра', 'хобби'].some(w => lower.includes(w)))
        return 'хобби';
    return 'личное';
}
// Вычисляем горизонт автоматически из дедлайна
function getHorizonFromDeadline(deadline) {
    const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (days <= 1)
        return 'day';
    if (days <= 7)
        return 'week';
    if (days <= 31)
        return 'month';
    if (days <= 365)
        return 'year';
    return 'longterm';
}
const getGoals = async (req, res) => {
    try {
        const goals = await prisma_1.prisma.goal.findMany({
            where: { userId: req.userId },
            orderBy: { createdAt: 'desc' },
            include: { _count: { select: { tasks: true } } }
        });
        res.json({ goals });
    }
    catch (error) {
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
};
exports.getGoals = getGoals;
const createGoal = async (req, res) => {
    console.log('createGoal body:', req.body);
    try {
        const data = req.body;
        const category = data.category || detectCategory(data.title);
        // Парсим дату 
        let deadline = null;
        if (data.deadline) {
            deadline = new Date(data.deadline);
            // Если невалидная дата — игнорируем
            if (isNaN(deadline.getTime()))
                deadline = null;
        }
        const horizon = data.horizon || (deadline ? getHorizonFromDeadline(deadline.toISOString()) : 'longterm');
        const goal = await prisma_1.prisma.goal.create({
            data: {
                userId: req.userId,
                title: data.title,
                category,
                horizon,
                plannedHours: data.plannedHours || null,
                deadline,
            }
        });
        res.status(201).json({ goal });
    }
    catch (error) {
        console.error('createGoal error:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
};
exports.createGoal = createGoal;
const updateGoal = async (req, res) => {
    try {
        const goalId = parseInt(req.params.id, 10);
        const existing = await prisma_1.prisma.goal.findFirst({ where: { id: goalId, userId: req.userId } });
        if (!existing) {
            res.status(404).json({ error: 'Цель не найдена' });
            return;
        }
        const updateData = { ...req.body };
        if (req.body.deadline) {
            updateData.deadline = new Date(req.body.deadline);
            if (!req.body.horizon) {
                updateData.horizon = getHorizonFromDeadline(req.body.deadline);
            }
        }
        const goal = await prisma_1.prisma.goal.update({ where: { id: goalId }, data: updateData });
        res.json({ goal });
    }
    catch (error) {
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
};
exports.updateGoal = updateGoal;
const deleteGoal = async (req, res) => {
    try {
        const goalId = parseInt(req.params.id, 10);
        const existing = await prisma_1.prisma.goal.findFirst({ where: { id: goalId, userId: req.userId } });
        if (!existing) {
            res.status(404).json({ error: 'Цель не найдена' });
            return;
        }
        await prisma_1.prisma.goal.delete({ where: { id: goalId } });
        res.json({ message: 'Цель удалена' });
    }
    catch (error) {
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
};
exports.deleteGoal = deleteGoal;

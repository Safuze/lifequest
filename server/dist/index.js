"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const auth_1 = __importDefault(require("./routes/auth"));
const goals_1 = __importDefault(require("./routes/goals"));
const tasks_1 = __importDefault(require("./routes/tasks"));
const pomodoro_1 = __importDefault(require("./routes/pomodoro"));
const users_1 = __importDefault(require("./routes/users"));
const habits_1 = __importDefault(require("./routes/habits"));
const inventory_1 = __importDefault(require("./routes/inventory"));
const lifescope_1 = __importDefault(require("./routes/lifescope"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const client_1 = require("@prisma/client");
const shop_1 = __importDefault(require("./routes/shop"));
const boosters_1 = __importDefault(require("./routes/boosters"));
const challenges_1 = __importDefault(require("./routes/challenges"));
const boosterService_1 = require("./services/boosterService");
const prisma = new client_1.PrismaClient();
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: [
        'http://localhost:5173',
        'https://client-production-cda1.up.railway.app'
    ],
    credentials: true,
}));
app.listen(PORT);
app.use(express_1.default.json());
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
});
app.use('/api/v1/auth', auth_1.default);
app.use('/api/v1/goals', goals_1.default);
app.use('/api/v1/tasks', tasks_1.default);
app.use('/api/v1/pomodoro', pomodoro_1.default);
app.use('/api/v1/users', users_1.default);
app.use('/api/v1/habits', habits_1.default);
app.use('/api/v1/inventory', inventory_1.default);
app.use('/api/v1/lifescope', lifescope_1.default);
app.use('/api/v1/notifications', notifications_1.default);
app.use('/api/v1/shop', shop_1.default);
app.use('/api/v1/boosters', boosters_1.default);
app.use('/api/v1/challenges', challenges_1.default);
// Каждые 5 минут чистим просроченные
setInterval(async () => {
    const count = await (0, boosterService_1.cleanExpiredBoosters)();
    if (count > 0)
        console.log(`Cleaned ${count} expired boosters`);
}, 5 * 60 * 1000);
setInterval(async () => {
    try {
        const now = new Date();
        const in1hour = new Date(now.getTime() + 60 * 60 * 1000);
        const dueTasks = await prisma.task.findMany({
            where: {
                status: { not: 'done' },
                dueDate: {
                    gte: now,
                    lte: in1hour,
                },
            },
            include: {
                user: { select: { id: true } }
            }
        });
        for (const task of dueTasks) {
            // проверяем — не создавали ли уже уведомление
            const existing = await prisma.notification.findFirst({
                where: {
                    userId: task.user.id,
                    type: 'task_due',
                    data: {
                        path: ['taskId'],
                        equals: task.id
                    }
                }
            });
            if (!existing) {
                await prisma.notification.create({
                    data: {
                        userId: task.user.id,
                        type: 'task_due',
                        title: 'Задача скоро истекает',
                        body: `«${task.title}» — срок через час`,
                        data: { taskId: task.id }
                    }
                });
            }
        }
    }
    catch (error) {
        console.error('Task notification cron error:', error);
    }
}, 60 * 60 * 1000); // каждый час
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
exports.default = app;

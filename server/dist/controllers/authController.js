"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMe = exports.refresh = exports.login = exports.register = exports.loginSchema = exports.registerSchema = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const prisma_1 = require("../prisma");
const constants_1 = require("../config/constants");
// Схемы валидации
exports.registerSchema = zod_1.z.object({
    name: zod_1.z.string().min(2, 'Имя минимум 2 символа').max(50),
    email: zod_1.z.string().email('Некорректный email'),
    password: zod_1.z.string().min(6, 'Пароль минимум 6 символов'),
});
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
});
// Генерация токенов
const generateTokens = (userId) => {
    const accessToken = jsonwebtoken_1.default.sign({ userId }, constants_1.JWT_CONFIG.accessSecret, { expiresIn: constants_1.JWT_CONFIG.accessExpiresIn });
    const refreshToken = jsonwebtoken_1.default.sign({ userId }, constants_1.JWT_CONFIG.refreshSecret, { expiresIn: constants_1.JWT_CONFIG.refreshExpiresIn });
    return { accessToken, refreshToken };
};
// Регистрация
const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        // Проверяем существует ли пользователь
        const existing = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (existing) {
            res.status(409).json({ error: 'Email уже используется' });
            return;
        }
        // Хешируем пароль
        const passwordHash = await bcryptjs_1.default.hash(password, constants_1.BCRYPT_ROUNDS);
        // Создаём пользователя
        const user = await prisma_1.prisma.user.create({
            data: { name, email, passwordHash },
            select: {
                id: true,
                publicId: true,
                name: true,
                email: true,
                level: true,
                xp: true,
                gold: true,
                avatar: true,
                createdAt: true,
            }
        });
        const tokens = generateTokens(user.id);
        res.status(201).json({ user, ...tokens });
    }
    catch (error) {
        console.error('Register error:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
};
exports.register = register;
// Логин
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) {
            res.status(401).json({ error: 'Неверный email или пароль' });
            return;
        }
        const isValidPassword = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isValidPassword) {
            res.status(401).json({ error: 'Неверный email или пароль' });
            return;
        }
        const tokens = generateTokens(user.id);
        res.json({
            user: {
                id: user.id,
                publicId: user.publicId,
                name: user.name,
                email: user.email,
                level: user.level,
                xp: user.xp,
                gold: Number(user.gold?.toFixed(1)),
                avatar: user.avatar,
            },
            ...tokens
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
};
exports.login = login;
// Обновление токена
const refresh = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            res.status(401).json({ error: 'Refresh token не предоставлен' });
            return;
        }
        const payload = jsonwebtoken_1.default.verify(refreshToken, constants_1.JWT_CONFIG.refreshSecret);
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true }
        });
        if (!user) {
            res.status(401).json({ error: 'Пользователь не найден' });
            return;
        }
        const tokens = generateTokens(user.id);
        res.json(tokens);
    }
    catch {
        res.status(401).json({ error: 'Недействительный refresh token' });
    }
};
exports.refresh = refresh;
// Получить текущего пользователя
const getMe = async (req, res) => {
    try {
        const userId = req.userId;
        const user = await prisma_1.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                publicId: true,
                name: true,
                email: true,
                level: true,
                xp: true,
                gold: true,
                avatar: true,
                avatarBorder: true,
                profileBg: true,
                theme: true,
                createdAt: true,
                activePomodoroSound: true,
                activePomodoroTimer: true,
            }
        });
        if (!user) {
            res.status(404).json({ error: 'Пользователь не найден' });
            return;
        }
        res.json({ user });
    }
    catch (error) {
        console.error('GetMe error:', error);
        res.status(500).json({ error: 'Внутренняя ошибка сервера' });
    }
};
exports.getMe = getMe;

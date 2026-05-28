"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = void 0;
const validate = (schema) => {
    return (req, res, next) => {
        // Очищаем пустые строки — Zod enum не принимает ""
        const cleanBody = Object.fromEntries(Object.entries(req.body).map(([k, v]) => [k, v === '' ? undefined : v]));
        const result = schema.safeParse(cleanBody);
        if (!result.success) {
            res.status(400).json({
                error: 'Ошибка валидации',
                details: result.error.flatten().fieldErrors
            });
            return;
        }
        req.body = result.data;
        next();
    };
};
exports.validate = validate;

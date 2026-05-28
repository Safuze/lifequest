"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BCRYPT_ROUNDS = exports.JWT_CONFIG = void 0;
exports.JWT_CONFIG = {
    accessSecret: process.env.JWT_SECRET || 'fallback-secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
    accessExpiresIn: '15m',
    refreshExpiresIn: '7d',
};
exports.BCRYPT_ROUNDS = 12;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEVEL_NAMES = exports.LEVEL_XP = void 0;
exports.getLevelFromXp = getLevelFromXp;
exports.getLevelName = getLevelName;
const LEVEL_XP = [0, 1000, 3000, 6000, 10000, 15000, 21000, 28000, 36000, 45000, 55000];
exports.LEVEL_XP = LEVEL_XP;
const LEVEL_NAMES = ['Бронза I', 'Бронза II', 'Серебро I', 'Серебро II', 'Золото I', 'Золото II', 'Платина I', 'Платина II', 'Алмаз I', 'Алмаз II', 'Грандмастер'];
exports.LEVEL_NAMES = LEVEL_NAMES;
function getLevelFromXp(xp) {
    let level = 0;
    for (let i = LEVEL_XP.length - 1; i >= 0; i--) {
        if (xp >= LEVEL_XP[i]) {
            level = i;
            break;
        }
    }
    return level;
}
function getLevelName(level) {
    return LEVEL_NAMES[Math.min(level, LEVEL_NAMES.length - 1)];
}

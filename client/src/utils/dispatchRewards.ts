
import apiClient from '../api/client'
interface AchievementItem {
  type: string; title: string; description: string; icon: string; rarity: string
}
interface LevelUpItem {
  level: number; levelName: string
}

export function dispatchRewards(achievements?: AchievementItem[], levelUp?: LevelUpItem | null) {
  if ((!achievements || achievements.length === 0) && !levelUp) return
  window.dispatchEvent(new CustomEvent('rewards', {
    detail: { achievements: achievements || [], levelUp: levelUp || null }
  }))
  // помечаем показанные достижения как просмотренные на бэке
  if (achievements && achievements.length > 0) {
    apiClient.post('/users/achievements/mark-seen', {
      types: achievements.map(a => a.type)
    }).catch(() => {})
  }
}
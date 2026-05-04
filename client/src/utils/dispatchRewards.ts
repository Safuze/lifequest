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
}
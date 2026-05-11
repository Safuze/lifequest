
const ALL_ACHIEVEMENT_DEFS = [
  // Задачи
  { type: 'tasks_10',    title: 'Решатель',         description: 'Выполнено 10 задач',           icon: '✅', rarity: 'common',    },
  { type: 'tasks_50',    title: 'Продуктивист',      description: 'Выполнено 50 задач',           icon: '⚡', rarity: 'rare',      },
  { type: 'tasks_200',   title: 'Машина задач',      description: 'Выполнено 200 задач',          icon: '🤖', rarity: 'epic',      },
  { type: 'tasks_1000',  title: 'Легенда задач',     description: 'Выполнено 1000 задач',         icon: '🏆', rarity: 'legendary', },
  // Фокус
  { type: 'focus_5h',    title: 'Сосредоточенный',   description: '5 часов в фокусе',             icon: '🎯', rarity: 'common',        },
  { type: 'focus_25h',   title: 'Весь в работе',     description: '25 часов в фокусе',            icon: '🔥', rarity: 'rare',          },
  { type: 'focus_100h',  title: 'Монах фокуса',      description: '100 часов в фокусе',           icon: '🧘', rarity: 'epic',          },
  { type: 'focus_500h',  title: 'Хранитель времени', description: '500 часов в фокусе',           icon: '⌛', rarity: 'legendary',     },
  { type: 'sessions_10', title: 'Первые сессии',     description: '10 помодоро-сессий',            icon: '⏱',  rarity: 'common',        },
  { type: 'sessions_50', title: 'Таймерщик',         description: '50 помодоро-сессий',            icon: '⏰', rarity: 'rare',          },
  // Привычки
  { type: 'streak_7',    title: 'Первая неделя',     description: '7 дней стрика',                icon: '📅', rarity: 'common',     },
  { type: 'streak_30',   title: 'Месяц силы',        description: '30 дней стрика',               icon: '🗓️', rarity: 'rare',       },
  { type: 'streak_90',   title: 'Квартал',           description: '90 дней стрика',               icon: '💪', rarity: 'epic',       },
  { type: 'streak_365',  title: 'Целый год',         description: '365 дней стрика',              icon: '👑', rarity: 'legendary',  },
  // Социальное
  { type: 'friend_1',    title: 'Знакомый',          description: 'Первый друг добавлен',         icon: '🤝', rarity: 'common',       },
  { type: 'friend_5',    title: 'Компания',          description: '5 друзей',                     icon: '👥', rarity: 'rare',         },
  { type: 'friend_25',   title: 'Популярный',        description: '25 друзей',                    icon: '🌟', rarity: 'epic',         },
  { type: 'friend_100',  title: 'Легенда сети',      description: '100 друзей',                   icon: '🌐', rarity: 'legendary',    },
  // Золото
  { type: 'gold_500',    title: 'Богатей',           description: 'Заработано 500 кредитов',         icon: '🪙', rarity: 'common',       },
  { type: 'gold_2000',   title: 'Казначей',          description: 'Заработано 2000 кредитов',        icon: '💰', rarity: 'rare',         },
  { type: 'gold_10000',  title: 'Меценат',           description: 'Заработано 10000 кредитов',       icon: '💎', rarity: 'epic',         },
  { type: 'gold_25000',  title: 'Ротшильд',          description: 'Заработано 25000 кредитов',       icon: '🏦', rarity: 'legendary',    },
  // Уровни
  { type: 'level_2',     title: 'Бронза II',           description: 'Достигнут уровень Бронза II',   icon: '🔶🔶', rarity: 'common'    },
  { type: 'level_3',     title: 'Серебро I',          description: 'Достигнут уровень Серебро I',  icon: '⚪', rarity: 'common'      },
  { type: 'level_4',     title: 'Серебро II',          description: 'Достигнут уровень Серебро II',  icon: '⚪⚪', rarity: 'common'      },
  { type: 'level_5',     title: 'Золото I',           description: 'Достигнут уровень Золото I',   icon: '🟡', rarity: 'rare'      },
  { type: 'level_6',     title: 'Золото II',          description: 'Достигнут уровень Золото II',  icon: '🟡🟡', rarity: 'rare' },
  { type: 'level_7',     title: 'Платина I',           description: 'Достигнут уровень Платина I',   icon: '🪨', rarity: 'rare'    },
  { type: 'level_8',     title: 'Платина II',          description: 'Достигнут уровень Платина II',  icon: '🪨🪨', rarity: 'epic'      },
  { type: 'level_9',     title: 'Алмаз I',          description: 'Достигнут уровень Алмаз I',  icon: '💎', rarity: 'epic'      },
  { type: 'level_10',     title: 'Алмаз II',           description: 'Достигнут уровень Алмаз II',   icon: '💎💎', rarity: 'epic'      },
  { type: 'level_11',     title: 'Грандмастер',          description: 'Достигнут уровень Грандмастер',  icon: '⚜️', rarity: 'legendary' },
  // Цели
  { type: 'goal_first',  title: 'Целеустремлённый',  description: 'Первая завершённая цель',      icon: '🎯', rarity: 'common',         },
  { type: 'goal_5',      title: 'Многоцелевой',      description: '5 завершённых целей',          icon: '🏹', rarity: 'rare',           },
]

const RARITY_COLORS: Record<string, string> = {
  common:    '#22c55e',
  rare:      '#4f46e5',
  epic:      '#a855f7',
  legendary: '#f59e0b',
}

const RARITY_LABELS: Record<string, string> = {
  common:    'Обычное',
  rare:      'Редкое',
  epic:      'Эпическое',
  legendary: 'Легендарное',
}

interface EarnedAchievement {
  type: string
  title: string
  description?: string
  icon?: string
  rarity?: string
  createdAt: string
}

interface AchievementGridProps {
  earned: EarnedAchievement[]
  showLocked?: boolean // показывать ли незакрытые (по умолчанию true)
}

export function AchievementGrid({ earned, showLocked = true }: AchievementGridProps) {
  const earnedTypes = new Set(earned.map(a => a.type))

  // Обогащаем earned данными из ALL_ACHIEVEMENT_DEFS если не хватает полей
  const enrichedEarned = earned.map(a => {
    const def = ALL_ACHIEVEMENT_DEFS.find(d => d.type === a.type)
    return {
      ...a,
      icon: a.icon || def?.icon || '🏅',
      rarity: a.rarity || def?.rarity || 'common',
      description: a.description || def?.description || '',
    }
  })

  const locked = showLocked
    ? ALL_ACHIEVEMENT_DEFS.filter(d => !earnedTypes.has(d.type))
    : []

  return (
    <div className="space-y-6">
      {/* Полученные достижения */}
      {enrichedEarned.length === 0 && !showLocked && (
        <div className="rounded-2xl p-12 text-center" style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
          <div className="text-5xl mb-4">🏆</div>
          <h3 className="text-white font-semibold mb-2">Нет достижений</h3>
          <p className="text-slate-400 text-sm">Выполняйте задачи, поддерживайте стрики</p>
        </div>
      )}

      {enrichedEarned.length > 0 && (
        <div>
          <h4 className="text-white font-medium text-sm mb-3 flex items-center gap-2">
            <span className="text-green-400">✓</span> Получено ({enrichedEarned.length})
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {enrichedEarned.map(ach => {
              const color = RARITY_COLORS[ach.rarity] || '#4f46e5'
              return (
                <div key={ach.type} className="p-4 rounded-2xl"
                  style={{ backgroundColor: '#1e293b', border: `1px solid ${color}40` }}>
                  <div className="text-3xl mb-2">{ach.icon}</div>
                  <p className="text-white text-sm font-semibold leading-tight">{ach.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">{ach.description}</p>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                      style={{ backgroundColor: `${color}20`, color }}>
                      {RARITY_LABELS[ach.rarity] || ach.rarity}
                    </span>
                    <span className="text-slate-600 text-xs">
                      {new Date(ach.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Незаработанные — только если showLocked */}
      {showLocked && locked.length > 0 && (
        <div>
          <h4 className="text-slate-500 font-medium text-sm mb-3 flex items-center gap-2">
            <span>🔒</span> Не получено ({locked.length})
          </h4>
          <div className="grid grid-cols-2 gap-3">
            {locked.map(def => {
              const color = RARITY_COLORS[def.rarity] || '#4f46e5'
              return (
                <div key={def.type} className="p-4 rounded-2xl relative overflow-hidden"
                  style={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    opacity: 0.5,
                  }}>
                  {/* Заблокированный оверлей */}
                  <div className="absolute top-2 right-2 text-slate-600">🔒</div>
                  <div className="text-3xl mb-2 grayscale">{def.icon}</div>
                  <p className="text-slate-400 text-sm font-semibold leading-tight">{def.title}</p>
                  <p className="text-slate-600 text-xs mt-0.5 leading-relaxed">{def.description}</p>
                  <div className="mt-2">
                    <span className="text-xs px-1.5 py-0.5 rounded font-medium"
                      style={{ backgroundColor: `${color}10`, color: `${color}80` }}>
                      {RARITY_LABELS[def.rarity]}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
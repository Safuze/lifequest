import { SHOP_ITEMS } from '../data/shopItems'
import { PETS } from '../data/pets'
interface RawInventoryItem {
  name: string
  itemType: string
  rarity: string
}

interface Props {
  item: RawInventoryItem
}
const RARITY_COLORS: Record<string, string> = {
  common: '#22c55e',
  rare: '#4f46e5',
  epic: '#a855f7',
  legendary: '#f59e0b',
}

const RARITY_LABELS: Record<string, string> = {
  common: 'Обычная',
  rare: 'Редкая',
  epic: 'Эпическая',
  legendary: 'Легендарная',
}

export function InventoryCard({ item }: Props) {
  // Получаем обогащённые метаданные
  const meta = SHOP_ITEMS.find(i => i.id === item.name)
  // Редкость берём из метаданных если есть, иначе из item
  const rarity = (meta?.rarity || item.rarity || 'common') as string
  const color = RARITY_COLORS[rarity] || '#4f46e5'

  // Если питомец — специальный случай
  if (item.itemType === 'pet') {
    const pet = PETS.find(p => p.id === item.name)

    if (!pet) return null

    return (
      <div
        className="p-3 rounded-xl flex flex-col gap-2 transition-all hover:scale-[1.02]"
        style={{
          backgroundColor: '#0f172a',
          border: `1px solid ${color}40`,
          boxShadow: `0 2px 8px ${color}15`,
        }}
      >
        <div
          className="h-20 flex items-center justify-center rounded-xl overflow-hidden"
          style={{
            backgroundColor: `${color}10`,
          }}
        >
          <img
            src={pet.image}
            alt={pet.name}
            className="w-16 h-16 object-contain"
            draggable={false}
          />
        </div>

        <div>
          <p className="text-white text-xs font-semibold truncate">
            {pet.name}
          </p>

          <p className="text-slate-500 text-xs">
            Питомец
          </p>
        </div>

        <span
          className="text-xs px-1.5 py-0.5 rounded self-start"
          style={{
            backgroundColor: `${color}20`,
            color,
          }}
        >
          {RARITY_LABELS[rarity] || rarity}
        </span>
      </div>
    )
  }

  // Если нет метаданных
  if (!meta) return null

  return (
    <div
      className="group relative overflow-hidden rounded-2xl transition-all duration-300 hover:scale-[1.03]"
      style={{
        backgroundColor: '#0f172a',
        border: `1px solid ${color}40`,
        boxShadow: `0 4px 20px ${color}15`,
      }}
    >
      {/* Preview */}
      <div className="relative h-32 overflow-hidden">

        {/* Background */}
        {'background' in meta && meta.background?.type === 'gradient' && (
          <div
            className="absolute inset-0"
            style={{
              background: meta.background.value,
            }}
          />
        )}

        {'background' in meta && meta.background?.type === 'image' && (
          <img
            src={meta.background.value}
            className="w-full h-full object-cover"
          />
        )}

        {'background' in meta && meta.background?.type === 'video' && (
          <>
            <img
              src={meta.background.poster}
              className="w-full h-full object-cover"
            />

            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              <div className="px-2 py-1 rounded-lg bg-black/50 text-white text-xs">
                LIVE
              </div>
            </div>
          </>
        )}

        {'preview' in meta &&
          typeof meta.preview === 'string' &&
          meta.category === 'avatar_border' && (
            <div className="w-full h-full flex items-center justify-center">
              <div
                className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
                style={{
                  border:
                    meta.preview === 'rainbow'
                      ? '3px solid transparent'
                      : `3px solid ${meta.preview}`,
                  boxShadow:
                    meta.preview === 'rainbow'
                      ? '0 0 20px rgba(255,255,255,0.5)'
                      : `0 0 20px ${meta.preview}80`,
                  background:
                    meta.preview === 'rainbow'
                      ? 'linear-gradient(#0f172a,#0f172a) padding-box, linear-gradient(45deg,#ff0000,#ffff00,#00ff00,#00ffff,#0000ff,#ff00ff) border-box'
                      : '#1e293b',
                  color: '#fff',
                }}
              >
                A
              </div>
            </div>
          )}

        {'preview' in meta &&
          typeof meta.preview === 'string' &&
          meta.category !== 'avatar_border' && (
            <img
              src={meta.preview}
              className="w-full h-full object-cover"
            />
          )}

        {/* Glow */}
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity"
          style={{
            background: `linear-gradient(to top, ${color}30, transparent)`,
          }}
        />
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <div>
          <p className="text-white font-semibold text-sm truncate">
            {meta.name}
          </p>

          <p className="text-slate-400 text-xs">
            {meta.description}
          </p>
        </div>

        <div className="flex items-center justify-between">
          <span
            className="text-xs px-2 py-1 rounded-lg font-medium"
            style={{
              backgroundColor: `${color}20`,
              color,
            }}
          >
            {RARITY_LABELS[rarity]}
          </span>

          <span className="text-yellow-400 text-xs font-semibold">
            {meta.price} Баллов
          </span>
        </div>
      </div>
    </div>
  )
}
import { getInventoryMeta, RARITY_COLORS, RARITY_LABELS } from '../data/inventoryMeta'
import { InventoryPreview } from './InventoryPreview'
import { PETS } from '../../../server/src/data/pets'
interface RawInventoryItem {
  name: string
  itemType: string
  rarity: string
}

interface Props {
  item: RawInventoryItem
}

export function InventoryCard({ item }: Props) {
  // Получаем обогащённые метаданные
  const meta = getInventoryMeta(item.name)

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

  // Если нет метаданных — минимальная карточка-фоллбек
  if (!meta) {
    const typeIcons: Record<string, string> = {
      avatar_border: '🖼', profile_bg: '🎨', timer: '⏰', background: '🌄', sound: '🔊', pet: '🐾',
    }
    return (
      <div className="p-3 rounded-xl flex flex-col gap-2"
        style={{ backgroundColor: '#0f172a', border: `1px solid ${color}30` }}>
        <div className="h-14 flex items-center justify-center text-2xl"
          style={{ backgroundColor: '#1e293b', borderRadius: '8px' }}>
          {typeIcons[item.itemType] || '📦'}
        </div>
        <div>
          <p className="text-white text-xs font-semibold truncate">{item.name}</p>
          <p className="text-slate-500 text-xs capitalize">{item.itemType.replace(/_/g, ' ')}</p>
        </div>
        <span className="text-xs px-1.5 py-0.5 rounded self-start"
          style={{ backgroundColor: `${color}20`, color }}>
          {RARITY_LABELS[rarity] || rarity}
        </span>
      </div>
    )
  }

  return (
    <div className="p-3 rounded-xl flex flex-col gap-2 transition-all hover:scale-[1.02]"
      style={{
        backgroundColor: '#0f172a',
        border: `1px solid ${color}40`,
        boxShadow: `0 2px 8px ${color}10`,
      }}>

      {/* Превью */}
      <div className="rounded-lg overflow-hidden"
        style={{ backgroundColor: `${color}08` }}>
        <InventoryPreview preview={meta.preview} />
      </div>

      {/* Инфо */}
      <div className="space-y-0.5">
        <p className="text-white text-xs font-semibold truncate">{meta.name}</p>
        <p className="text-slate-500 text-xs">{meta.typeLabel}</p>
      </div>

      {/* Редкость */}
      <span className="text-xs px-1.5 py-0.5 rounded self-start font-medium"
        style={{ backgroundColor: `${color}20`, color }}>
        {RARITY_LABELS[rarity]}
      </span>
    </div>
  )
}
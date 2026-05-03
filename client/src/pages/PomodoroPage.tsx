import { useState, useEffect, useRef, useMemo } from 'react'
import { useLocation } from 'react-router-dom'
import { pomodoroApi } from '../api/pomodoro'
import type { PomodoroSettings } from '../api/pomodoro'
import { tasksApi } from '../api/tasks'
import type { Task } from '../api/tasks'
import { useAuth } from '../hooks/useAuth'
import apiClient from '../api/client'
import { Play, Pause, RotateCcw, Settings, X, ChevronRight, Lock, Zap } from 'lucide-react'
import { useTimerStore } from '../stores/timerStore'
import { timerService } from '../services/timerService'
import type { TimerMode } from '../services/timerService'
import { audioService } from '../services/audioService'

type TimerStyle = 'circle' | 'hourglass' | 'cheetah' | 'horse' | 'snail'

const SOUND_SOURCES: Record<string, string | null> = {
  none: null,
  white: '/sounds/whitt.mp3',      
  lofi: '/sounds/aventure-lofi-chill-music-515431.mp3',              
  nature: '/sounds/priroda.mp3',          
  waves: '/sounds/z_uki-belogo-morya-shtil-legkiy-nakat-morskoy-_olny-bbm-2015.mp3',            
  rain: '/sounds/rain.mp3',             
  fire: '/sounds/sound-effects-library-camp-fire-burning.mp3',              
  night: '/sounds/cicada_night_forest.mp3',     
}

const SOUNDS = [
  { id: 'none',      label: 'Тишина',      icon: '🔇', price: 0   },
  { id: 'white',     label: 'Белый шум',   icon: '📻', price: 50  },
  { id: 'lofi',      label: 'Lo-fi',       icon: '🎵', price: 100 },
  { id: 'nature',    label: 'Природа',     icon: '🌿', price: 150 },
  { id: 'waves',     label: 'Волны',       icon: '🌊', price: 200 },
  { id: 'rain',      label: 'Дождь',       icon: '🌧️', price: 250 },
  { id: 'fire',      label: 'Огонь',       icon: '🔥', price: 300 },
  { id: 'night',     label: 'Ночь',        icon: '🌙', price: 400 },
]
// Фоны
type BgType = 'css' | 'video'

interface BgConfig {
  id: string
  label: string
  price: number
  type: BgType
  // Для css: стиль контейнера
  style?: React.CSSProperties
  // Для video: URL видео файла (вставишь сам)
  videoSrc?: string
  // CSS анимация для живого фона
  animated?: boolean
}

const BG_CONFIG: BgConfig[] = [
  {
    id: 'dark',
    label: 'Тёмный',
    price: 0,
    type: 'css',
    style: { backgroundColor: '#0f172a' },
    animated: false,
  },
  {
    id: 'forest',
    label: 'Лес',
    price: 150,
    type: 'video',
    videoSrc: '/video/minecraft-fireflies-forest-moewalls-com.mp4',  // ← вставь URL или путь
    style: { background: 'linear-gradient(135deg, #1a2f1a 0%, #0f172a 100%)' }, // fallback
    animated: true,
  },
  {
    id: 'ocean',
    label: 'Океан',
    price: 200,
    type: 'video',
    videoSrc: '/videos/ocean.mp4',   // ← вставь URL или путь
    style: { background: 'linear-gradient(135deg, #0c1a2e 0%, #0f172a 100%)' },
    animated: true,
  },
  {
    id: 'sunset',
    label: 'Закат',
    price: 250,
    type: 'video',
    videoSrc: '/videos/sunset.mp4',  // ← вставь URL или путь
    style: { background: 'linear-gradient(135deg, #2d1b1b 0%, #0f172a 100%)' },
    animated: true,
  },
  {
    id: 'space',
    label: 'Космос',
    price: 300,
    type: 'css',
    style: { backgroundColor: '#0a0a1a' },
    animated: true, // используем CSS анимацию звёзд
  },
]

// Перестраиваем BACKGROUNDS для SettingsPanel превью
const BACKGROUNDS = BG_CONFIG.map(bg => ({
  id: bg.id,
  label: bg.label,
  price: bg.price,
  style: bg.style || {},
}))

// ============ КОМПОНЕНТ ЖИВОГО ФОНА ============
// Вне компонента LiveBackground — один раз при загрузке модуля
const STARS = Array.from({ length: 80 }, (_, i) => ({
  id: i,
  width: Math.random() * 2 + 1,
  height: Math.random() * 2 + 1,
  left: Math.random() * 100,
  top: Math.random() * 100,
  duration: 2 + Math.random() * 4,
  delay: Math.random() * 4,
}))

function LiveBackground({ bgId }: { bgId: string }) {
  const config = BG_CONFIG.find(b => b.id === bgId)
  if (!config) return null

  if (bgId === 'space') {
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 0 }}>
        <style>{`
          @keyframes twinkle {
            0%, 100% { opacity: 0.15; }
            50% { opacity: 0.9; }
          }
          .lq-star {
            position: absolute;
            background: white;
            border-radius: 50%;
            animation: twinkle var(--dur) ease-in-out infinite;
            animation-delay: var(--del);
          }
        `}</style>
        {STARS.map(star => (
          <div
            key={star.id}
            className="lq-star"
            style={{
              width: `${star.width}px`,
              height: `${star.height}px`,
              left: `${star.left}%`,
              top: `${star.top}%`,
              '--dur': `${star.duration}s`,
              '--del': `${star.delay}s`,
            } as React.CSSProperties}
          />
        ))}
      </div>
    )
  }

  if (config.type === 'video' && config.videoSrc) {
    return (
      <video
        key={bgId}
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ opacity: 0.4, zIndex: 0 }}
      >
        <source src={config.videoSrc} type="video/mp4" />
      </video>
    )
  }

  return null
}

const TIMER_STYLES: { id: TimerStyle; label: string; icon: string; price: number }[] = [
  { id: 'circle',    label: 'Классика',      icon: '⭕', price: 0   },
  { id: 'snail',     label: 'Улитка 🐌',     icon: '🐌', price: 100 },
  { id: 'horse',     label: 'Лошадь 🐎',     icon: '🐎', price: 200 },
  { id: 'cheetah',   label: 'Гепард 🐆',     icon: '🐆', price: 300 },
  { id: 'hourglass', label: 'Песочные часы', icon: '⏳', price: 400 },
]

function formatTime(s: number): string {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
}

// ============ TimerVisual (без изменений — копируй из предыдущей версии) ============
interface TimerVisualProps {
  progress: number; timeLeft: number; mode: TimerMode
  isRunning: boolean; timerStyle: TimerStyle
}

function TimerVisual({ progress, timeLeft, mode, isRunning, timerStyle }: TimerVisualProps) {
  const isFlipped = useTimerStore(s => s.isFlipped)
  const color = mode === 'work' ? '#4f46e5' : '#22c55e'
  const angle = (progress / 100) * 360

  if (timerStyle === 'hourglass') {
    const topFill = 1 - progress / 100
    const botFill = progress / 100
    const t = topFill, b = botFill
    const sandTop = 85 - t * 75
    const xLeft = 50 - t * 30, xRight = 70 + t * 30
    const sandBot = 85 + b * 85
    const bxLeft = 50 - b * 30, bxRight = 70 + b * 30

    return (
      <div
          className={`relative w-64 h-64 flex items-center justify-center ${isFlipped ? 'hourglass-flip' : ''}`}
          style={{ transformOrigin: 'center' }}
        >
        <svg viewBox="0 0 120 180" className="w-48 h-48">
          <path d="M20,10 L100,10 L70,85 L100,170 L20,170 L50,85 Z"
            fill="rgba(30,41,59,0.6)" stroke="#334155" strokeWidth="2.5" strokeLinejoin="round" />
          {topFill > 0.01 && (
            <polygon points={`${xLeft},${sandTop} ${xRight},${sandTop} 70,85 50,85`}
              fill={color} opacity="0.8" style={{ transition: 'all 1s linear' }} />
          )}
          {botFill > 0.01 && (
            <polygon points={`50,85 70,85 ${bxRight},${sandBot} ${bxLeft},${sandBot}`}
              fill={color} opacity="0.8" style={{ transition: 'all 1s linear' }} />
          )}
          {topFill > 0.01 && topFill < 0.99 && (
            <line x1="60" y1="85" x2="60" y2="90" stroke={color} strokeWidth="1.5" opacity="0.9" />
          )}
          <path d="M20,10 L100,10 L70,85 L100,170 L20,170 L50,85 Z"
            fill="none" stroke="#475569" strokeWidth="2" strokeLinejoin="round" />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-white font-mono drop-shadow-lg">{formatTime(timeLeft)}</span>
          {isRunning && mode === 'work' && <span className="text-indigo-400 text-xs mt-1 animate-pulse">● Фокус</span>}
          {isRunning && mode !== 'work' && <span className="text-green-400 text-xs mt-1 animate-pulse">● Перерыв</span>}
        </div>
      </div>
    )
  }

  if (timerStyle === 'cheetah' || timerStyle === 'horse' || timerStyle === 'snail') {
    const emoji = timerStyle === 'cheetah' ? '🐆' : timerStyle === 'horse' ? '🐎' : '🐌'
    const rad = ((angle - 90) * Math.PI) / 180
    const cx = 50 + 42 * Math.cos(rad)
    const cy = 50 + 42 * Math.sin(rad)
    return (
      <div className="relative w-64 h-64">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="#1e293b" strokeWidth="6" />
          <circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 42}`}
            strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`}
            style={{ transition: 'stroke-dashoffset 1s linear' }} />
        </svg>
        <div className="absolute text-2xl" style={{
          left: `${(cx / 100) * 256 - 16}px`,
          top: `${(cy / 100) * 256 - 16}px`,
          transform: 'rotate(90deg)', transition: 'all 1s linear',
        }}>{emoji}</div>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-white font-mono">{formatTime(timeLeft)}</span>
          <span className="text-slate-400 text-xs mt-1">
            {mode === 'work' ? '🎯 Фокус' : mode === 'shortBreak' ? '☕ Перерыв' : '🛋️ Длинный'}
          </span>
          {isRunning && mode === 'work' && <span className="text-indigo-400 text-xs mt-1 animate-pulse">● Фокус</span>}
          {isRunning && mode !== 'work' && <span className="text-green-400 text-xs mt-1 animate-pulse">● Перерыв</span>}
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-64 h-64">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(30,41,59,0.8)" strokeWidth="6" />
        <circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={`${2 * Math.PI * 45}`}
          strokeDashoffset={`${2 * Math.PI * 45 * (1 - progress / 100)}`}
          style={{ transition: 'stroke-dashoffset 1s linear' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-5xl font-bold text-white font-mono tracking-wide">{formatTime(timeLeft)}</span>
        <span className="text-slate-400 text-sm mt-2">
          {mode === 'work' ? '🎯 Фокус' : mode === 'shortBreak' ? '☕ Перерыв' : '🛋️ Длинный перерыв'}
        </span>
        {isRunning && mode === 'work' && <span className="text-indigo-400 text-xs mt-1 animate-pulse">● Фокус</span>}
        {isRunning && mode !== 'work' && <span className="text-green-400 text-xs mt-1 animate-pulse">● Перерыв</span>}
      </div>
    </div>
  )
}

// ============ PurchaseModal ============
function PurchaseModal({ item, userGold, onConfirm, onClose }: {
  item: { id: string; label: string; price: number; icon: string }
  userGold: number; onConfirm: () => Promise<void>; onClose: () => void
}) {
  const [loading, setLoading] = useState(false)
  const canAfford = userGold >= item.price
  const handleConfirm = async () => { setLoading(true); try { await onConfirm() } finally { setLoading(false) } }
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70" onClick={onClose} />
      <div className="relative rounded-2xl p-6 z-10 w-full max-w-sm text-center"
        style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
        <div className="text-5xl mb-3">{item.icon}</div>
        <h3 className="text-white font-semibold text-lg mb-1">{item.label}</h3>
        <p className="text-slate-400 text-sm mb-2">Стоимость: <span className="text-yellow-400 font-bold">{item.price} 🪙</span></p>
        <p className="text-slate-500 text-sm mb-4">Баланс: <span className={canAfford ? 'text-yellow-400' : 'text-red-400'}>{userGold} 🪙</span></p>
        {!canAfford && <p className="text-red-400 text-xs mb-4">Недостаточно золота</p>}
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-slate-400"
            style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}>Отмена</button>
          <button onClick={canAfford ? handleConfirm : undefined} disabled={!canAfford || loading}
            className="flex-1 py-2.5 rounded-xl text-white font-medium"
            style={{ backgroundColor: canAfford ? '#f59e0b' : '#475569', opacity: (!canAfford || loading) ? 0.6 : 1 }}>
            {loading ? 'Покупка...' : canAfford ? 'Купить' : 'Мало золота'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============ SettingsPanel ============
interface SettingsPanelProps {
  settings: PomodoroSettings; userGold: number
  unlockedSounds: string[]; unlockedBgs: string[]; unlockedTimerStyles: string[]
  selectedSound: string; selectedBg: string; selectedTimerStyle: TimerStyle; autoSwitch: boolean
  onSaveTimer: (s: Partial<PomodoroSettings>) => void
  onSelectSound: (id: string) => void; onSelectBg: (id: string) => void
  onSelectTimerStyle: (id: TimerStyle) => void; onToggleAutoSwitch: () => void
  onPurchase: (type: 'sound' | 'bg' | 'timer', id: string, label: string, icon: string, price: number) => Promise<void>
  onClose: () => void
}

function SettingsPanel({
  settings, userGold, unlockedSounds, unlockedBgs, unlockedTimerStyles,
  selectedSound, selectedBg, selectedTimerStyle, autoSwitch,
  onSaveTimer, onSelectSound, onSelectBg, onSelectTimerStyle, onToggleAutoSwitch, onPurchase, onClose,
}: SettingsPanelProps) {
  const [work, setWork] = useState(settings.workDuration)
  const [shortB, setShortB] = useState(settings.shortBreak)
  const [longB, setLongB] = useState(settings.longBreak)
  const [cycles, setCycles] = useState(settings.cyclesBeforeLong)
  const [purchaseItem, setPurchaseItem] = useState<{ id: string; label: string; price: number; icon: string; type: 'sound' | 'bg' | 'timer' } | null>(null)

  const inputStyle = { backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff' }

  const handleItemClick = (type: 'sound' | 'bg' | 'timer', item: { id: string; label: string; price: number; icon?: string }) => {
    const unlocked = type === 'sound' ? unlockedSounds : type === 'bg' ? unlockedBgs : unlockedTimerStyles
    if (item.price === 0 || unlocked.includes(item.id)) {
      if (type === 'sound') onSelectSound(item.id)
      else if (type === 'bg') onSelectBg(item.id)
      else onSelectTimerStyle(item.id as TimerStyle)
    } else {
      setPurchaseItem({ ...item, icon: item.icon || '🎨', type })
    }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/60" onClick={onClose} />
        <div className="relative w-full max-w-md rounded-2xl p-6 z-10 max-h-[85vh] overflow-y-auto"
          style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-white font-semibold text-lg">Настройки</h2>
            <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={20} /></button>
          </div>

          {/* Время */}
          <div className="space-y-3 mb-5">
            <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wide">⏱ Время</h3>
            {([
              { label: 'Рабочая сессия (мин)', value: work, setter: setWork, min: 1, max: 120 },
              { label: 'Короткий перерыв (мин)', value: shortB, setter: setShortB, min: 1, max: 30 },
              { label: 'Длинный перерыв (мин)', value: longB, setter: setLongB, min: 5, max: 60 },
              { label: 'Сессий до длинного', value: cycles, setter: setCycles, min: 1, max: 10 },
            ] as const).map(({ label, value, setter, min, max }) => (
              <div key={label} className="flex items-center justify-between gap-3">
                <label className="text-slate-300 text-sm flex-1">{label}</label>
                <input type="number" value={value}
                  onChange={e => (setter as (v: number) => void)(Number(e.target.value))}
                  min={min} max={max}
                  className="w-20 rounded-lg px-3 py-2 outline-none text-center text-sm focus:ring-2 focus:ring-indigo-500"
                  style={inputStyle} />
              </div>
            ))}
            <button onClick={() => onSaveTimer({ workDuration: work, shortBreak: shortB, longBreak: longB, cyclesBeforeLong: cycles })}
              className="w-full py-2.5 rounded-xl text-white text-sm font-medium"
              style={{ backgroundColor: '#4f46e5' }}>
              Сохранить
            </button>
          </div>

          {/* Автопереключение */}
          <div className="mb-5 p-3 rounded-xl flex items-center justify-between"
            style={{ backgroundColor: '#0f172a', border: '1px solid #334155' }}>
            <div>
              <p className="text-white text-sm font-medium">Автопереключение режимов</p>
              <p className="text-slate-500 text-xs mt-0.5">Перерыв начинается автоматически</p>
            </div>
            <button onClick={onToggleAutoSwitch}
              className="w-12 h-6 rounded-full transition-colors relative shrink-0"
              style={{ backgroundColor: autoSwitch ? '#4f46e5' : '#334155' }}>
              <div className="w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all"
                style={{ left: autoSwitch ? '26px' : '2px' }} />
            </button>
          </div>

          {/* Стиль таймера */}
          <div className="mb-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wide">🎮 Стиль таймера</h3>
              <span className="text-yellow-400 text-sm">🪙 {userGold}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {TIMER_STYLES.map(ts => {
                const isUnlocked = ts.price === 0 || unlockedTimerStyles.includes(ts.id)
                const isSelected = selectedTimerStyle === ts.id
                return (
                  <button key={ts.id} onClick={() => handleItemClick('timer', ts)}
                    className="flex items-center gap-2 p-3 rounded-xl transition-all text-left"
                    style={{ backgroundColor: isSelected ? 'rgba(99,102,241,0.2)' : '#0f172a', border: `1px solid ${isSelected ? '#6366f1' : '#334155'}` }}>
                    <span className="text-2xl shrink-0">{ts.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm">{ts.label}</p>
                      {!isUnlocked ? <p className="text-yellow-400 text-xs flex items-center gap-1"><Lock size={10} /> {ts.price} 🪙</p>
                        : isSelected ? <p className="text-indigo-400 text-xs">✓ Активен</p>
                        : <p className="text-slate-500 text-xs">Разблокирован</p>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Фоны */}
          <div className="mb-5">
            <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-3">🎨 Фон</h3>
            <div className="grid grid-cols-2 gap-2">
              {BACKGROUNDS.map(bg => {
                const bgConf = BG_CONFIG.find(b => b.id === bg.id)
                const isUnlocked = bg.price === 0 || unlockedBgs.includes(bg.id)
                const isSelected = selectedBg === bg.id
                return (
                  <button key={bg.id} onClick={() => handleItemClick('bg', { ...bg, icon: '🎨' })}
                    className="flex items-center gap-2 p-3 rounded-xl transition-all text-left"
                    style={{
                      backgroundColor: isSelected ? 'rgba(99,102,241,0.2)' : '#0f172a',
                      border: `1px solid ${isSelected ? '#6366f1' : '#334155'}`,
                    }}>
                    {/* Превью фона */}
                    <div className="w-10 h-10 rounded-lg shrink-0 overflow-hidden relative"
                      style={bg.style}>
                      {bgConf?.type === 'video' && bgConf.videoSrc && (
                        <video
                          autoPlay loop muted playsInline
                          className="absolute inset-0 w-full h-full object-cover opacity-70"
                        >
                          <source src={bgConf.videoSrc} type="video/mp4" />
                        </video>
                      )}
                      {bg.id === 'space' && (
                        <div className="absolute inset-0 flex items-center justify-center text-lg">✨</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm">{bg.label}</p>
                      {bgConf?.animated && (
                        <p className="text-indigo-400 text-xs"></p>
                      )}
                      {!isUnlocked
                        ? <p className="text-yellow-400 text-xs flex items-center gap-1"><Lock size={10} /> {bg.price} 🪙</p>
                        : isSelected
                          ? <p className="text-indigo-400 text-xs">Активен</p>
                          : bgConf?.animated ? null : <p className="text-slate-500 text-xs">Разблокирован</p>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Звуки */}
          <div>
            <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-3">🔊 Звук</h3>
            <div className="grid grid-cols-2 gap-2">
              {SOUNDS.map(sound => {
                const isUnlocked = sound.price === 0 || unlockedSounds.includes(sound.id)
                const isSelected = selectedSound === sound.id
                return (
                  <button key={sound.id} onClick={() => handleItemClick('sound', sound)}
                    className="flex items-center gap-2 p-3 rounded-xl transition-all"
                    style={{ backgroundColor: isSelected ? 'rgba(99,102,241,0.2)' : '#0f172a', border: `1px solid ${isSelected ? '#6366f1' : '#334155'}` }}>
                    <span className="text-xl shrink-0">{sound.icon}</span>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-white text-sm truncate">{sound.label}</p>
                      {!isUnlocked ? <p className="text-yellow-400 text-xs flex items-center gap-1"><Lock size={10} /> {sound.price} 🪙</p>
                        : isSelected ? <p className="text-indigo-400 text-xs">Активен</p>
                        : <p className="text-slate-500 text-xs">Разблокирован</p>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
      {purchaseItem && (
        <PurchaseModal item={purchaseItem} userGold={userGold}
          onConfirm={async () => {
            await onPurchase(purchaseItem.type, purchaseItem.id, purchaseItem.label, purchaseItem.icon, purchaseItem.price)
            setPurchaseItem(null)
          }}
          onClose={() => setPurchaseItem(null)} />
      )}
    </>
  )
}

// ============ Главный компонент ============
export default function PomodoroPage() {
  const location = useLocation()
  const { user, loadUser } = useAuth()

  // Zustand store — глобальное состояние таймера
  const {
    mode, timeLeft, modeDuration, isRunning, sessionId, selectedTaskId, taskSelected,
    todayMinutes, todaySessions, todayCycles, lastReward, autoSwitch,
    setSelectedTaskId, setTaskSelected, setAutoSwitch, setLastReward,
  } = useTimerStore()

  const [pomodoroSettings, setPomodoroSettings] = useState<PomodoroSettings | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedSound, setSelectedSound] = useState(() =>
    localStorage.getItem('lifequest_sound') || 'none'
  )
  const [selectedBg, setSelectedBg] = useState(() =>
    localStorage.getItem('lifequest_bg') || 'dark'
  )
  const [selectedTimerStyle, setSelectedTimerStyle] = useState<TimerStyle>(() =>
    (localStorage.getItem('lifequest_timer_style') as TimerStyle) || 'circle'
  )
  const [unlockedSounds, setUnlockedSounds] = useState<string[]>([])
  const [unlockedBgs, setUnlockedBgs] = useState<string[]>([])
  const [unlockedTimerStyles, setUnlockedTimerStyles] = useState<string[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [showTaskSelect, setShowTaskSelect] = useState(false)
  const initDone = useRef(false)

  useEffect(() => {
    // При монтировании — синхронизируем аудио с текущим состоянием таймера
    if (isRunning && selectedSound !== 'none') {
      audioService.changeSound(selectedSound, true)
    }
    // При размонтировании — НЕ останавливаем (звук продолжает играть)
  }, []) // только при монтировании

  // Эффект при смене звука или состояния таймера:
  useEffect(() => {
    localStorage.setItem('lifequest_sound', selectedSound)
    audioService.changeSound(selectedSound, isRunning)
  }, [selectedSound, isRunning])

  // При изменении isRunning
  useEffect(() => {
    if (isRunning) {
      audioService.changeSound(selectedSound, true)
    } else {
      audioService.pause()
    }
  }, [isRunning])

  // Передаём loadUser в сервис
  useEffect(() => {
    timerService.setLoadUser(loadUser)
  }, [loadUser])

  // visibilitychange — пересчитываем время при возврате на страницу
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && pomodoroSettings) {
        timerService.syncFromStorage(pomodoroSettings)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [pomodoroSettings])

  // Инициализация
  useEffect(() => {
    if (initDone.current) return
    initDone.current = true
    const savedAutoSwitch = localStorage.getItem('lifequest_auto_switch') !== 'false'
    setAutoSwitch(savedAutoSwitch)

    const init = async () => {
      try {
        const [settingsData, tasksData, statsData] = await Promise.all([
          pomodoroApi.getSettings(),
          tasksApi.getAll(),
          pomodoroApi.getTodayStats(),
        ])

        setPomodoroSettings(settingsData.settings)
        timerService.updateSettings(settingsData.settings)
        setTasks(tasksData.tasks)

        const store = useTimerStore.getState()
        store.setTodayStats(statsData.totalMinutes, statsData.sessionsCount, statsData.completedCycles)

        // Восстановление состояния
        const saved = JSON.parse(localStorage.getItem('lifequest_timer_v4') || '{}')

        if (saved.mode) store.setMode(saved.mode)
        if (saved.modeDuration) store.setModeDuration(saved.modeDuration)
        if (saved.sessionId) store.setSessionId(saved.sessionId)
        if (saved.taskId !== undefined) store.setSelectedTaskId(saved.taskId)
        if (saved.taskSelected) store.setTaskSelected(true)
        if (saved.sessionCount) store.setSessionCount(saved.sessionCount)

        // Если нет modeDuration — вычисляем
        if (!saved.modeDuration) {
          const modeDuration = (store.mode === 'work'
            ? settingsData.settings.workDuration
            : store.mode === 'shortBreak'
              ? settingsData.settings.shortBreak
              : settingsData.settings.longBreak) * 60

          store.setModeDuration(modeDuration)
        }

        const pausedLeft = saved.pausedTimeLeft
        const savedDuration = saved.modeDuration

        // Синхронизация времени
        if (saved.isRunning && saved.endEpoch) {
          const remaining = Math.max(0, Math.round((saved.endEpoch - Date.now()) / 1000))
          store.setTimeLeft(remaining)
          store.setIsRunning(true)
        } else if (pausedLeft !== undefined) {
          store.setTimeLeft(pausedLeft)
          store.setIsRunning(false)
        } else if (savedDuration !== undefined) {
          store.setTimeLeft(savedDuration)
        }
        const navTaskId = location.state?.taskId
        if (navTaskId) {
          // Навигация из задачи — перезаписываем localStorage
          store.setSelectedTaskId(navTaskId)
          store.setTaskSelected(true)
          timerService.setLastTaskId(navTaskId) // ← добавь метод в сервис
          // Чистим location.state чтобы при повторном монтировании не срабатывало
          window.history.replaceState({}, '')
        } else if (saved.taskId !== undefined) {
          store.setSelectedTaskId(saved.taskId)
          if (saved.taskSelected) store.setTaskSelected(true)
        }

        // запуск сервиса
        timerService.syncFromStorage(settingsData.settings)
        // Инвентарь
        try {
          const invRes = await apiClient.get('/inventory')
          const items: { itemType: string; name: string }[] = invRes.data.items || []
          setUnlockedSounds(items.filter(i => i.itemType === 'sound').map(i => i.name))
          setUnlockedBgs(items.filter(i => i.itemType === 'background').map(i => i.name))
          setUnlockedTimerStyles(items.filter(i => i.itemType === 'timer').map(i => i.name))
        } catch { /* ignore */ }

      } catch (err) {
        console.error('PomodoroPage init error:', err)
      }
    }
    init()

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  // Сохраняем UI настройки
  useEffect(() => { localStorage.setItem('lifequest_sound', selectedSound) }, [selectedSound])
  useEffect(() => { localStorage.setItem('lifequest_bg', selectedBg) }, [selectedBg])
  useEffect(() => { localStorage.setItem('lifequest_timer_style', selectedTimerStyle) }, [selectedTimerStyle])
  useEffect(() => { localStorage.setItem('lifequest_auto_switch', String(autoSwitch)) }, [autoSwitch])

  const handleStart = async () => {
    if (!pomodoroSettings) return
    if (!taskSelected) { setShowTaskSelect(true); return }
    await timerService.start(selectedTaskId, pomodoroSettings)
  }

  const handlePause = () => timerService.pause()
  const handleReset = () => timerService.reset()
  const handleModeChange = (m: TimerMode) => {
    if (pomodoroSettings) timerService.changeMode(m, pomodoroSettings)
  }

  const handleSaveSettings = async (data: Partial<PomodoroSettings>) => {
    try {
      const res = await pomodoroApi.updateSettings(data)
      setPomodoroSettings(res.settings)
      timerService.updateSettings(res.settings) // ← критично

      // Обновляем modeDuration если таймер не запущен
      const saved = JSON.parse(localStorage.getItem('lifequest_timer_v4') || '{}')
      if (!saved.isRunning) {
        const store = useTimerStore.getState()
        const durSec = (store.mode === 'work'
          ? res.settings.workDuration
          : store.mode === 'shortBreak'
            ? res.settings.shortBreak
            : res.settings.longBreak) * 60
        store.setTimeLeft(durSec)
        store.setModeDuration(durSec)
        // Обновляем localStorage тоже
        const cur = JSON.parse(localStorage.getItem('lifequest_timer_v4') || '{}')
        localStorage.setItem('lifequest_timer_v4', JSON.stringify({ ...cur, pausedTimeLeft: durSec, modeDuration: durSec }))
      }
    } catch (err) {
      console.error('Save settings error:', err)
    }
  }

  const handlePurchase = async (type: 'sound' | 'bg' | 'timer', id: string, _label: string, _icon: string, price: number) => {
    try {
      const itemType = type === 'sound' ? 'sound' : type === 'bg' ? 'background' : 'timer'
      await apiClient.post('/inventory/purchase', { itemType, name: id, price })
      if (type === 'sound') { setUnlockedSounds(p => [...p, id]); setSelectedSound(id) }
      else if (type === 'bg') { setUnlockedBgs(p => [...p, id]); setSelectedBg(id) }
      else { setUnlockedTimerStyles(p => [...p, id]); setSelectedTimerStyle(id as TimerStyle) }
      loadUser()
    } catch (err: any) {
      console.error('Purchase error:', err?.response?.data?.error || err)
    }
  }

  const progress = modeDuration > 0 ? ((modeDuration - timeLeft) / modeDuration) * 100 : 0
  const selectedTask = tasks.find(t => t.id === selectedTaskId)
  const displayMinutes = todayMinutes + Math.floor(useTimerStore.getState().activeSecondsToday / 60)

  const bgConfig = BG_CONFIG.find(b => b.id === selectedBg)
  const bgStyle = bgConfig?.style || {}


  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center relative transition-all duration-1000 overflow-hidden"
      style={bgStyle}>
             {/* Живой фон поверх CSS цвета */}
      <LiveBackground bgId={selectedBg} />
      {/* Overlay для читаемости текста при активном видео/анимации */}
      {bgConfig?.animated && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)', zIndex: 1 }}
        />
      )}
      <div className="relative z-10 w-full flex flex-col items-center justify-center min-h-[calc(100vh-80px)]">

        <button onClick={() => setShowSettings(true)}
          className="absolute top-4 right-4 p-2.5 rounded-xl text-slate-400 hover:text-white transition-colors"
          style={{ backgroundColor: 'rgba(30,41,59,0.9)', border: '1px solid #334155' }}>
          <Settings size={20} />
        </button>

        <div className="w-full max-w-md px-4 space-y-6">

          {/* Режимы */}
          <div className="flex rounded-xl overflow-hidden mx-auto w-fit"
            style={{ backgroundColor: 'rgba(30,41,59,0.9)', border: '1px solid #334155' }}>
            {(['work', 'shortBreak', 'longBreak'] as TimerMode[]).map(m => (
              <button key={m} onClick={() => handleModeChange(m)}
                className="px-4 py-2 text-sm font-medium transition-all"
                style={{
                  backgroundColor: mode === m ? '#4f46e5' : 'transparent',
                  color: mode === m ? '#fff' : (isRunning || sessionId !== null) ? '#475569' : '#94a3b8',
                  cursor: (isRunning || sessionId !== null) ? 'not-allowed' : 'pointer',
                }}>
                {m === 'work' ? 'Фокус' : m === 'shortBreak' ? 'Перерыв' : 'Длинный перерыв'}
              </button>
            ))}
          </div>

          {/* Таймер */}
          <div className="flex flex-col items-center gap-4">
            <TimerVisual progress={progress} timeLeft={timeLeft} mode={mode} isRunning={isRunning} timerStyle={selectedTimerStyle} />
            {lastReward && (
              <div className="flex items-center gap-4 px-5 py-2.5 rounded-xl"
                style={{ backgroundColor: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)' }}>
                <span className="text-indigo-300 font-semibold">+{lastReward.xp} XP</span>
                <span className="text-yellow-400 font-semibold">+{lastReward.gold} 🪙</span>
              </div>
            )}
          </div>

          {/* Задача */}
          <button onClick={() => !(isRunning || sessionId !== null) && setShowTaskSelect(true)}
            className="w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all"
            style={{
              backgroundColor: 'rgba(30,41,59,0.9)',
              border: `1px solid ${selectedTask ? 'rgba(99,102,241,0.4)' : '#334155'}`,
              cursor: (isRunning || sessionId !== null) ? 'default' : 'pointer',
            }}>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-indigo-400 shrink-0">🎯</span>
              <span className="text-sm truncate" style={{ color: selectedTask ? '#f1f5f9' : (taskSelected && !selectedTask ? '#a5b4fc' : '#64748b') }}>
                {selectedTask ? selectedTask.title : (taskSelected ? 'Без задачи' : 'Выбрать задачу...')}
              </span>
            </div>
            {!(isRunning || sessionId !== null) && <ChevronRight size={16} className="text-slate-400 shrink-0" />}
          </button>

          {/* Управление */}
          <div className="flex items-center justify-center gap-6">
            <button onClick={handleReset}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105"
              style={{ backgroundColor: 'rgba(30,41,59,0.9)', border: '1px solid #334155', color: '#94a3b8' }}>
              <RotateCcw size={18} />
            </button>
            <button onClick={isRunning ? handlePause : handleStart}
              className="w-20 h-20 rounded-full flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95"
              style={{ backgroundColor: '#4f46e5', boxShadow: isRunning ? '0 0 40px rgba(79,70,229,0.6)' : '0 0 20px rgba(79,70,229,0.3)' }}>
              {isRunning ? <Pause size={28} /> : <Play size={28} className="ml-1" />}
            </button>
            <div className="w-12 h-12" />
          </div>

          {autoSwitch && (
            <div className="text-center">
              <span className="text-xs text-slate-500 flex items-center justify-center gap-1">
                <Zap size={11} className="text-indigo-400" /> Автопереключение включено
              </span>
            </div>
          )}

          {/* Статистика */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Минут', value: displayMinutes },
              { label: 'Сессий', value: todaySessions },
              { label: 'Циклов', value: todayCycles },
            ].map(({ label, value }) => (
              <div key={label} className="text-center p-3 rounded-xl"
                style={{ backgroundColor: 'rgba(30,41,59,0.9)', border: '1px solid #334155' }}>
                <div className="text-2xl font-bold text-white">{value}</div>
                <div className="text-xs text-slate-400">{label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Выбор задачи */}
      {showTaskSelect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowTaskSelect(false)} />
          <div className="relative w-full max-w-md rounded-2xl p-5 z-10 max-h-[70vh] overflow-y-auto"
            style={{ backgroundColor: '#1e293b', border: '1px solid #334155' }}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-semibold">Выберите задачу</h3>
              <button onClick={() => setShowTaskSelect(false)} className="text-slate-400 hover:text-white"><X size={20} /></button>
            </div>
            <div className="space-y-2">
              <button onClick={() => { setSelectedTaskId(null); setTaskSelected(true); setShowTaskSelect(false) }}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                style={{
                  backgroundColor: taskSelected && selectedTaskId === null ? 'rgba(99,102,241,0.2)' : 'rgba(100,116,139,0.1)',
                  border: `1px solid ${taskSelected && selectedTaskId === null ? '#6366f1' : '#475569'}`,
                }}>
                <span className="text-slate-400 shrink-0">⏱</span>
                <div className="flex-1">
                  <p className="text-slate-300 text-sm">Без задачи</p>
                  <p className="text-slate-500 text-xs">Просто фокус-время</p>
                </div>
                {taskSelected && selectedTaskId === null && <span className="text-indigo-400">✓</span>}
              </button>

              <div className="flex items-center gap-2 py-1">
                <div className="flex-1 h-px" style={{ backgroundColor: '#334155' }} />
                <span className="text-slate-600 text-xs">задачи</span>
                <div className="flex-1 h-px" style={{ backgroundColor: '#334155' }} />
              </div>

              {tasks.filter(t => t.status !== 'done').map(task => (
                <button key={task.id}
                  onClick={() => { setSelectedTaskId(task.id); setTaskSelected(true); setShowTaskSelect(false) }}
                  className="w-full flex items-center gap-3 p-3 rounded-xl text-left transition-all"
                  style={{
                    backgroundColor: selectedTaskId === task.id ? 'rgba(99,102,241,0.2)' : '#0f172a',
                    border: `1px solid ${selectedTaskId === task.id ? '#6366f1' : '#334155'}`,
                  }}>
                  {task.isFocusToday && <span>⭐</span>}
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm truncate">{task.title}</p>
                    {task.goal && <p className="text-slate-500 text-xs">🎯 {task.goal.title}</p>}
                  </div>
                  {selectedTaskId === task.id && <span className="text-indigo-400">✓</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {showSettings && pomodoroSettings && (
        <SettingsPanel
          settings={pomodoroSettings}
          userGold={user?.gold || 0}
          unlockedSounds={unlockedSounds}
          unlockedBgs={unlockedBgs}
          unlockedTimerStyles={unlockedTimerStyles}
          selectedSound={selectedSound}
          selectedBg={selectedBg}
          selectedTimerStyle={selectedTimerStyle}
          autoSwitch={autoSwitch}
          onSaveTimer={handleSaveSettings}
          onSelectSound={setSelectedSound}
          onSelectBg={setSelectedBg}
          onSelectTimerStyle={setSelectedTimerStyle}
          onToggleAutoSwitch={() => setAutoSwitch(!autoSwitch)}
          onPurchase={handlePurchase}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
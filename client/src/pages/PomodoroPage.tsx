import { useState, useEffect, useRef } from 'react'
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
import { SHOP_ITEMS } from '../data/shopItems'

export type TimerStyle = 'circle' | 'hourglass' | 'cheetah' | 'horse' | 'snail' | 'clock'

const SOUND_ITEMS = [
  {
    id: 'none',
    name: 'Без звука',
    category: 'pomodoro_sound',
    price: 0,
    soundConfig: {
      icon: '🔇'
    }
  },
  ...SHOP_ITEMS.filter(i => i.category === 'pomodoro_sound')
]

const BACKGROUND_ITEMS = [
  {
    id: 'none',
    name: 'Без фона',
    category: 'background',
    price: 0,
    background: null
  },
  ...SHOP_ITEMS.filter(i => i.category === 'background')
]

const TIMER_STYLE_ITEMS = [
  {
    id: 'default',
    name: 'Без стиля',
    category: 'pomodoro_timer',
    price: 0,
    timerStyleConfig: {
      style: 'circle',
      icon: '⭕'
    }
  },
  ...SHOP_ITEMS.filter(i => i.category === 'pomodoro_timer')
]



function LiveBackground({ bgId }: { bgId: string }) {
  const config = BACKGROUND_ITEMS.find(b => b.id === bgId)

  if (!config?.background) return null

  if (config.background.type === 'video') {
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
        <source src={config.background.value} type="video/mp4" />
      </video>
    )
  }

  return null
}


function formatTime(s: number): string {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`
}

// TimerVisual
interface TimerVisualProps {
  progress: number; timeLeft: number; mode: TimerMode
  isRunning: boolean; timerStyle: TimerStyle, modeDuration: number
}

function TimerVisual({ progress, timeLeft, mode, isRunning, timerStyle, modeDuration }: TimerVisualProps) {
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
          className={`relative w-64 h-64 flex items-center justify-center
            ${isFlipped ? 'hourglass-flip' : ''}
            ${isRunning ? 'hourglass-active' : ''}
          `}
          style={{ transformOrigin: 'center' }}
        >
        <svg viewBox="0 0 120 180" className="w-48 h-48">
          <path d="M20,10 L100,10 L70,85 L100,170 L20,170 L50,85 Z"
            fill="rgba(15,23,42,0.72)" stroke="#334155" strokeWidth="2.5" strokeLinejoin="round" />
          {topFill > 0.01 && (
            <polygon points={`${xLeft},${sandTop} ${xRight},${sandTop} 70,85 50,85`}
              fill={color} opacity="0.8" style={{ transition: 'all 1s linear' }} />
          )}
          {botFill > 0.01 && (
            <polygon points={`50,85 70,85 ${bxRight},${sandBot} ${bxLeft},${sandBot}`}
              fill={color} opacity="0.8" style={{ transition: 'all 1s linear' }} />
              
          )}
          {topFill > 0.01 && topFill < 0.99 && (
            <g className="sand-stream">
              <line
                x1="60"
                y1="85"
                x2="60"
                y2="93"
                stroke={color}
                strokeWidth="1.8"
                strokeLinecap="round"
              />

              <circle
                cx="60"
                cy="88"
                r="1"
                fill={color}
                opacity="0.9"
              />

              <circle
                cx="60"
                cy="91"
                r="0.8"
                fill={color}
                
                opacity="0.7"
              />
            </g>
          )}
          {isRunning && topFill > 0.01 && (
            <>
              <circle className="sand-particle-1" cx="59" cy="87" r="0.7" fill={color}  />
              <circle className="sand-particle-2" cx="61" cy="89" r="0.5" fill={color} />
              <circle className="sand-particle-3" cx="60" cy="92" r="0.6" fill={color} />
            </>
          )}
          <path
            d="M20,10 L100,10 L70,85 L100,170 L20,170 L50,85 Z"
            fill="none"
            stroke={isRunning ? color : '#475569'}
            strokeWidth="2.2"
            strokeLinejoin="round"
            style={{
              filter: isRunning
                ? `drop-shadow(0 0 10px ${color})`
                : 'none',
              transition: 'all 0.5s ease'
            }}
          />
        </svg>
        
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold text-white font-mono drop-shadow-lg">{formatTime(timeLeft)}</span>
          {isRunning && mode === 'work' && <span className="text-indigo-400 text-xs mt-1 animate-pulse">● Фокус</span>}
          {isRunning && mode !== 'work' && <span className="text-green-400 text-xs mt-1 animate-pulse">● Перерыв</span>}
        </div>
      </div>
    )
  }

  if (timerStyle === 'clock') {
    const totalSeconds = modeDuration
    const elapsed = totalSeconds - timeLeft

    const seconds = elapsed % 60
    const minutes = Math.floor(elapsed / 60)

    const secondsAngle = (seconds / 60) * 360
    const minutesAngle = (minutes / 60) * 360 + (seconds / 60) * 6

    return (
      <div className="relative w-72 h-72">
        <svg viewBox="0 0 200 200" className="w-full h-full">

          {/* Внешний корпус */}
          <circle
            cx="100"
            cy="100"
            r="92"
            fill="#0f172a"
            stroke={isRunning ? color : '#475569'}
            strokeWidth="6"
            style={{
              filter: isRunning
                ? `drop-shadow(0 0 10px ${color})`
                : 'none',
              transition: 'all 0.5s ease'
            }}
          />

          {/* Деления */}
          {Array.from({ length: 60 }).map((_, i) => {
            const angle = (i * 6 * Math.PI) / 180
            const inner = i % 5 === 0 ? 74 : 82
            const outer = 88

            return (
              <line
                key={i}
                x1={100 + inner * Math.cos(angle)}
                y1={100 + inner * Math.sin(angle)}
                x2={100 + outer * Math.cos(angle)}
                y2={100 + outer * Math.sin(angle)}
                stroke={i % 5 === 0 ? '#cbd5e1' : '#64748b'}
                strokeWidth={i % 5 === 0 ? 2 : 1}
              />
            )
          })}

          {/* Минутная стрелка */}
          <line
            x1="100"
            y1="100"
            x2="100"
            y2="45"
            stroke="#e2e8f0"
            strokeWidth="4"
            strokeLinecap="round"
            transform={`rotate(${minutesAngle} 100 100)`}
            style={{ transition: 'transform 1s linear' }}
          />

          {/* Секундная стрелка */}
          <line
            x1="100"
            y1="100"
            x2="100"
            y2="30"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            transform={`rotate(${secondsAngle} 100 100)`}
            style={{ transition: 'transform 1s linear' }}
          />

          {/* Центр */}
          <circle cx="100" cy="100" r="5" fill="#fff" />
        </svg>
        <div
          className="absolute inset-6 rounded-full pointer-events-none"
          style={{
            backdropFilter: 'blur(1px)',
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.06)',
            boxShadow: 'inset 0 0 25px rgba(255,255,255,0.03)'
          }}
        />

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-white font-mono">
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>
    )
  }

  if (timerStyle === 'cheetah' || timerStyle === 'horse' || timerStyle === 'snail') {
    const TIMER_ASSETS = {
      cheetah: {
        src: '/timers/cheetah.webp',
        className: 'cheetah-speed'
      },
      horse: {
        src: '/timers/horse.webp',
        className: 'timer-bounce'
      },
      snail: {
        src: '/timers/snail.webp',
        className: ''
      }
    }
    const asset = TIMER_ASSETS[timerStyle]
    const rad = ((angle - 90) * Math.PI) / 180
    const cx = 50 + 45 * Math.cos(rad)
    const cy = 50 + 45 * Math.sin(rad)
    const size = timerStyle === 'cheetah' ? 80 : 56
    return (
      <div className="relative w-64 h-64">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="52" r="42" fill="none" stroke="#1e293b" strokeWidth="6" />
          <circle cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={`${2 * Math.PI * 42}`}
            strokeDashoffset={`${2 * Math.PI * 42 * (1 - progress / 100)}`}
            style={{ transition: 'stroke-dashoffset 1s linear ', }} />
        </svg>
        <div
          className="absolute"
          style={{
            left: `${(cx / 100) * 256 - size / 2}px`,
            top: `${(cy / 100) * 256 - size / 2}px`,
            transform: `rotate(${angle}deg)`,
            transition: 'all 0.8s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <div className={asset.className}>
            <img
            style={{
              transform: 'rotate(0deg)',
              filter: timerStyle === 'cheetah' ? 'drop-shadow(0 0 12px rgba(250,204,21,0.6))': timerStyle === 'horse' ? 'drop-shadow(0 0 10px rgba(255,255,255,0.35))' : 'drop-shadow(0 0 8px rgba(34,197,94,0.4))'
            }}
              src={asset.src}
              className={`
                -rotate-90
                object-contain
                select-none
                pointer-events-none
                ${timerStyle === 'cheetah' ? 'w-20 h-20' : 'w-14 h-14'}
              `}
              draggable={false}
            />
          </div>
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-4xl font-bold text-white font-mono">{formatTime(timeLeft)}</span>
          <span className="text-slate-400 text-xs mt-1">
          </span>
          {isRunning && mode === 'work' && <span className="text-indigo-400 text-xs mt-1 animate-pulse">● Фокус</span>}
          {isRunning && mode !== 'work' && <span className="text-green-400 text-xs mt-1 animate-pulse">● Перерыв</span>}
        </div>
      </div>
    )
  }

  return (
    <div className={`relative w-64 h-64 ${ isRunning ? 'timer-glow' : ''}`}>
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
        </span>
        {isRunning && mode === 'work' && <span className="text-indigo-400 text-xs mt-1 animate-pulse">● Фокус</span>}
        {isRunning && mode !== 'work' && <span className="text-green-400 text-xs mt-1 animate-pulse">● Перерыв</span>}
      </div>
    </div>
  )
}

// ============ SettingsPanel ============
interface SettingsPanelProps {
  settings: PomodoroSettings; 
  unlockedSounds: string[]; unlockedBgs: string[]; unlockedTimerStyles: string[]
  selectedSound: string; selectedBg: string; selectedTimerStyle: TimerStyle; autoSwitch: boolean
  onSaveTimer: (s: Partial<PomodoroSettings>) => void
  onSelectSound: (id: string) => void; onSelectBg: (id: string) => void
  onSelectTimerStyle: (id: TimerStyle) => void; onToggleAutoSwitch: () => void
  // onPurchase: (type: 'sound' | 'bg' | 'timer', id: string, label: string, icon: string, price: number) => Promise<void>
  onClose: () => void
  volume: number
  onVolumeChange: (v: number) => void
}

function SettingsPanel({
  settings, unlockedSounds, unlockedBgs, unlockedTimerStyles,
  selectedSound, selectedBg, selectedTimerStyle, autoSwitch,
  onSaveTimer, onSelectSound, onSelectBg, onSelectTimerStyle, onToggleAutoSwitch, onClose,
  volume, onVolumeChange,
}: SettingsPanelProps) {
  const [work, setWork] = useState(settings.workDuration)
  const [shortB, setShortB] = useState(settings.shortBreak)
  const [longB, setLongB] = useState(settings.longBreak)
  const [cycles, setCycles] = useState(settings.cyclesBeforeLong)
  const [timeError, setTimeError] = useState('')
  // const [purchaseItem, setPurchaseItem] = useState<{id: string, name: string, price: number, icon: string, type: 'sound' | 'bg' | 'timer'} | null>(null)

  const inputStyle = { backgroundColor: '#0f172a', border: '1px solid #334155', color: '#fff' }
  const handleItemClick = (
    type: 'sound' | 'bg' | 'timer',
    item: any
  ) => {
    const unlocked =
      type === 'sound'
        ? unlockedSounds
        : type === 'bg'
          ? unlockedBgs
          : unlockedTimerStyles

    const isUnlocked =
      item.price === 0 || unlocked.includes(item.id)

    // НЕ куплено → ничего не делаем
    if (!isUnlocked) {
      return
    }

    // Куплено → экипируем
    if (type === 'sound') {
      onSelectSound(item.id)
    } else if (type === 'bg') {
      onSelectBg(item.id)
    } else {
      onSelectTimerStyle(item.timerStyleConfig.style)
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
                  onChange={e => {
                    const val = Number(e.target.value)

                    ;(setter as (v: number) => void)(val)

                    if (label.includes('Рабочая')) {
                      if (val < 5) {
                        setTimeError('Рабочая сессия не может быть меньше 5 минут')
                      } else if (val > 120) {
                        setTimeError('Рабочая сессия не может быть больше 120 минут')
                      } else {
                        setTimeError('')
                      }
                    }
                  }}
                  min={min} max={max}
                  className="w-20 rounded-lg px-3 py-2 outline-none text-center text-sm focus:ring-2 focus:ring-indigo-500"
                  style={inputStyle} />
              </div>
            ))}
            {timeError && (
              <div
                className="text-red-400 text-xs px-1"
              >
                {timeError}
              </div>
            )}
            <button disabled={!!timeError} onClick={() => onSaveTimer({ workDuration: work, shortBreak: shortB, longBreak: longB, cyclesBeforeLong: cycles })}
              className="w-full py-2.5 rounded-xl text-white text-sm font-medium"
              style={{ opacity: timeError ? 0.6 : 1, cursor: timeError ? 'not-allowed' : 'pointer', backgroundColor: '#4f46e5' }}>
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
              <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wide">Стиль таймера</h3>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {TIMER_STYLE_ITEMS.map(ts => {
                const isUnlocked = ts.price === 0 || unlockedTimerStyles.includes(ts.id)
                const isSelected = selectedTimerStyle === ts.timerStyleConfig?.style
                return (
                  <button key={ts.id} onClick={() => handleItemClick('timer', ts)}
                    className="flex items-center gap-2 p-3 rounded-xl transition-all text-left"
                    style={{ opacity: !isUnlocked ? 0.5 : 1, cursor: !isUnlocked ? 'not-allowed' : 'pointer', backgroundColor: isSelected ? 'rgba(99,102,241,0.2)' : '#0f172a', border: `1px solid ${isSelected ? '#6366f1' : '#334155'}` }}>
                    <span className="text-2xl shrink-0">{ts.timerStyleConfig?.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm">{ts.name}</p>
                      {!isUnlocked ? (
                        <p className="text-slate-500 text-xs flex items-center gap-1">
                          <Lock size={10} />
                          Не куплено
                        </p>
                      ) : isSelected ? (
                        <p className="text-indigo-400 text-xs">Активен</p>
                      ) : (
                        <p className="text-slate-500 text-xs">
                          Разблокирован
                        </p>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Фоны */}
          <div className="mb-5">
            <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-3">Фон</h3>
            <div className="grid grid-cols-2 gap-2">
              {BACKGROUND_ITEMS.map(bg => {
                const isUnlocked = bg.price === 0 || unlockedBgs.includes(bg.id)
                const isSelected = selectedBg === bg.id
                return (
                  <button key={bg.id} onClick={() => handleItemClick('bg', { ...bg, icon: '🎨' })}
                    className="flex items-center gap-2 p-3 rounded-xl transition-all text-left"
                    style={{
                      opacity: !isUnlocked ? 0.5 : 1, cursor: !isUnlocked ? 'not-allowed' : 'pointer',
                      backgroundColor: isSelected ? 'rgba(99,102,241,0.2)' : '#0f172a',
                      border: `1px solid ${isSelected ? '#6366f1' : '#334155'}`,
                    }}>
                    {/* Превью фона */}
                    <div
                      className="w-10 h-10 rounded-lg shrink-0 overflow-hidden relative bg-cover bg-center"
                      style={
                        bg.background?.type === 'gradient'
                          ? { background: bg.background.value }
                          : bg.background?.type === 'image'
                            ? { backgroundImage: `url(${bg.background.value})` }
                            : {}
                      }
                    >
                      {bg.background?.type === 'video' && (
                        <video
                          autoPlay
                          loop
                          muted
                          playsInline
                          className="absolute inset-0 w-full h-full object-cover opacity-70"
                        >
                          <source src={bg.background.value} type="video/mp4" />
                        </video>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm">{bg.name}</p>
                      {!isUnlocked
                        ? <p className="text-slate-500 text-xs flex items-center gap-1">
                            <Lock size={10} />
                            Не куплено
                          </p>
                        : isSelected
                          ? <p className="text-indigo-400 text-xs">Активен</p>
                          : <p className="text-slate-500 text-xs">Разблокирован</p>}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Звуки */}
          <div>
            <h3 className="text-slate-400 text-xs font-medium uppercase tracking-wide mb-3">Звук</h3>
            <div
              className="mb-4 p-3 rounded-xl"
              style={{
                backgroundColor: '#0f172a',
                border: '1px solid #334155'
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-300 text-sm">
                  Громкость
                </span>

                <span className="text-indigo-400 text-sm font-medium">
                  {Math.round(volume * 100)}%
                </span>
              </div>

              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={volume}
                onChange={e => onVolumeChange(Number(e.target.value))}
                className="w-full accent-indigo-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {SOUND_ITEMS.map(sound => {
                const isUnlocked = sound.price === 0 || unlockedSounds.includes(sound.id)
                const isSelected = selectedSound === sound.id
                return (
                  <button key={sound.id} onClick={() => handleItemClick('sound', sound)}
                    className="flex items-center gap-2 p-3 rounded-xl transition-all"
                    style={{ opacity: !isUnlocked ? 0.5 : 1, cursor: !isUnlocked ? 'not-allowed' : 'pointer', backgroundColor: isSelected ? 'rgba(99,102,241,0.2)' : '#0f172a', border: `1px solid ${isSelected ? '#6366f1' : '#334155'}` }}>
                    <span className="text-xl shrink-0">{sound.soundConfig?.icon}</span>
                    <div className="flex-1 text-left min-w-0">
                      <p className="text-white text-sm truncate">{sound.name}</p>
                      {!isUnlocked ? <p className="text-slate-500 text-xs flex items-center gap-1"><Lock size={10} />Не куплено</p>
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
    </>
  )
}

// ============ Главный компонент ============
export default function PomodoroPage() {
  const location = useLocation()
  const { loadUser } = useAuth()

  // Zustand store — глобальное состояние таймера
  const {
    mode, timeLeft, modeDuration, isRunning, sessionId, selectedTaskId, taskSelected,
    todayMinutes, todaySessions, todayCycles, lastReward, autoSwitch,
    setSelectedTaskId, setTaskSelected, setAutoSwitch,
  } = useTimerStore()

  const [pomodoroSettings, setPomodoroSettings] = useState<PomodoroSettings | null>(null)
  const [tasks, setTasks] = useState<Task[]>([])
  const [selectedSound, setSelectedSound] = useState(() =>
    localStorage.getItem('lifequest_sound') || 'none'
  )
  const [volume, setVolume] = useState(() =>
    Number(localStorage.getItem('lifequest_volume') || 0.5)
  )
  const [selectedBg, setSelectedBg] = useState(() =>
  localStorage.getItem('lifequest_bg') || 'none'  )
  const [selectedTimerStyle, setSelectedTimerStyle] = useState<TimerStyle>(() =>
    (localStorage.getItem('lifequest_timer_style') as TimerStyle) || 'circle'
  )
  const [unlockedSounds, setUnlockedSounds] = useState<string[]>([])
  const [unlockedBgs, setUnlockedBgs] = useState<string[]>([])
  const [unlockedTimerStyles, setUnlockedTimerStyles] = useState<string[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [showTaskSelect, setShowTaskSelect] = useState(false)
  const initDone = useRef(false)
  const pomodoroSettingsRef = useRef<PomodoroSettings | null>(null)
  useEffect(() => { pomodoroSettingsRef.current = pomodoroSettings }, [pomodoroSettings])

  // храним предыдущий выбранный звук, чтобы понять — это смена звука или нет
  const prevSoundRef = useRef(selectedSound)

  useEffect(() => {
    localStorage.setItem('lifequest_sound', selectedSound)

    const soundChanged = prevSoundRef.current !== selectedSound
    prevSoundRef.current = selectedSound

    // реагируем только если звук реально сменили во время работы таймера
    if (!soundChanged) return
    if (!isRunning) return

    if (selectedSound === 'none') {
      audioService.pause()
    } else {
      audioService.play(selectedSound)
    }
  }, [selectedSound, isRunning])

  useEffect(() => {
    if (isRunning) {
      if (selectedSound === 'none') audioService.pause()
      else audioService.resume()
    } else {
      audioService.pause()
    }
  }, [isRunning, selectedSound])

  useEffect(() => {
    localStorage.setItem('lifequest_volume', String(volume))
    audioService.setVolume(volume)
  }, [volume])


  // Передаём loadUser в сервис
  useEffect(() => {
    timerService.setLoadUser(loadUser)
  }, [loadUser])

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        const settings = pomodoroSettingsRef.current
        if (!settings) return
        timerService.syncFromStorage(settings)
        // лёгкое обновление статистики — без await, не блокируем
        pomodoroApi.getTodayStats().then(s => {
          useTimerStore.getState().setTodayStats(s.totalMinutes, s.sessionsCount, s.completedCycles)
        }).catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])  // ← пустой массив, эффект навешивается ОДИН раз

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
        // if (saved.sessionCount !== undefined) {
        //   store.setSessionCount(saved.sessionCount)
        // }

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
          const items: { itemId: string, itemType: string, name: string }[] = invRes.data.items || []
          setUnlockedSounds(
            items
              .filter(i => i.itemType === 'pomodoro_sound')
              .map(i => i.itemId || i.name)
          )

          setUnlockedBgs(
            items
              .filter(i => i.itemType === 'background')
              .map(i => i.itemId || i.name)
          )

          setUnlockedTimerStyles(
            items
              .filter(i => i.itemType === 'pomodoro_timer')
              .map(i => i.itemId || i.name)
          )
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
  useEffect(() => { localStorage.setItem('lifequest_bg', selectedBg) }, [selectedBg])
  useEffect(() => { localStorage.setItem('lifequest_timer_style', selectedTimerStyle) }, [selectedTimerStyle])
  useEffect(() => { localStorage.setItem('lifequest_auto_switch', String(autoSwitch)) }, [autoSwitch])

  const handleStart = async () => {
    if (!pomodoroSettings) return

    if (!taskSelected && selectedTaskId === null) {
      setTaskSelected(true)
    }

    try {
      // Запускаем звук прямо в user gesture
      if (selectedSound !== 'none') {
        audioService.play(selectedSound)
      }

      await timerService.start(
        selectedTaskId ?? null,
        pomodoroSettings
      )
    } catch (err) {
      console.error('START ERROR:', err)
    }
  }

  const handlePause = () => timerService.pause()
    const handleFinish = async () => {
    try {
      await timerService.finishEarly()
    } catch (err) {
      console.error('Finish session error:', err)
    }
  }
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

  const progress = modeDuration > 0 ? ((modeDuration - timeLeft) / modeDuration) * 100 : 0
  const selectedTask = tasks.find(t => t.id === selectedTaskId)
  const displayMinutes = todayMinutes + Math.floor(useTimerStore.getState().activeSecondsToday / 60)

  const selectedBackgroundItem = BACKGROUND_ITEMS.find(b => b.id === selectedBg)

  const bgStyle = selectedBackgroundItem?.background?.type === 'gradient' ? { background: selectedBackgroundItem.background.value } : selectedBackgroundItem?.background?.type === 'image'
    ? {backgroundImage: `url(${selectedBackgroundItem.background.value})`, backgroundSize: 'cover', backgroundPosition: 'center',}: {}

  
  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col items-center justify-center relative transition-all duration-1000 overflow-hidden"
      style={bgStyle}>
             {/* Живой фон поверх CSS цвета */}
      <LiveBackground bgId={selectedBg} />
      {/* Overlay для читаемости текста при активном видео/анимации */}
      {selectedBackgroundItem?.background?.type === 'video' && (
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
            <TimerVisual progress={progress} timeLeft={timeLeft} mode={mode} isRunning={isRunning} timerStyle={selectedTimerStyle} modeDuration={modeDuration} />
            {lastReward && (
              <div className="flex items-center gap-4 px-5 py-2.5 rounded-xl"
                style={{ backgroundColor: 'rgba(99,102,241,0.2)', border: '1px solid rgba(99,102,241,0.4)' }}>
                <span className="text-indigo-300 font-semibold">+{lastReward.xp} XP</span>
                <span className="text-yellow-400 font-semibold">+{lastReward.gold} Баллов</span>
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
              <span className="text-sm truncate" style={{ color: selectedTask ? '#f1f5f9' : (taskSelected && !selectedTask ? '#a5b4fc' : '#64748b') }}>
                {selectedTask ? selectedTask.title : (taskSelected ? 'Без задачи' : 'Выбрать задачу...')}
              </span>
            </div>
            {!(isRunning || sessionId !== null) && <ChevronRight size={16} className="text-slate-400 shrink-0" />}
          </button>

          {/* Управление */}
          <div className="flex items-center justify-center gap-4">
            {/* Сброс */}
            <button
              onClick={handleReset}
              className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-105"
              style={{
                backgroundColor: 'rgba(30,41,59,0.9)',
                border: '1px solid #334155',
                color: '#94a3b8'
              }}
            >
              <RotateCcw size={18} />
            </button>

            {/* Старт / пауза */}
            <button
              onClick={isRunning ? handlePause : handleStart}
              className="w-20 h-20 rounded-full flex items-center justify-center text-white transition-all hover:scale-105 active:scale-95"
              style={{
                backgroundColor: '#4f46e5',
                boxShadow: isRunning
                  ? '0 0 40px rgba(79,70,229,0.6)'
                  : '0 0 20px rgba(79,70,229,0.3)'
              }}
            >
              {isRunning
                ? <Pause size={28} />
                : <Play size={28} className="ml-1" />}
            </button>

            {/* Досрочное завершение */}
            <button
              onClick={handleFinish}
              disabled={!sessionId}
              className="px-4 h-12 rounded-xl text-sm font-medium transition-all"
              style={{
                backgroundColor: sessionId ? 'rgba(30,41,59,0.9)' : '#334155',
                color: sessionId ? '#fff' : '#64748b',
                opacity: sessionId ? 1 : 0.6,
                cursor: sessionId ? 'pointer' : 'not-allowed',
                border: '1px solid rgba(255,255,255,0.06)'
              }}
            >
              Завершить
            </button>
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
                    {task.goal && <p className="text-slate-500 text-xs">{task.goal.title}</p>}
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
          onClose={() => setShowSettings(false)}
          volume={volume}
          onVolumeChange={setVolume}
        />
      )}
    </div>
  )
}
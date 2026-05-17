import { useTimerStore } from '../stores/timerStore'
import { pomodoroApi } from '../api/pomodoro'
import { audioService } from './audioService'
import { dispatchRewards } from '../utils/dispatchRewards'

export type TimerMode = 'work' | 'shortBreak' | 'longBreak'

const STORAGE_KEY = 'lifequest_timer_v4'

interface StoredTimer {
  mode: TimerMode
  endEpoch: number        // когда таймер должен завершиться (абсолютное время)
  isRunning: boolean
  sessionId: number | null
  taskId: number | null
  taskSelected: boolean
  sessionCount: number
  pausedTimeLeft: number  // сколько осталось в момент паузы
  modeDuration: number    // полная длительность текущего режима
}



function save(data: Partial<StoredTimer>) {
  try {
    const cur: Partial<StoredTimer> = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}')
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...cur, ...data }))
  } catch { /* ignore */ }
}

function load(): Partial<StoredTimer> {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }
  catch { return {} }
}

function clearStorage() {
  localStorage.removeItem(STORAGE_KEY)
}

function playBeep(type: 'work' | 'break') {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    const notes = type === 'work' ? [523, 659, 784] : [784, 659, 523]
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = 'sine'
      const t = ctx.currentTime + i * 0.2
      gain.gain.setValueAtTime(0, t)
      gain.gain.linearRampToValueAtTime(0.3, t + 0.05)
      gain.gain.linearRampToValueAtTime(0, t + 0.3)
      osc.start(t)
      osc.stop(t + 0.35)
    })
  } catch { /* ignore */ }
}

class TimerService {
  private rafId: number | null = null       // requestAnimationFrame ID
  private intervalId: ReturnType<typeof setInterval> | null = null
  private loadUserFn: (() => void) | null = null
  private settings: any = null
  private lastTaskId: number | null = null
  private isCompleting = false
  private isFinishingEarly = false
  private isStarting = false
  setLastTaskId(taskId: number | null) {
    this.lastTaskId = taskId
  }

  setLoadUser(fn: () => void) { this.loadUserFn = fn }

  updateSettings(s: any) { this.settings = s }

  private get store() { return useTimerStore.getState() }

  private getDur(mode: TimerMode): number {
    const s = this.settings
    if (!s) return mode === 'work' ? 25 : mode === 'shortBreak' ? 5 : 15
    return mode === 'work' ? s.workDuration : mode === 'shortBreak' ? s.shortBreak : s.longBreak
  }

  private getAutoSwitch(): boolean {
    // Читаем из localStorage напрямую — надёжнее чем из store который мог не успеть обновиться
    return localStorage.getItem('lifequest_auto_switch') !== 'false'
  }

  // Запускаем тикер — только через requestAnimationFrame + setInterval как fallback
  private startTick() {
    this.stopTick()

    // setInterval как основной тикер — 250ms для точности, но время из эпохи
    this.intervalId = setInterval(() => {
      const saved = load()
      if (!saved.isRunning || !saved.endEpoch) return

      const remaining = Math.max(0, Math.round((saved.endEpoch - Date.now()) / 1000))
      this.store.setTimeLeft(remaining)

      if (remaining <= 0) {
        this.stopTick()
        this.complete()
      }
    }, 250) // каждые 250ms — достаточно точно и не нагружает CPU
  }

  private stopTick() {
    if (this.intervalId) { clearInterval(this.intervalId); this.intervalId = null }
    if (this.rafId) { cancelAnimationFrame(this.rafId); this.rafId = null }
  }

  // Вызывается при монтировании страницы или visibilitychange
  syncFromStorage(settings: any) {
    if (settings) this.settings = settings
    const saved = load()
    if (!saved.isRunning || !saved.endEpoch) return

    const remaining = Math.max(0, Math.round((saved.endEpoch - Date.now()) / 1000))

    if (remaining <= 0) {
      // Время вышло пока страница была неактивна
      this.store.setTimeLeft(0)
      this.complete()
    } else {
      this.store.setTimeLeft(remaining)
      this.store.setIsRunning(true)
      this.startTick()
    }
  }

  async start(taskId: number | null, settings: any) {
    if (this.isStarting) return
    this.isStarting = true

    try {
      this.settings = settings
      this.lastTaskId = taskId
      const store = this.store
      const saved = load()

      // Возобновление после паузы
      if (saved.sessionId !== null && saved.sessionId !== undefined && !saved.isRunning) {
        const pausedLeft = saved.pausedTimeLeft || store.timeLeft
        const endEpoch = Date.now() + pausedLeft * 1000

        store.setIsRunning(true)
        store.setTimeLeft(pausedLeft)

        save({ isRunning: true, endEpoch, pausedTimeLeft: 0 })
        audioService.resume()
        this.startTick()
        return
      }

      // Новая сессия
      if (saved.isRunning) return // уже запущен

      try {
        const currentMode = store.mode
        const durMin = this.getDur(currentMode)
        const durSec = durMin * 60
        let newSessionId: number | null = null
        
        if (currentMode === 'work') {
          const res = await pomodoroApi.startSession({ taskId, plannedDuration: durMin } as any)
          newSessionId = res.session.id
        } else {
          const res = await pomodoroApi.startSession({ plannedDuration: durMin } as any)
          newSessionId = res.session.id
        }

        const endEpoch = Date.now() + durSec * 1000

        store.setSessionId(newSessionId)
        store.setIsRunning(true)
        store.setTimeLeft(durSec)
        store.setModeDuration(durSec)
        store.setLastReward(null)

        save({
          sessionId: newSessionId,
          taskId,
          taskSelected: true,
          isRunning: true,
          endEpoch,
          mode: currentMode,
          modeDuration: durSec,
          pausedTimeLeft: 0,
          sessionCount: store.sessionCount,
        })

        this.startTick()
      } catch (err) {
        console.error('TimerService.start error:', err)
      }
    } finally {
      this.isStarting = false
    }
  }

  pause() {
    audioService.pause()
    const store = this.store
    const saved = load()

    this.stopTick()
    store.setIsRunning(false)

    // Сохраняем сколько осталось в момент паузы
    const remaining = saved.endEpoch
      ? Math.max(0, Math.round((saved.endEpoch - Date.now()) / 1000))
      : store.timeLeft

    store.setTimeLeft(remaining)
    save({ isRunning: false, endEpoch: 0, pausedTimeLeft: remaining })
  }

  async reset() {
    const store = this.store
    this.stopTick()
    store.setIsRunning(false)

    const saved = load()
    if (saved.sessionId) {
      try { await pomodoroApi.completeSession(saved.sessionId, 0) } catch { /* ignore */ }
    }

    store.setSessionId(null)
    store.setActiveSecondsToday(0)
    store.setLastReward(null)

    const durSec = this.getDur(store.mode) * 60
    store.setTimeLeft(durSec)
    store.setModeDuration(durSec)

    save({
      isRunning: false,
      sessionId: null,
      endEpoch: 0,
      pausedTimeLeft: durSec,
    })
  }

  changeMode(newMode: TimerMode, settings: any) {
    this.settings = settings
    const store = this.store
    const saved = load()

    // Запрещаем смену если есть активная сессия
    if (saved.isRunning || saved.sessionId) return

    const durSec = this.getDur(newMode) * 60
    store.setMode(newMode)
    store.setTimeLeft(durSec)
    store.setModeDuration(durSec)
    store.setActiveSecondsToday(0)

    save({
      mode: newMode,
      isRunning: false,
      sessionId: null,
      endEpoch: 0,
      pausedTimeLeft: durSec,
      modeDuration: durSec,
    })
  }

  async complete() {

    if (this.isCompleting) return
    this.isCompleting = true

    try {
      const store = useTimerStore.getState()
      const saved = load()
      const sid = saved.sessionId ?? store.sessionId
      const curMode = saved.mode ?? store.mode

      this.stopTick()
      store.setIsRunning(false)
      audioService.pause()
      store.setSessionId(null)
      save({
        sessionId: null,
        isRunning: false,
        endEpoch: 0,
      })

      playBeep(curMode === 'work' ? 'break' : 'work')

      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('LifeQuest', {
          body: curMode === 'work' ? '🎉 Сессия завершена! Время перерыва.' : '⏰ Перерыв закончился!',
          icon: '/favicon.ico',
        })
      }

      if (sid && curMode === 'work') {
        try {
          const durMin = this.getDur('work')
          
          const result = await pomodoroApi.completeSession(sid, durMin)
          store.setLastReward(result.reward)
          if (result.achievements?.length || result.levelUp) {
            console.log('LEVEL UP:', result.levelUp)
            console.log('ACHIEVEMENTS:', result.achievements)
            dispatchRewards(result.achievements, result.levelUp)
          }
          if (result.achievements && result.achievements.length > 0) {
            window.dispatchEvent(
              new CustomEvent('achievements', {
                detail: { achievements: result.achievements }
              })
            )
          }

          const newCount = (saved.sessionCount ?? store.sessionCount) + 1
          store.setSessionCount(newCount)
          this.loadUserFn?.()

          const statsData = await pomodoroApi.getTodayStats()
          store.setTodayStats(statsData.totalMinutes, statsData.sessionsCount, statsData.completedCycles)

          const cyclesBeforeLong = Math.max(2, this.settings?.cyclesBeforeLong || 4)

          const nextMode: TimerMode = newCount % cyclesBeforeLong === 0 ? 'longBreak': 'shortBreak'
          const nextDurSec = this.getDur(nextMode) * 60

          store.setMode(nextMode)
          store.setTimeLeft(nextDurSec)
          store.setModeDuration(nextDurSec)
          store.setIsFlipped(true)
          setTimeout(() => store.setIsFlipped(false), 900)

          // Автопереключение — читаем из localStorage напрямую
          const autoSwitch = this.getAutoSwitch()

          if (autoSwitch) {
            const endEpoch = Date.now() + 1200 + nextDurSec * 1000

            save({
              mode: nextMode,
              isRunning: true,
              sessionId: null,
              endEpoch,
              pausedTimeLeft: 0,
              modeDuration: nextDurSec,
              sessionCount: newCount,
            })

            setTimeout(() => {
              const s = useTimerStore.getState()
              s.setIsRunning(true)
              this.startTick()
            }, 1200)
          } else {
            save({
              mode: nextMode,
              isRunning: false,
              sessionId: null,
              endEpoch: 0,
              pausedTimeLeft: nextDurSec,
              modeDuration: nextDurSec,
              sessionCount: newCount,
            })
          }
        } catch (err) {
          console.error('TimerService.complete (work) error:', err)
        }
      } else {
        // Перерыв закончился → возвращаемся к фокусу
        const workDurSec = this.getDur('work') * 60
        store.setMode('work')
        store.setTimeLeft(workDurSec)
        store.setModeDuration(workDurSec)
        store.setIsFlipped(true)
        setTimeout(() => store.setIsFlipped(false), 900)

        save({
          mode: 'work',
          isRunning: false,
          sessionId: null,
          endEpoch: 0,
          pausedTimeLeft: workDurSec,
          modeDuration: workDurSec,
        })

        // Автопереключение break → work — запускаем новую рабочую сессию
        const autoSwitch = this.getAutoSwitch()
        if (autoSwitch && this.lastTaskId !== undefined) {
          setTimeout(async () => {
            // Создаём новую рабочую сессию с тем же taskId
            try {
              const durMin = this.getDur('work')
              const durSec = durMin * 60

              let newSessionId: number
              if (this.lastTaskId !== null) {
                const res = await pomodoroApi.startSession({ taskId: this.lastTaskId, plannedDuration: durMin } as any)
                newSessionId = res.session.id
              } else {
                const res = await pomodoroApi.startSession({ plannedDuration: durMin } as any)
                newSessionId = res.session.id
              }

              const endEpoch = Date.now() + durSec * 1000
              const s = useTimerStore.getState()
              s.setSessionId(newSessionId)
              s.setIsRunning(true)
              s.setTimeLeft(durSec)

              save({
                sessionId: newSessionId,
                taskId: this.lastTaskId,
                isRunning: true,
                endEpoch,
                pausedTimeLeft: 0,
                mode: 'work',
                modeDuration: durSec,
              })

              this.startTick()
            } catch (err) {
              console.error('Auto start work error:', err)
              // Если ошибка — просто показываем готовый таймер
            }
          }, 1200)
        }
      }
    } finally {
      this.isCompleting = false
    }
  }

  async finishEarly() {
    if (this.isFinishingEarly) return
    this.isFinishingEarly = true

    try {
      const store = useTimerStore.getState()
      const saved = load()

      const sid = saved.sessionId ?? store.sessionId

      if (!sid) return

      try {
        this.stopTick()
        audioService.pause()

        // Сколько минут реально прошло
        const elapsedSeconds =
          (saved.modeDuration || store.modeDuration) - store.timeLeft

        const actualMinutes = Math.floor(elapsedSeconds / 60)

        // Меньше минуты — просто сброс
        if (actualMinutes <= 0) {
          await this.reset()
          return
        }

        const result = await pomodoroApi.completeSession(
          sid,
          actualMinutes
        )

        store.setLastReward(result.reward)

        if (result.achievements?.length || result.levelUp) {
          dispatchRewards(result.achievements, result.levelUp)
        }

        if (result.achievements && result.achievements.length > 0) {
          window.dispatchEvent(
            new CustomEvent('achievements', {
              detail: { achievements: result.achievements }
            })
          )
        }

        this.loadUserFn?.()

        // Обновляем статистику
        const statsData = await pomodoroApi.getTodayStats()

        store.setTodayStats(
          statsData.totalMinutes,
          statsData.sessionsCount,
          statsData.completedCycles
        )

        // Полностью очищаем текущую сессию
        store.setSessionId(null)

        store.setIsRunning(false)
        store.setActiveSecondsToday(0)

        // Переводим в shortBreak
        const nextMode: TimerMode = 'shortBreak'
        const nextDurSec = this.getDur(nextMode) * 60

        store.setMode(nextMode)
        store.setTimeLeft(nextDurSec)
        store.setModeDuration(nextDurSec)

        save({
          mode: nextMode,
          isRunning: false,
          sessionId: null,
          endEpoch: 0,
          pausedTimeLeft: nextDurSec,
          modeDuration: nextDurSec,
          sessionCount: store.sessionCount + 1,
        })
      } catch (err) {
        console.error('finishEarly error:', err)
      }
    } finally {
      this.isFinishingEarly = false
    }
  }

  destroy() { this.stopTick() }

  
}

export const timerService = new TimerService()
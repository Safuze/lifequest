// Аудио сервис — синглтон, не привязан к компонентам
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

class AudioService {
  private audio: HTMLAudioElement | null = null
  private currentSound: string = 'none'
  private isPlaying: boolean = false

  play(soundId: string) {
    const src = SOUND_SOURCES[soundId]

    // Если тот же звук уже играет — ничего не делаем
    if (soundId === this.currentSound && this.isPlaying && this.audio) return

    // Останавливаем предыдущий
    this.stop()

    if (!src || soundId === 'none') {
      this.currentSound = soundId
      return
    }

    this.currentSound = soundId
    this.audio = new Audio(src)
    this.audio.loop = true
    this.audio.volume = Number(localStorage.getItem('lifequest_volume') || 0.5)
    this.isPlaying = true

    this.audio.play().catch(() => {
      // Автовоспроизведение заблокировано браузером — ок
      // Звук запустится при следующем пользовательском действии
    })
  }

  pause() {
    if (this.audio && this.isPlaying) {
      this.audio.pause()
      this.isPlaying = false
    }
  }

  resume() {
    if (this.audio && !this.isPlaying && this.currentSound !== 'none') {
      this.audio.play().catch(() => { /* ignore */ })
      this.isPlaying = true
    }
  }

  stop() {
    if (this.audio) {
      this.audio.pause()
      this.audio.currentTime = 0
      this.audio = null
    }
    this.isPlaying = false
  }

  changeSound(soundId: string, shouldPlay: boolean) {
    if (soundId === this.currentSound) {
      // Тот же звук — просто play/pause
      if (shouldPlay) this.resume()
      else this.pause()
      return
    }

    // Новый звук
    if (shouldPlay) {
      this.play(soundId)
    } else {
      this.stop()
      this.currentSound = soundId
    }
  }

  setVolume(volume: number) {
    localStorage.setItem('lifequest_volume', String(volume))

    if (this.audio) {
      this.audio.volume = volume
    }
  }

  

  getCurrentSound() { return this.currentSound }
  getIsPlaying() { return this.isPlaying }
}

export const audioService = new AudioService()
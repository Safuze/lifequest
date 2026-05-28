// Аудио сервис — синглтон, не привязан к компонентам
const SOUND_SOURCES: Record<string, string | null> = {
  none: null,
  sound_white: '/sounds/white.mp3',
  sound_lofi: '/sounds/lofi.mp3',
  sound_nature: '/sounds/nature.mp3',
  sound_waves: '/sounds/waves.mp3',
  sound_rain: '/sounds/rain.mp3',
  sound_fire: '/sounds/fire.mp3',
  sound_night: '/sounds/night.mp3',
}

class AudioService {
  private audio: HTMLAudioElement | null = null
  private currentSound: string = 'none'
  private isPlaying: boolean = false

  play(soundId: string) {
    console.log('PLAY CALLED', soundId)
    const src = SOUND_SOURCES[soundId]

    // Если тот же звук уже играет — ничего не делаем
    if (soundId === this.currentSound && this.isPlaying && this.audio) return

    // Останавливаем предыдущий
    this.stop()

    if (!src) {
      console.error('Sound source not found:', soundId)
      return
    }

    if (soundId === 'none') {
      this.stop()
      this.currentSound = 'none'
      return
    }

    this.currentSound = soundId
    this.audio = new Audio(src)
    this.audio.preload = 'auto'
    this.audio.loop = true
    this.audio.volume = Number(localStorage.getItem('lifequest_volume') || 0.5)
    this.isPlaying = true

    this.audio.play().catch((err) => {
      console.error('Audio play failed:', err)
    })
  }

  pause() {
    console.log('PAUSE CALLED')
    if (this.audio && this.isPlaying) {
      this.audio.pause()
      this.isPlaying = false
    }
  }

  resume() {
    console.log('RESUME CALLED')
    if (this.audio && !this.isPlaying && this.currentSound !== 'none') {
      this.audio.play().catch((err) => {
        console.error('Audio play failed:', err)
      })

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
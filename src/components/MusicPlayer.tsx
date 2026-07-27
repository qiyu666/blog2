import { useRef, useState, useEffect, useCallback } from 'react'

interface Song {
  title: string
  url: string
}

const LOOP_ICONS: Record<string, string> = { all: '🔁', one: '🔂', none: '➡️' }
const LOOP_LABELS: Record<string, string> = { all: '列表循环', one: '单曲循环', none: '顺序播放' }

function formatTime(sec: number): string {
  if (!sec || isNaN(sec)) return '0:00'
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s < 10 ? '0' + s : s}`
}

export default function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  if (audioRef.current === null) {
    audioRef.current = new Audio()
    audioRef.current.volume = 0.5
  }

  const [playlist, setPlaylist] = useState<Song[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.5)
  const [loopMode, setLoopMode] = useState<'all' | 'one' | 'none'>('all')
  const [showPlaylist, setShowPlaylist] = useState(false)
  const [visible, setVisible] = useState(false)

  // 用 ref 存储最新状态，避免事件处理函数闭包问题
  const stateRef = useRef({ playlist, currentIndex, loopMode })
  stateRef.current = { playlist, currentIndex, loopMode }

  const playIndex = useCallback((i: number) => {
    const audio = audioRef.current
    if (!audio) return
    const list = stateRef.current.playlist
    if (i < 0 || i >= list.length) return
    audio.src = list[i].url
    audio.play().catch(() => {})
    setCurrentIndex(i)
  }, [])

  const playNext = useCallback(() => {
    const { playlist: list, currentIndex: cur, loopMode: loop } = stateRef.current
    if (loop === 'one') {
      const audio = audioRef.current
      if (audio) {
        audio.currentTime = 0
        audio.play().catch(() => {})
      }
      return
    }
    let next = cur + 1
    if (next >= list.length) {
      if (loop === 'all') next = 0
      else return
    }
    playIndex(next)
  }, [playIndex])

  const playPrev = useCallback(() => {
    const { playlist: list, currentIndex: cur, loopMode: loop } = stateRef.current
    if (loop === 'one') {
      const audio = audioRef.current
      if (audio) {
        audio.currentTime = 0
        audio.play().catch(() => {})
      }
      return
    }
    let prev = cur - 1
    if (prev < 0) prev = list.length - 1
    playIndex(prev)
  }, [playIndex])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) {
      if (!audio.src) {
        const list = stateRef.current.playlist
        if (list.length > 0) {
          audio.src = list[0].url
          audio.play().catch(() => {})
        }
      } else {
        audio.play().catch(() => {})
      }
    } else {
      audio.pause()
    }
  }, [])

  // 初始化 Audio 事件监听（只绑定一次）
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onLoadedMetadata = () => setDuration(audio.duration)
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)
    const onEnded = () => playNext()

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.removeEventListener('ended', onEnded)
    }
  }, [playNext])

  // 监听全局事件：设置播放列表
  useEffect(() => {
    const handleSetPlaylist = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (!detail?.playlist || !Array.isArray(detail.playlist)) return

      const newPlaylist = detail.playlist as Song[]
      const currentList = stateRef.current.playlist

      // 如果播放列表相同，只显示播放器，不重置
      const same = newPlaylist.length === currentList.length &&
        newPlaylist.every((s, i) => s.url === currentList[i]?.url)

      if (same) {
        setVisible(true)
        return
      }

      setPlaylist(newPlaylist)
      setCurrentIndex(0)
      setVisible(true)
      const audio = audioRef.current
      if (audio && newPlaylist.length > 0) {
        audio.src = newPlaylist[0].url
        // 不自动播放，等用户点击
      }
    }

    window.addEventListener('music:set-playlist', handleSetPlaylist as EventListener)
    return () => window.removeEventListener('music:set-playlist', handleSetPlaylist as EventListener)
  }, [])

  const handleVolumeChange = (v: number) => {
    setVolume(v)
    if (audioRef.current) audioRef.current.volume = v
  }

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current
    if (!audio || !duration) return
    const rect = e.currentTarget.getBoundingClientRect()
    const pct = (e.clientX - rect.left) / rect.width
    audio.currentTime = pct * duration
  }

  const toggleLoop = () => {
    setLoopMode(prev => (prev === 'all' ? 'one' : prev === 'one' ? 'none' : 'all'))
  }

  if (!visible) return null

  const currentSong = playlist[currentIndex]
  const progressPct = duration ? (currentTime / duration) * 100 : 0

  return (
    <div className="mp-container">
      <div className="mp-main">
        <div className="mp-cover">
          <div className={`mp-cover-disc ${isPlaying ? 'playing' : ''}`}>
            <div className="mp-cover-inner">♪</div>
          </div>
        </div>
        <div className="mp-info">
          <div className="mp-title">{currentSong?.title || '未播放'}</div>
          <div className="mp-progress">
            <div className="mp-progress-bar" onClick={handleProgressClick}>
              <div className="mp-progress-fill" style={{ width: `${progressPct}%` }} />
              <div className="mp-progress-dot" style={{ left: `${progressPct}%` }} />
            </div>
            <div className="mp-time">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        </div>
        <div className="mp-controls">
          <button className="mp-btn" onClick={playPrev} title="上一首">⏮</button>
          <button className="mp-btn mp-play" onClick={togglePlay} title="播放/暂停">
            {isPlaying ? '⏸' : '▶'}
          </button>
          <button className="mp-btn" onClick={playNext} title="下一首">⏭</button>
        </div>
        <div className="mp-actions">
          <button className="mp-btn" onClick={toggleLoop} title={LOOP_LABELS[loopMode]}>
            {LOOP_ICONS[loopMode]}
          </button>
          <button className="mp-btn" onClick={() => setShowPlaylist(!showPlaylist)} title="播放列表">☰</button>
          <div className="mp-volume">
            <button className="mp-btn" title="音量">
              {volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊'}
            </button>
            <div className="mp-volume-slider">
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(volume * 100)}
                onChange={(e) => handleVolumeChange(Number(e.target.value) / 100)}
              />
            </div>
          </div>
        </div>
      </div>
      {showPlaylist && (
        <div className="mp-playlist">
          <div className="mp-playlist-header">
            <span>播放列表</span>
            <span className="mp-playlist-count">{playlist.length} 首</span>
          </div>
          <div className="mp-playlist-items">
            {playlist.map((song, i) => (
              <div
                key={i}
                className={`mp-playlist-item ${i === currentIndex ? 'active' : ''}`}
                onClick={() => playIndex(i)}
              >
                <span className="mp-playlist-item-index">{i + 1}</span>
                <span className="mp-playlist-item-title">{song.title}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

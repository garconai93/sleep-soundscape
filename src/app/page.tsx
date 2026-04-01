'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Sound {
  id: string;
  name: string;
  icon: string;
  audioUrl: string;
  color: string;
  gradient: string;
}

interface Preset {
  id: string;
  name: string;
  icon: string;
  volumes: Record<string, number>;
}

const SOUNDS: Sound[] = [
  { id: 'rain', name: 'Rain', icon: '🌧️', audioUrl: 'https://assets.mixkit.co/active_storage/sfx/2393/2393-preview.mp3', color: '#6366f1', gradient: 'from-indigo-500/20 to-blue-500/20' },
  { id: 'thunder', name: 'Thunder', icon: '⛈️', audioUrl: 'https://assets.mixkit.co/active_storage/sfx/1287/1287-preview.mp3', color: '#8b5cf6', gradient: 'from-violet-500/20 to-purple-500/20' },
  { id: 'train', name: 'Train', icon: '🚂', audioUrl: 'https://assets.mixkit.co/active_storage/sfx/1630/1630-preview.mp3', color: '#3b82f6', gradient: 'from-blue-500/20 to-cyan-500/20' },
  { id: 'cafe', name: 'Cafe', icon: '☕', audioUrl: 'https://assets.mixkit.co/active_storage/sfx/444/444-preview.mp3', color: '#f59e0b', gradient: 'from-amber-500/20 to-orange-500/20' },
  { id: 'fire', name: 'Fire', icon: '🔥', audioUrl: 'https://assets.mixkit.co/active_storage/sfx/1345/1345-preview.mp3', color: '#ef4444', gradient: 'from-red-500/20 to-orange-500/20' },
  { id: 'wind', name: 'Wind', icon: '💨', audioUrl: 'https://assets.mixkit.co/active_storage/sfx/2608/2608-preview.mp3', color: '#06b6d4', gradient: 'from-cyan-500/20 to-teal-500/20' },
];

const DEFAULT_PRESETS: Preset[] = [
  { id: 'sleep', name: 'Sleep', icon: '🌙', volumes: { rain: 70, thunder: 30, train: 0, cafe: 0, fire: 20, wind: 40 } },
  { id: 'focus', name: 'Focus', icon: '🎯', volumes: { rain: 50, thunder: 0, train: 60, cafe: 40, fire: 0, wind: 20 } },
  { id: 'relax', name: 'Relax', icon: '🧘', volumes: { rain: 30, thunder: 0, train: 0, cafe: 50, fire: 60, wind: 30 } },
];

type TimerOption = number | null;

export default function SleepSoundscape() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [volumes, setVolumes] = useState<Record<string, number>>({
    rain: 0, thunder: 0, train: 0, cafe: 0, fire: 0, wind: 0
  });
  const [activeLayers, setActiveLayers] = useState<Set<string>>(new Set());
  const [timer, setTimer] = useState<TimerOption>(null);
  const [timerRemaining, setTimerRemaining] = useState<number>(0);
  const [timerOpen, setTimerOpen] = useState(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [masterVolume, setMasterVolume] = useState(70);
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const initialized = useRef(false);

  // Initialize audio elements
  useEffect(() => {
    if (typeof window === 'undefined' || initialized.current) return;
    initialized.current = true;

    SOUNDS.forEach(sound => {
      const audio = new Audio();
      audio.src = sound.audioUrl;
      audio.loop = true;
      audio.preload = 'auto';
      audio.volume = (volumes[sound.id] || 0) / 100 * masterVolume / 100;
      audioRefs.current[sound.id] = audio;
    });

    return () => {
      Object.values(audioRefs.current).forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    };
  }, []);

  // Update volumes when they change
  useEffect(() => {
    Object.entries(audioRefs.current).forEach(([id, audio]) => {
      audio.volume = (volumes[id] || 0) / 100 * masterVolume / 100;
    });
  }, [volumes, masterVolume]);

  // Handle play/pause
  const togglePlay = useCallback(async () => {
    if (isPlaying) {
      Object.values(audioRefs.current).forEach(audio => audio.pause());
      setIsPlaying(false);
    } else {
      // Resume audio context if needed (browser autoplay policy)
      try {
        const audios = Object.values(audioRefs.current);
        await Promise.all(audios.map(audio => {
          if (activeLayers.has(Object.keys(audioRefs.current).find(key => audioRefs.current[key] === audio) || '')) {
            return audio.play().catch(() => {});
          }
          return Promise.resolve();
        }));
        
        // Start playing active layers
        activeLayers.forEach(id => {
          if (audioRefs.current[id]) {
            audioRefs.current[id].volume = (volumes[id] || 0) / 100 * masterVolume / 100;
            audioRefs.current[id].play().catch(console.error);
          }
        });
        setIsPlaying(true);
      } catch (e) {
        console.error('Playback error:', e);
      }
    }
  }, [isPlaying, activeLayers, volumes, masterVolume]);

  // Update volume for a sound
  const updateVolume = useCallback((soundId: string, value: number) => {
    setVolumes(prev => ({ ...prev, [soundId]: value }));
    setActivePreset(null);

    if (audioRefs.current[soundId]) {
      audioRefs.current[soundId].volume = value / 100 * masterVolume / 100;
    }

    // Auto-add layer when volume > 0
    if (value > 0) {
      setActiveLayers(prev => {
        if (!prev.has(soundId)) {
          const newSet = new Set(prev);
          newSet.add(soundId);
          if (isPlaying && audioRefs.current[soundId]) {
            audioRefs.current[soundId].play().catch(console.error);
          }
          return newSet;
        }
        return prev;
      });
    }
  }, [masterVolume, isPlaying]);

  // Toggle layer
  const toggleLayer = useCallback((soundId: string) => {
    setActiveLayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(soundId)) {
        newSet.delete(soundId);
        if (isPlaying && audioRefs.current[soundId]) {
          audioRefs.current[soundId].pause();
        }
      } else {
        newSet.add(soundId);
        if (isPlaying && audioRefs.current[soundId]) {
          audioRefs.current[soundId].volume = (volumes[soundId] || 0) / 100 * masterVolume / 100;
          audioRefs.current[soundId].play().catch(console.error);
        }
      }
      return newSet;
    });
    setActivePreset(null);
  }, [isPlaying, volumes, masterVolume]);

  // Apply preset
  const applyPreset = useCallback((preset: Preset) => {
    setVolumes(preset.volumes);
    setActivePreset(preset.id);

    // Update audio volumes and start playing active layers
    Object.entries(preset.volumes).forEach(([id, vol]) => {
      if (audioRefs.current[id]) {
        audioRefs.current[id].volume = vol / 100 * masterVolume / 100;
      }
    });

    // Set active layers based on non-zero volumes and play them if already playing
    const newLayers = new Set<string>();
    Object.entries(preset.volumes).forEach(([id, vol]) => {
      if (vol > 0) {
        newLayers.add(id);
        if (isPlaying && audioRefs.current[id]) {
          audioRefs.current[id].play().catch(console.error);
        }
      }
    });
    setActiveLayers(newLayers);
  }, [masterVolume, isPlaying]);

  // Timer functions
  const startTimer = useCallback((minutes: number) => {
    setTimer(minutes);
    setTimerRemaining(minutes * 60);
    setTimerOpen(false);

    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      setTimerRemaining(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          Object.values(audioRefs.current).forEach(audio => audio.pause());
          setIsPlaying(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const cancelTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimer(null);
    setTimerRemaining(0);
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const timerOptions: { value: TimerOption; label: string }[] = [
    { value: 15, label: '15 min' },
    { value: 30, label: '30 min' },
    { value: 60, label: '1 hour' },
    { value: 120, label: '2 hours' },
  ];

  const activeSounds = SOUNDS.filter(s => activeLayers.has(s.id));

  return (
    <div className="min-h-screen bg-slate-950 text-white relative overflow-hidden font-sans">
      {/* Aurora Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-violet-600/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-cyan-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-0 right-1/3 w-64 h-64 bg-pink-600/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }}></div>
      </div>

      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-slate-950/50 to-slate-950 pointer-events-none"></div>

      {/* Content */}
      <div className="relative z-10">
        {/* Header */}
        <header className="p-6 pt-10 text-center animate-fade-in">
          <h1 className="text-4xl font-bold tracking-tight mb-2">
            <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-pink-400 bg-clip-text text-transparent">
              Sleep
            </span>
            <span className="bg-gradient-to-r from-pink-400 via-amber-400 to-orange-400 bg-clip-text text-transparent">
              Soundscape
            </span>
          </h1>
          <p className="text-slate-400 text-sm">Create your perfect ambient mix for sleep, focus & relaxation</p>
        </header>

        {/* Main Content */}
        <main className="max-w-2xl mx-auto px-4 pb-40">
          {/* Presets */}
          <section className="mb-8">
            <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-4 font-medium">Quick Presets</h2>
            <div className="grid grid-cols-3 gap-3">
              {DEFAULT_PRESETS.map((preset, i) => (
                <button
                  key={preset.id}
                  onClick={() => applyPreset(preset)}
                  className={`
                    relative overflow-hidden p-5 rounded-2xl border backdrop-blur-xl transition-all duration-300
                    transform hover:scale-105 hover:-translate-y-1
                    ${activePreset === preset.id
                      ? 'bg-gradient-to-br from-indigo-600/40 to-violet-600/40 border-indigo-500/50 shadow-lg shadow-indigo-500/20'
                      : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'
                    }
                  `}
                >
                  <div className={`text-3xl mb-2 ${activePreset === preset.id ? 'animate-bounce' : ''}`}>{preset.icon}</div>
                  <div className={`text-sm font-semibold ${activePreset === preset.id ? 'text-indigo-200' : 'text-slate-300'}`}>{preset.name}</div>
                </button>
              ))}
            </div>
          </section>

          {/* Wave Visualizer (when playing) */}
          {isPlaying && activeLayers.size > 0 && (
            <section className="mb-6 flex justify-center gap-1 items-end h-12">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="w-1.5 rounded-full animate-pulse"
                  style={{
                    height: `${20 + Math.random() * 60}%`,
                    animationDelay: `${i * 50}ms`,
                    backgroundColor: activeSounds[i % Math.max(activeSounds.length, 1)]?.color || '#6366f1'
                  }}
                />
              ))}
            </section>
          )}

          {/* Sound Layers */}
          <section className="mb-8">
            <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-4 font-medium">Sound Layers</h2>
            <div className="space-y-3">
              {SOUNDS.map((sound, i) => {
                const isActive = activeLayers.has(sound.id);
                return (
                  <div
                    key={sound.id}
                    className={`
                      relative overflow-hidden rounded-2xl border backdrop-blur-xl transition-all duration-300
                      ${isActive
                        ? 'bg-gradient-to-br ' + sound.gradient + ' border-white/20 shadow-lg'
                        : 'bg-white/5 border-white/10 hover:bg-white/[0.08]'
                      }
                    `}
                  >
                    <div className="p-4 flex items-center gap-4">
                      {/* Toggle Button */}
                      <button
                        onClick={() => toggleLayer(sound.id)}
                        className={`
                          relative w-14 h-14 rounded-xl flex items-center justify-center text-2xl
                          transition-all duration-300 transform hover:scale-110
                          ${isActive ? 'shadow-lg' : 'bg-white/10 hover:bg-white/20'}
                        `}
                        style={{
                          backgroundColor: isActive ? sound.color : undefined,
                          boxShadow: isActive ? `0 0 30px ${sound.color}40` : undefined,
                        }}
                      >
                        <span className={isActive ? 'animate-pulse' : ''}>{sound.icon}</span>
                      </button>
                      
                      {/* Info */}
                      <div className="flex-1">
                        <div className="font-semibold text-white/90">{sound.name}</div>
                        <div className="text-xs" style={{ color: isActive ? sound.color : '#64748b' }}>
                          {isActive ? '● Playing' : 'Tap to add'}
                        </div>
                      </div>

                      {/* Volume Slider */}
                      <div className="flex items-center gap-3 w-36">
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={volumes[sound.id] || 0}
                          onChange={(e) => updateVolume(sound.id, parseInt(e.target.value))}
                          className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer"
                          style={{
                            background: `linear-gradient(to right, ${sound.color} ${volumes[sound.id] || 0}%, #334155 ${volumes[sound.id] || 0}%)`
                          }}
                        />
                        <span className="text-xs w-8 text-right font-mono" style={{ color: isActive ? sound.color : '#64748b' }}>
                          {volumes[sound.id] || 0}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Active Mix Summary */}
          {activeSounds.length > 0 && (
            <section className="mb-8 p-5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-indigo-400">🎛️</span>
                <span className="text-sm font-semibold text-white/80">Active Mix</span>
                <span className="ml-auto text-xs px-2 py-1 rounded-full bg-indigo-500/20 text-indigo-300">{activeSounds.length} layer{activeSounds.length > 1 ? 's' : ''}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeSounds.map(s => (
                  <span 
                    key={s.id} 
                    className="px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-xl flex items-center gap-1.5"
                    style={{ 
                      backgroundColor: `${s.color}20`, 
                      color: s.color,
                      border: `1px solid ${s.color}30`
                    }}
                  >
                    <span className="text-sm">{s.icon}</span>
                    {s.name}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Premium CTA */}
          <section className="mb-8 p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 backdrop-blur-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center text-2xl">
                ⭐
              </div>
              <div className="flex-1">
                <div className="font-bold text-amber-200">Unlock All Features</div>
                <div className="text-xs text-amber-300/60 mt-0.5">
                  3 layers free • €4/month for unlimited + cloud sync
                </div>
              </div>
              <button className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 text-amber-950 font-semibold text-sm hover:opacity-90 transition-opacity">
                Upgrade
              </button>
            </div>
          </section>
        </main>

        {/* Bottom Controls */}
        <div className="fixed bottom-0 left-0 right-0 bg-slate-950/80 backdrop-blur-2xl border-t border-white/10 p-4 z-50">
          <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
            {/* Timer */}
            <div className="relative">
              <button
                onClick={() => setTimerOpen(!timerOpen)}
                className={`
                  flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all backdrop-blur-xl
                  ${timer 
                    ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' 
                    : 'bg-white/5 text-slate-400 border border-white/10 hover:bg-white/10'
                  }
                `}
              >
                <span>⏰</span>
                <span className="text-sm font-medium">
                  {timer ? formatTime(timerRemaining) : 'Timer'}
                </span>
              </button>
              
              {timerOpen && (
                <div className="absolute bottom-full mb-2 left-0 bg-slate-900/95 backdrop-blur-2xl rounded-xl border border-white/10 p-2 shadow-2xl min-w-40">
                  {timerOptions.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => startTimer(opt.value!)}
                      className="block w-full text-left px-4 py-2.5 text-sm rounded-lg hover:bg-white/10 text-slate-300 transition-colors"
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              {timer && (
                <button
                  onClick={cancelTimer}
                  className="ml-2 px-2 py-2 text-xs text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Play Button */}
            <button
              onClick={togglePlay}
              disabled={activeLayers.size === 0}
              className={`
                relative w-16 h-16 rounded-full flex items-center justify-center text-2xl
                transition-all duration-300 transform
                ${activeLayers.size === 0
                  ? 'bg-slate-800 text-slate-600 cursor-not-allowed'
                  : isPlaying
                    ? 'bg-gradient-to-br from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-2xl shadow-indigo-500/40 scale-105'
                    : 'bg-gradient-to-br from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 shadow-2xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:scale-110'
                }
              `}
            >
              {activeLayers.size === 0 ? '🔇' : isPlaying ? '⏸️' : '▶️'}
              {activeLayers.size > 0 && !isPlaying && (
                <div className="absolute inset-0 rounded-full animate-ping opacity-20 bg-indigo-400" />
              )}
            </button>

            {/* Volume */}
            <div className="flex items-center gap-2 bg-white/5 px-3 py-2 rounded-xl border border-white/10">
              <span className="text-slate-400">🔊</span>
              <div className="w-24">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={masterVolume}
                  className="w-full h-1 rounded-full appearance-none cursor-pointer"
                  style={{ background: `linear-gradient(to right, #818cf8 ${masterVolume}%, #334155 ${masterVolume}%)` }}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    setMasterVolume(val);
                    e.target.style.background = `linear-gradient(to right, #818cf8 ${val}%, #334155 ${val}%)`;
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
        }
        
        input[type="range"]::-moz-range-thumb {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: white;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
          border: none;
        }
      `}</style>
    </div>
  );
}

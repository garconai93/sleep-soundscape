'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface Sound {
  id: string;
  name: string;
  icon: string;
  audioUrl: string;
  color: string;
}

interface Preset {
  id: string;
  name: string;
  icon: string;
  volumes: Record<string, number>;
}

const SOUNDS: Sound[] = [
  { id: 'rain', name: 'Rain', icon: '🌧️', audioUrl: 'https://assets.mixkit.co/active_storage/sfx/2393/2393-preview.mp3', color: '#6366f1' },
  { id: 'thunder', name: 'Thunder', icon: '⛈️', audioUrl: 'https://assets.mixkit.co/active_storage/sfx/1287/1287-preview.mp3', color: '#8b5cf6' },
  { id: 'train', name: 'Train', icon: '🚂', audioUrl: 'https://assets.mixkit.co/active_storage/sfx/1630/1630-preview.mp3', color: '#3b82f6' },
  { id: 'cafe', name: 'Cafe', icon: '☕', audioUrl: 'https://assets.mixkit.co/active_storage/sfx/444/444-preview.mp3', color: '#f59e0b' },
  { id: 'fire', name: 'Fire', icon: '🔥', audioUrl: 'https://assets.mixkit.co/active_storage/sfx/1345/1345-preview.mp3', color: '#ef4444' },
  { id: 'wind', name: 'Wind', icon: '💨', audioUrl: 'https://assets.mixkit.co/active_storage/sfx/2608/2608-preview.mp3', color: '#06b6d4' },
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
  const audioRefs = useRef<Record<string, HTMLAudioElement>>({});
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodesRef = useRef<Record<string, GainNode>>({});
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize audio elements
  useEffect(() => {
    if (typeof window === 'undefined') return;

    SOUNDS.forEach(sound => {
      const audio = new Audio();
      audio.src = sound.audioUrl;
      audio.loop = true;
      audio.preload = 'auto';
      audio.crossOrigin = 'anonymous';
      audioRefs.current[sound.id] = audio;
    });

    return () => {
      Object.values(audioRefs.current).forEach(audio => {
        audio.pause();
        audio.src = '';
      });
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Setup Web Audio API for volume control
  const setupAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    SOUNDS.forEach(sound => {
      if (!gainNodesRef.current[sound.id]) {
        const audio = audioRefs.current[sound.id];
        const source = audioContextRef.current!.createMediaElementSource(audio);
        const gainNode = audioContextRef.current!.createGain();
        source.connect(gainNode);
        gainNode.connect(audioContextRef.current!.destination);
        gainNode.gain.value = volumes[sound.id] / 100;
        gainNodesRef.current[sound.id] = gainNode;
      }
    });
  }, [volumes]);

  // Handle play/pause
  const togglePlay = useCallback(async () => {
    if (isPlaying) {
      Object.values(audioRefs.current).forEach(audio => audio.pause());
      setIsPlaying(false);
    } else {
      try {
        setupAudioContext();
        if (audioContextRef.current?.state === 'suspended') {
          await audioContextRef.current.resume();
        }
        activeLayers.forEach(id => {
          audioRefs.current[id].volume = (volumes[id] || 0) / 100;
          audioRefs.current[id].play().catch(console.error);
        });
        setIsPlaying(true);
      } catch (e) {
        console.error('Playback error:', e);
      }
    }
  }, [isPlaying, activeLayers, volumes, setupAudioContext]);

  // Update volume
  const updateVolume = useCallback((soundId: string, value: number) => {
    const newVolumes = { ...volumes, [soundId]: value };
    setVolumes(newVolumes);
    setActivePreset(null);

    if (gainNodesRef.current[soundId]) {
      gainNodesRef.current[soundId].gain.value = value / 100;
    }

    if (audioRefs.current[soundId]) {
      audioRefs.current[soundId].volume = value / 100;
    }

    // Auto-add layer when volume is adjusted above 0
    if (value > 0) {
      setActiveLayers(prev => {
        if (!prev.has(soundId)) {
          const newSet = new Set(prev);
          newSet.add(soundId);
          if (isPlaying) {
            audioRefs.current[soundId].volume = value / 100;
            audioRefs.current[soundId]?.play().catch(console.error);
          }
          return newSet;
        }
        return prev;
      });
    }
  }, [volumes, isPlaying]);

  // Toggle layer
  const toggleLayer = useCallback((soundId: string) => {
    setActiveLayers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(soundId)) {
        newSet.delete(soundId);
        if (isPlaying) audioRefs.current[soundId]?.pause();
      } else {
        if (isPlaying) {
          audioRefs.current[soundId].volume = (volumes[soundId] || 0) / 100;
          audioRefs.current[soundId]?.play().catch(console.error);
        }
        newSet.add(soundId);
      }
      return newSet;
    });
    setActivePreset(null);
  }, [isPlaying, volumes]);

  // Apply preset
  const applyPreset = useCallback((preset: Preset) => {
    setVolumes(preset.volumes);
    setActivePreset(preset.id);
    
    // Update gain nodes
    Object.entries(preset.volumes).forEach(([id, vol]) => {
      if (gainNodesRef.current[id]) {
        gainNodesRef.current[id].gain.value = vol / 100;
      }
      if (audioRefs.current[id]) {
        audioRefs.current[id].volume = vol / 100;
      }
    });

    // Set active layers based on non-zero volumes
    const newLayers = new Set<string>();
    Object.entries(preset.volumes).forEach(([id, vol]) => {
      if (vol > 0) newLayers.add(id);
    });
    setActiveLayers(newLayers);
  }, []);

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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-white">
      {/* Header */}
      <header className="p-6 text-center">
        <h1 className="text-3xl font-light tracking-wide mb-2">
          <span className="text-indigo-400">Sleep</span>Soundscape
        </h1>
        <p className="text-slate-400 text-sm">Create your perfect ambient mix</p>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 pb-32">
        {/* Presets */}
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-3">Quick Presets</h2>
          <div className="grid grid-cols-3 gap-3">
            {DEFAULT_PRESETS.map(preset => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset)}
                className={`p-4 rounded-2xl border transition-all ${
                  activePreset === preset.id
                    ? 'bg-indigo-600/30 border-indigo-500'
                    : 'bg-slate-800/50 border-slate-700/50 hover:border-slate-600'
                }`}
              >
                <div className="text-2xl mb-1">{preset.icon}</div>
                <div className="text-sm font-medium">{preset.name}</div>
              </button>
            ))}
          </div>
        </section>

        {/* Sound Layers */}
        <section className="mb-8">
          <h2 className="text-xs uppercase tracking-widest text-slate-500 mb-3">Sound Layers</h2>
          <div className="space-y-3">
            {SOUNDS.map(sound => {
              const isActive = activeLayers.has(sound.id);
              return (
                <div
                  key={sound.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    isActive 
                      ? 'bg-slate-800/70 border-indigo-500/50' 
                      : 'bg-slate-800/30 border-slate-700/30'
                  }`}
                >
                  <div className="flex items-center gap-4">
                    {/* Toggle */}
                    <button
                      onClick={() => toggleLayer(sound.id)}
                      className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl transition-all ${
                        isActive 
                          ? 'bg-indigo-600 shadow-lg shadow-indigo-500/30' 
                          : 'bg-slate-700'
                      }`}
                      style={{ backgroundColor: isActive ? sound.color : undefined }}
                    >
                      {sound.icon}
                    </button>
                    
                    {/* Info */}
                    <div className="flex-1">
                      <div className="font-medium">{sound.name}</div>
                      <div className="text-xs text-slate-400">
                        {isActive ? 'Active' : 'Tap to add'}
                      </div>
                    </div>

                    {/* Volume Slider */}
                    <div className="flex items-center gap-2 w-32">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={volumes[sound.id] || 0}
                        onChange={(e) => updateVolume(sound.id, parseInt(e.target.value))}
                        className="w-full h-1 accent-indigo-500"
                        style={{ accentColor: sound.color }}
                      />
                      <span className="text-xs text-slate-400 w-8 text-right">
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
          <section className="mb-8 p-4 rounded-2xl bg-slate-800/30 border border-slate-700/30">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-indigo-400">🎛️</span>
              <span className="text-sm text-slate-300">Active Mix</span>
              <span className="ml-auto text-xs text-slate-500">{activeSounds.length} layer{activeSounds.length > 1 ? 's' : ''}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeSounds.map(s => (
                <span 
                  key={s.id} 
                  className="px-3 py-1 rounded-full text-xs flex items-center gap-1"
                  style={{ backgroundColor: `${s.color}20`, color: s.color }}
                >
                  {s.icon} {s.name}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Freemium Badge */}
        <section className="mb-8 p-4 rounded-2xl bg-gradient-to-r from-amber-900/20 to-orange-900/20 border border-amber-700/30">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⭐</span>
            <div>
              <div className="font-medium text-amber-200">Unlock All Features</div>
              <div className="text-xs text-amber-300/60">
                3 layers free • €4/month for unlimited + cloud sync
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Bottom Controls */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 p-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
          {/* Timer */}
          <div className="relative">
            <button
              onClick={() => setTimerOpen(!timerOpen)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all ${
                timer ? 'bg-indigo-600/30 text-indigo-300' : 'bg-slate-800 text-slate-400'
              }`}
            >
              <span>⏰</span>
              <span className="text-sm">
                {timer ? formatTime(timerRemaining) : 'Timer'}
              </span>
            </button>
            
            {timerOpen && (
              <div className="absolute bottom-full mb-2 left-0 bg-slate-800 rounded-xl border border-slate-700 p-2 shadow-xl min-w-36">
                {timerOptions.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => startTimer(opt.value!)}
                    className="block w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-slate-700"
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {timer && (
              <button
                onClick={cancelTimer}
                className="ml-2 px-2 py-2 text-xs text-red-400 hover:bg-red-500/20 rounded-lg"
              >
                ✕
              </button>
            )}
          </div>

          {/* Play Button */}
          <button
            onClick={togglePlay}
            disabled={activeLayers.size === 0}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl transition-all shadow-lg ${
              activeLayers.size === 0
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                : isPlaying
                  ? 'bg-indigo-600 hover:bg-indigo-500'
                  : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/30'
            }`}
          >
            {activeLayers.size === 0 ? '🔇' : isPlaying ? '⏸️' : '▶️'}
          </button>

          {/* Volume */}
          <div className="flex items-center gap-2">
            <span className="text-slate-400">🔊</span>
            <div className="w-20">
              <input
                type="range"
                min="0"
                max="100"
                defaultValue={70}
                className="w-full h-1 accent-white"
                onChange={(e) => {
                  const val = parseInt(e.target.value) / 100;
                  Object.values(audioRefs.current).forEach(audio => {
                    audio.volume = val;
                  });
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

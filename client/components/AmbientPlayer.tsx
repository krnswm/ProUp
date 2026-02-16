import { useState, useRef, useEffect, useCallback } from "react";
import { Volume2, VolumeX, Music, ChevronUp, Radio, Headphones, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Procedural ambient sounds ──────────────────────────────────

interface SoundConfig {
  id: string;
  label: string;
  emoji: string;
  frequency: number;
  type: OscillatorType;
  lfoFreq: number;
  lfoDepth: number;
  noiseLevel: number;
  filterFreq: number;
}

const SOUNDS: SoundConfig[] = [
  { id: "rain", label: "Rain", emoji: "🌧️", frequency: 0, type: "sine", lfoFreq: 0.3, lfoDepth: 0, noiseLevel: 0.35, filterFreq: 3000 },
  { id: "cafe", label: "Café", emoji: "☕", frequency: 0, type: "sine", lfoFreq: 0.1, lfoDepth: 0, noiseLevel: 0.2, filterFreq: 2000 },
  { id: "lofi", label: "Lo-fi", emoji: "🎵", frequency: 220, type: "sine", lfoFreq: 0.5, lfoDepth: 15, noiseLevel: 0.05, filterFreq: 800 },
  { id: "forest", label: "Forest", emoji: "🌲", frequency: 0, type: "sine", lfoFreq: 0.2, lfoDepth: 0, noiseLevel: 0.25, filterFreq: 4000 },
  { id: "fireplace", label: "Fire", emoji: "🔥", frequency: 0, type: "sine", lfoFreq: 2, lfoDepth: 0, noiseLevel: 0.3, filterFreq: 1500 },
  { id: "waves", label: "Waves", emoji: "🌊", frequency: 0, type: "sine", lfoFreq: 0.08, lfoDepth: 0, noiseLevel: 0.3, filterFreq: 2500 },
];

function createAmbientSound(ctx: AudioContext, config: SoundConfig, masterGain: GainNode) {
  const nodes: AudioNode[] = [];

  if (config.noiseLevel > 0) {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;

    const noiseGain = ctx.createGain();
    noiseGain.gain.value = config.noiseLevel;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = config.filterFreq;
    filter.Q.value = 1;

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.frequency.value = config.lfoFreq;
    lfoGain.gain.value = config.filterFreq * 0.3;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(masterGain);
    noise.start();

    nodes.push(noise, lfo);
  }

  if (config.frequency > 0) {
    const osc = ctx.createOscillator();
    osc.type = config.type;
    osc.frequency.value = config.frequency;

    const oscGain = ctx.createGain();
    oscGain.gain.value = 0.08;

    const vibrato = ctx.createOscillator();
    const vibratoGain = ctx.createGain();
    vibrato.frequency.value = config.lfoFreq;
    vibratoGain.gain.value = config.lfoDepth;
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);
    vibrato.start();

    const warmFilter = ctx.createBiquadFilter();
    warmFilter.type = "lowpass";
    warmFilter.frequency.value = config.filterFreq;
    warmFilter.Q.value = 2;

    osc.connect(warmFilter);
    warmFilter.connect(oscGain);
    oscGain.connect(masterGain);
    osc.start();

    const osc2 = ctx.createOscillator();
    osc2.type = "triangle";
    osc2.frequency.value = config.frequency * 1.5;
    const osc2Gain = ctx.createGain();
    osc2Gain.gain.value = 0.04;
    osc2.connect(warmFilter);
    warmFilter.connect(osc2Gain);
    osc2Gain.connect(masterGain);
    osc2.start();

    nodes.push(osc, vibrato, osc2);
  }

  return {
    stop: () => {
      for (const n of nodes) {
        try { (n as any).stop?.(); } catch { /* ignore */ }
        try { n.disconnect(); } catch { /* ignore */ }
      }
    },
  };
}

// ── Free-to-use music radio streams ────────────────────────────

interface RadioStation {
  id: string;
  label: string;
  emoji: string;
  genre: string;
  url: string;
  color: string;
}

const RADIO_STATIONS: RadioStation[] = [
  {
    id: "lofi-girl",
    label: "Lofi Hip Hop",
    emoji: "🎧",
    genre: "Lo-fi",
    url: "https://play.streamafrica.net/lofiradio",
    color: "#a855f7",
  },
  {
    id: "chillhop",
    label: "Chillhop",
    emoji: "🍃",
    genre: "Chill",
    url: "https://streams.fluxfm.de/Chillhop/mp3-128/streams.fluxfm.de/",
    color: "#22c55e",
  },
  {
    id: "jazz",
    label: "Smooth Jazz",
    emoji: "🎷",
    genre: "Jazz",
    url: "https://streaming.radio.co/s774887f7b/listen",
    color: "#f59e0b",
  },
  {
    id: "classical",
    label: "Classical",
    emoji: "🎻",
    genre: "Classical",
    url: "https://live.musopen.org:8085/streamvbr0",
    color: "#ec4899",
  },
  {
    id: "ambient",
    label: "Ambient",
    emoji: "🌌",
    genre: "Ambient",
    url: "https://uk2.internet-radio.com:8171/listen.aac",
    color: "#6366f1",
  },
  {
    id: "piano",
    label: "Piano",
    emoji: "🎹",
    genre: "Piano",
    url: "https://live.musopen.org:8085/streamvbr0",
    color: "#14b8a6",
  },
  {
    id: "nature-radio",
    label: "Nature Mix",
    emoji: "🦜",
    genre: "Nature",
    url: "https://radio.stereoscenic.com/asp-s",
    color: "#84cc16",
  },
  {
    id: "electronic",
    label: "Electronic",
    emoji: "⚡",
    genre: "Electronic",
    url: "https://streams.fluxfm.de/Chillhop/mp3-128/streams.fluxfm.de/",
    color: "#f43f5e",
  },
];

// ── Component ──────────────────────────────────────────────────

type Tab = "sounds" | "music";

export default function AmbientPlayer() {
  const [expanded, setExpanded] = useState(false);
  const [tab, setTab] = useState<Tab>("sounds");
  const [activeSound, setActiveSound] = useState<string | null>(null);
  const [activeStation, setActiveStation] = useState<string | null>(null);
  const [stationLoading, setStationLoading] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [muted, setMuted] = useState(false);

  // Procedural sound refs
  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const soundRef = useRef<{ stop: () => void } | null>(null);

  // Radio stream ref
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const stopAll = useCallback(() => {
    // Stop procedural sound
    soundRef.current?.stop();
    soundRef.current = null;
    // Stop radio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setActiveSound(null);
    setActiveStation(null);
    setStationLoading(false);
  }, []);

  const stopSound = useCallback(() => {
    soundRef.current?.stop();
    soundRef.current = null;
    setActiveSound(null);
  }, []);

  const stopRadio = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
      audioRef.current = null;
    }
    setActiveStation(null);
    setStationLoading(false);
  }, []);

  const playSound = useCallback((soundId: string) => {
    stopRadio();
    stopSound();

    const config = SOUNDS.find((s) => s.id === soundId);
    if (!config) return;

    if (!ctxRef.current) {
      ctxRef.current = new AudioContext();
      gainRef.current = ctxRef.current.createGain();
      gainRef.current.connect(ctxRef.current.destination);
    }

    const ctx = ctxRef.current;
    if (ctx.state === "suspended") ctx.resume();

    gainRef.current!.gain.value = muted ? 0 : volume;
    soundRef.current = createAmbientSound(ctx, config, gainRef.current!);
    setActiveSound(soundId);
  }, [stopRadio, stopSound, volume, muted]);

  const playStation = useCallback((stationId: string) => {
    stopSound();
    stopRadio();

    const station = RADIO_STATIONS.find((s) => s.id === stationId);
    if (!station) return;

    setStationLoading(true);
    const audio = new Audio();
    audio.crossOrigin = "anonymous";
    audio.volume = muted ? 0 : volume;
    audio.src = station.url;

    audio.addEventListener("canplay", () => {
      setStationLoading(false);
    }, { once: true });

    audio.addEventListener("error", () => {
      setStationLoading(false);
      // Silently fail — stream may be unavailable
    }, { once: true });

    audio.play().catch(() => {
      setStationLoading(false);
    });

    audioRef.current = audio;
    setActiveStation(stationId);
  }, [stopSound, stopRadio, volume, muted]);

  // Update volume for both sources
  useEffect(() => {
    const v = muted ? 0 : volume;
    if (gainRef.current) gainRef.current.gain.value = v;
    if (audioRef.current) audioRef.current.volume = v;
  }, [volume, muted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAll();
      ctxRef.current?.close();
    };
  }, [stopAll]);

  const handleSoundToggle = (soundId: string) => {
    if (activeSound === soundId) {
      stopSound();
    } else {
      playSound(soundId);
    }
  };

  const handleStationToggle = (stationId: string) => {
    if (activeStation === stationId) {
      stopRadio();
    } else {
      playStation(stationId);
    }
  };

  const activeLabel = activeSound
    ? SOUNDS.find((s) => s.id === activeSound)?.emoji
    : activeStation
    ? RADIO_STATIONS.find((s) => s.id === activeStation)?.emoji
    : null;

  const isPlaying = !!activeSound || !!activeStation;

  // Minimized floating button
  if (!expanded) {
    return (
      <motion.button
        onClick={() => setExpanded(true)}
        className={`fixed bottom-6 left-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg border border-border bg-card/95 backdrop-blur-sm hover:shadow-xl transition-shadow ${isPlaying ? "ring-2 ring-primary/30" : ""}`}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
      >
        <Music className={`w-4 h-4 ${isPlaying ? "text-primary" : "text-muted-foreground"}`} />
        {activeLabel && <span className="text-sm">{activeLabel}</span>}
        {stationLoading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
      </motion.button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed bottom-6 left-6 z-40 bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl w-80 overflow-hidden"
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 25 }}
      >
        {/* Top gradient */}
        <div className="h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500" />

        <div className="p-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-bold text-foreground">Focus Audio</span>
              {stationLoading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>

          {/* Tab switcher */}
          <div className="flex items-center bg-secondary/50 rounded-lg p-0.5 mb-3">
            <button
              type="button"
              onClick={() => setTab("sounds")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                tab === "sounds"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Headphones className="w-3.5 h-3.5" />
              Sounds
            </button>
            <button
              type="button"
              onClick={() => setTab("music")}
              className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all ${
                tab === "music"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Radio className="w-3.5 h-3.5" />
              Music
            </button>
          </div>

          {/* Sounds tab */}
          {tab === "sounds" && (
            <div className="grid grid-cols-3 gap-2 mb-3">
              {SOUNDS.map((sound) => {
                const isActive = activeSound === sound.id;
                return (
                  <button
                    key={sound.id}
                    type="button"
                    onClick={() => handleSoundToggle(sound.id)}
                    className={`flex flex-col items-center gap-1 p-2.5 rounded-xl transition-all border-2 ${
                      isActive
                        ? "bg-primary/10 border-primary shadow-md scale-105"
                        : "border-transparent hover:bg-secondary hover:border-border"
                    }`}
                  >
                    <span className="text-xl">{sound.emoji}</span>
                    <span className={`text-[10px] font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                      {sound.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Music tab */}
          {tab === "music" && (
            <div className="space-y-1.5 mb-3 max-h-[240px] overflow-auto">
              {RADIO_STATIONS.map((station) => {
                const isActive = activeStation === station.id;
                return (
                  <button
                    key={station.id}
                    type="button"
                    onClick={() => handleStationToggle(station.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all border-2 text-left ${
                      isActive
                        ? "border-primary/40 bg-primary/5 shadow-sm"
                        : "border-transparent hover:bg-secondary/60"
                    }`}
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                      style={{ backgroundColor: station.color + "18" }}
                    >
                      {station.emoji}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isActive ? "text-primary" : "text-foreground"}`}>
                        {station.label}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{station.genre}</p>
                    </div>
                    {isActive && stationLoading && (
                      <Loader2 className="w-4 h-4 animate-spin text-primary flex-shrink-0" />
                    )}
                    {isActive && !stationLoading && (
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <span className="w-1 h-3 bg-primary rounded-full animate-pulse" />
                        <span className="w-1 h-4 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0.15s" }} />
                        <span className="w-1 h-2.5 bg-primary rounded-full animate-pulse" style={{ animationDelay: "0.3s" }} />
                      </div>
                    )}
                  </button>
                );
              })}
             
            </div>
          )}

          {/* Volume control */}
          <div className="flex items-center gap-2 pt-1 border-t border-border">
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min={0}
              max={100}
              value={muted ? 0 : volume * 100}
              onChange={(e) => { setVolume(parseInt(e.target.value) / 100); setMuted(false); }}
              className="flex-1 h-1.5 bg-secondary rounded-full appearance-none cursor-pointer accent-primary"
            />
            <span className="text-[10px] text-muted-foreground w-8 text-right">
              {muted ? "0" : Math.round(volume * 100)}%
            </span>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

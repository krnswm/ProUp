import { useState, useRef, useEffect, useCallback } from "react";
import { Volume2, VolumeX, Music, X, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SoundConfig {
  id: string;
  label: string;
  emoji: string;
  frequency: number; // base frequency for oscillator
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

  // Noise generator (for rain, café, forest, fire, waves)
  if (config.noiseLevel > 0) {
    const bufferSize = ctx.sampleRate * 2;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1);
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

    // LFO for filter modulation (gives movement)
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

  // Tonal component (for lo-fi)
  if (config.frequency > 0) {
    const osc = ctx.createOscillator();
    osc.type = config.type;
    osc.frequency.value = config.frequency;

    const oscGain = ctx.createGain();
    oscGain.gain.value = 0.08;

    // Vibrato LFO
    const vibrato = ctx.createOscillator();
    const vibratoGain = ctx.createGain();
    vibrato.frequency.value = config.lfoFreq;
    vibratoGain.gain.value = config.lfoDepth;
    vibrato.connect(vibratoGain);
    vibratoGain.connect(osc.frequency);
    vibrato.start();

    // Warm filter
    const warmFilter = ctx.createBiquadFilter();
    warmFilter.type = "lowpass";
    warmFilter.frequency.value = config.filterFreq;
    warmFilter.Q.value = 2;

    osc.connect(warmFilter);
    warmFilter.connect(oscGain);
    oscGain.connect(masterGain);
    osc.start();

    // Add a second detuned oscillator for richness
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

export default function AmbientPlayer() {
  const [expanded, setExpanded] = useState(false);
  const [activeSound, setActiveSound] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.5);
  const [muted, setMuted] = useState(false);

  const ctxRef = useRef<AudioContext | null>(null);
  const gainRef = useRef<GainNode | null>(null);
  const soundRef = useRef<{ stop: () => void } | null>(null);

  const stopSound = useCallback(() => {
    soundRef.current?.stop();
    soundRef.current = null;
  }, []);

  const playSound = useCallback((soundId: string) => {
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
  }, [stopSound, volume, muted]);

  // Update volume
  useEffect(() => {
    if (gainRef.current) {
      gainRef.current.gain.value = muted ? 0 : volume;
    }
  }, [volume, muted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopSound();
      ctxRef.current?.close();
    };
  }, [stopSound]);

  const handleToggle = (soundId: string) => {
    if (activeSound === soundId) {
      stopSound();
      setActiveSound(null);
    } else {
      playSound(soundId);
    }
  };

  // Minimized floating button
  if (!expanded) {
    return (
      <motion.button
        onClick={() => setExpanded(true)}
        className={`fixed bottom-6 left-6 z-40 flex items-center gap-2 px-4 py-2.5 rounded-full shadow-lg border border-border bg-card/95 backdrop-blur-sm hover:shadow-xl transition-shadow ${activeSound ? "ring-2 ring-primary/30" : ""}`}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
      >
        <Music className={`w-4 h-4 ${activeSound ? "text-primary" : "text-muted-foreground"}`} />
        {activeSound && (
          <span className="text-sm">
            {SOUNDS.find((s) => s.id === activeSound)?.emoji}
          </span>
        )}
      </motion.button>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        className="fixed bottom-6 left-6 z-40 bg-card/95 backdrop-blur-md border border-border rounded-2xl shadow-2xl w-72 overflow-hidden"
        initial={{ scale: 0.8, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0, y: 20 }}
        transition={{ type: "spring", damping: 25 }}
      >
        {/* Header */}
        <div className="h-1 bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500" />
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Music className="w-4 h-4 text-purple-500" />
              <span className="text-sm font-bold text-foreground">Ambient Sounds</span>
            </div>
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
          </div>

          {/* Sound grid */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            {SOUNDS.map((sound) => {
              const isActive = activeSound === sound.id;
              return (
                <button
                  key={sound.id}
                  type="button"
                  onClick={() => handleToggle(sound.id)}
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

          {/* Volume control */}
          <div className="flex items-center gap-2">
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

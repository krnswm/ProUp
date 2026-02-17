import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import MainLayout from "@/components/MainLayout";
import { Heart, Zap, Cookie, Sparkles, Star, ArrowRight, Pencil, Check, X, RotateCcw } from "lucide-react";
import {
  getPetState,
  createPet,
  applyDecay,
  feedPet,
  playWithPet,
  renamePet,
  deletePet,
  getPetSprite,
  getPetAge,
  getStageInfo,
  getNextStageInfo,
  FOOD_ITEMS,
  PLAY_ACTIVITIES,
  STAGE_THRESHOLDS,
  type PetState,
  type FeedResult,
  type FoodId,
  type PlayId,
} from "@/lib/virtualpet";

const RARITY_GLOW: Record<string, string> = {
  egg: "shadow-zinc-400/30",
  baby: "shadow-green-400/30",
  teen: "shadow-blue-400/30",
  adult: "shadow-purple-400/30",
  legendary: "shadow-amber-400/40",
};

function StatBar({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1 text-muted-foreground">
          {icon} {label}
        </span>
        <span className="font-mono font-medium">{Math.round(value)}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-secondary/50 overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

function FloatingEmoji({ emoji, onDone }: { emoji: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <motion.div
      className="absolute text-3xl pointer-events-none z-50"
      initial={{ opacity: 1, y: 0, scale: 0.5 }}
      animate={{ opacity: 0, y: -80, scale: 1.3 }}
      transition={{ duration: 1.2, ease: "easeOut" }}
    >
      {emoji}
    </motion.div>
  );
}

export default function VirtualPet() {
  const [pet, setPet] = useState<PetState | null>(null);
  const [newName, setNewName] = useState("");
  const [isNaming, setIsNaming] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [feedResult, setFeedResult] = useState<FeedResult | null>(null);
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; emoji: string }[]>([]);
  const [activeTab, setActiveTab] = useState<"feed" | "play" | "info">("feed");
  const [bouncing, setBouncing] = useState(false);

  const loadPet = useCallback(() => {
    const state = getPetState();
    if (state) {
      const updated = applyDecay(state);
      setPet(updated);
    } else {
      setPet(null);
    }
  }, []);

  useEffect(() => {
    loadPet();
    const interval = setInterval(loadPet, 60000); // refresh every minute
    return () => clearInterval(interval);
  }, [loadPet]);

  // Idle bounce animation
  useEffect(() => {
    const interval = setInterval(() => {
      setBouncing(true);
      setTimeout(() => setBouncing(false), 600);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const addFloatingEmoji = (emoji: string) => {
    const id = Date.now();
    setFloatingEmojis((prev) => [...prev, { id, emoji }]);
  };

  const removeFloatingEmoji = (id: number) => {
    setFloatingEmojis((prev) => prev.filter((e) => e.id !== id));
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    const state = createPet(newName.trim());
    setPet(state);
    setIsNaming(false);
    setNewName("");
  };

  const handleFeed = (foodId: FoodId) => {
    const result = feedPet(foodId);
    if (result) {
      setFeedResult(result);
      const food = FOOD_ITEMS.find((f) => f.id === foodId);
      if (food) addFloatingEmoji(food.emoji);
      if (result.evolved) {
        setTimeout(() => addFloatingEmoji("🎉"), 300);
        setTimeout(() => addFloatingEmoji("⭐"), 600);
      }
      loadPet();
      setTimeout(() => setFeedResult(null), 2000);
    }
  };

  const handlePlay = (activityId: PlayId) => {
    const result = playWithPet(activityId);
    if (result) {
      const activity = PLAY_ACTIVITIES.find((a) => a.id === activityId);
      if (activity) addFloatingEmoji(activity.emoji);
      loadPet();
    }
  };

  const handleRename = () => {
    if (!editName.trim()) return;
    const updated = renamePet(editName.trim());
    if (updated) setPet(updated);
    setIsEditing(false);
    setEditName("");
  };

  const handleReset = () => {
    deletePet();
    setPet(null);
  };

  // ── No Pet: Creation Screen ──────────────────────────────────
  if (!pet && !isNaming) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-center max-w-md space-y-6"
          >
            <motion.div
              className="text-8xl"
              animate={{ y: [0, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              🥚
            </motion.div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
              Adopt a Productivity Pet!
            </h1>
            <p className="text-muted-foreground">
              Your pet grows and evolves as you complete tasks, focus sessions, and journal entries.
              Keep it happy by staying productive!
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsNaming(true)}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-primary to-purple-500 text-white font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-shadow"
            >
              Hatch Your Pet
            </motion.button>
          </motion.div>
        </div>
      </MainLayout>
    );
  }

  // ── Naming Screen ────────────────────────────────────────────
  if (!pet && isNaming) {
    return (
      <MainLayout>
        <div className="flex-1 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-md space-y-6"
          >
            <motion.div
              className="text-7xl"
              animate={{ rotate: [0, -5, 5, -5, 0] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              🥚
            </motion.div>
            <h2 className="text-2xl font-bold">Name Your Pet</h2>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Enter a name..."
              autoFocus
              maxLength={20}
              className="w-full px-4 py-3 rounded-xl border bg-card text-center text-lg font-medium focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
            <div className="flex gap-3 justify-center">
              <button
                onClick={() => setIsNaming(false)}
                className="px-6 py-2 rounded-lg border text-muted-foreground hover:bg-secondary/50 transition-colors"
              >
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50"
              >
                Hatch!
              </motion.button>
            </div>
          </motion.div>
        </div>
      </MainLayout>
    );
  }

  if (!pet) return null;

  const sprite = getPetSprite(pet.stage, pet.mood);
  const stageInfo = getStageInfo(pet.stage);
  const nextStage = getNextStageInfo(pet.xp);
  const age = getPetAge(pet.createdAt);

  return (
    <MainLayout>
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleRename()}
                      autoFocus
                      maxLength={20}
                      className="px-3 py-1 rounded-lg border bg-card text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <button onClick={handleRename} className="p-1 text-green-500 hover:bg-green-500/10 rounded">
                      <Check className="w-4 h-4" />
                    </button>
                    <button onClick={() => setIsEditing(false)} className="p-1 text-red-500 hover:bg-red-500/10 rounded">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <h1 className="text-2xl font-bold">{pet.name}</h1>
                    <button
                      onClick={() => { setIsEditing(true); setEditName(pet.name); }}
                      className="p-1 text-muted-foreground hover:text-foreground hover:bg-secondary/50 rounded transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {stageInfo.emoji} {pet.stage.charAt(0).toUpperCase() + pet.stage.slice(1)} · {age}
              </p>
            </div>
            <button
              onClick={handleReset}
              className="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
              title="Release pet"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Pet Display + Stats */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

            {/* Pet Avatar */}
            <div className={`relative rounded-2xl border bg-card/50 backdrop-blur p-8 flex flex-col items-center justify-center min-h-[300px] shadow-lg ${RARITY_GLOW[pet.stage]}`}>
              {/* Floating emojis */}
              <div className="relative">
                <AnimatePresence>
                  {floatingEmojis.map((fe) => (
                    <FloatingEmoji key={fe.id} emoji={fe.emoji} onDone={() => removeFloatingEmoji(fe.id)} />
                  ))}
                </AnimatePresence>

                <motion.div
                  className="text-[100px] leading-none select-none cursor-pointer"
                  animate={bouncing ? { y: [0, -15, 0] } : {}}
                  transition={{ duration: 0.6, ease: "easeInOut" }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    addFloatingEmoji("❤️");
                    setBouncing(true);
                    setTimeout(() => setBouncing(false), 600);
                  }}
                >
                  {sprite}
                </motion.div>
              </div>

              {/* Mood label */}
              <motion.div
                key={pet.mood}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 px-4 py-1.5 rounded-full bg-secondary/50 text-sm font-medium capitalize"
              >
                {pet.mood === "ecstatic" && "🤩 "}
                {pet.mood === "happy" && "😊 "}
                {pet.mood === "content" && "🙂 "}
                {pet.mood === "neutral" && "😐 "}
                {pet.mood === "sad" && "😢 "}
                {pet.mood === "sick" && "🤒 "}
                Feeling {pet.mood}
              </motion.div>

              {/* Feed result toast */}
              <AnimatePresence>
                {feedResult && (
                  <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.8 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="absolute bottom-4 px-4 py-2 rounded-xl bg-green-500/20 border border-green-500/30 text-green-400 text-sm font-medium"
                  >
                    +{feedResult.xpGain} XP · +{feedResult.hungerGain} Food · +{feedResult.happinessGain} Joy
                    {feedResult.evolved && (
                      <span className="ml-2 text-amber-400">🎉 Evolved to {feedResult.newStage}!</span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Stats Panel */}
            <div className="rounded-2xl border bg-card/50 backdrop-blur p-6 space-y-5">
              <h3 className="font-semibold text-lg">Pet Stats</h3>

              <StatBar label="Hunger" value={pet.hunger} icon={<Cookie className="w-3.5 h-3.5" />} color="bg-gradient-to-r from-orange-400 to-orange-500" />
              <StatBar label="Happiness" value={pet.happiness} icon={<Heart className="w-3.5 h-3.5" />} color="bg-gradient-to-r from-pink-400 to-pink-500" />
              <StatBar label="Energy" value={pet.energy} icon={<Zap className="w-3.5 h-3.5" />} color="bg-gradient-to-r from-yellow-400 to-yellow-500" />

              {/* XP / Evolution Progress */}
              <div className="pt-2 border-t space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Star className="w-3.5 h-3.5" /> Pet XP
                  </span>
                  <span className="font-mono font-medium">{pet.xp}</span>
                </div>
                {nextStage ? (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Next: {nextStage.emoji} {nextStage.stage}</span>
                      <span>{nextStage.xpNeeded} XP to go</span>
                    </div>
                    <div className="h-2 rounded-full bg-secondary/50 overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
                        initial={{ width: 0 }}
                        animate={{
                          width: `${Math.min(100, ((pet.xp - (STAGE_THRESHOLDS.find((t) => t.stage === pet.stage)?.minXP || 0)) / ((STAGE_THRESHOLDS.find((t) => t.stage === nextStage.stage)?.minXP || 1) - (STAGE_THRESHOLDS.find((t) => t.stage === pet.stage)?.minXP || 0))) * 100)}%`,
                        }}
                        transition={{ duration: 0.6 }}
                      />
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-amber-400 font-medium">🏆 Max evolution reached!</p>
                )}
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-3 pt-2 border-t">
                <div className="text-center">
                  <p className="text-lg font-bold">{pet.totalFeedings}</p>
                  <p className="text-xs text-muted-foreground">Feedings</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{pet.totalPlays}</p>
                  <p className="text-xs text-muted-foreground">Play times</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold">{pet.streak}</p>
                  <p className="text-xs text-muted-foreground">Day streak</p>
                </div>
              </div>
            </div>
          </div>

          {/* Actions Tabs */}
          <div className="rounded-2xl border bg-card/50 backdrop-blur overflow-hidden">
            {/* Tab headers */}
            <div className="flex border-b">
              {(["feed", "play", "info"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 px-4 py-3 text-sm font-medium transition-colors relative ${
                    activeTab === tab ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {tab === "feed" && "🍎 Feed"}
                  {tab === "play" && "🎮 Play"}
                  {tab === "info" && "📖 Info"}
                  {activeTab === tab && (
                    <motion.div
                      layoutId="pet-tab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary"
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-5">
              <AnimatePresence mode="wait">
                {activeTab === "feed" && (
                  <motion.div
                    key="feed"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-3"
                  >
                    <p className="text-sm text-muted-foreground mb-4">
                      Feed your pet to keep it happy and help it grow! Earn food by being productive.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {FOOD_ITEMS.map((food) => (
                        <motion.button
                          key={food.id}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleFeed(food.id as FoodId)}
                          className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-secondary/30 transition-colors text-left"
                        >
                          <span className="text-2xl">{food.emoji}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm">{food.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{food.source}</p>
                            <div className="flex gap-2 mt-1 text-xs">
                              <span className="text-orange-400">+{food.hunger} food</span>
                              <span className="text-pink-400">+{food.happiness} joy</span>
                              <span className="text-amber-400">+{food.xp} xp</span>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-muted-foreground" />
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {activeTab === "play" && (
                  <motion.div
                    key="play"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-3"
                  >
                    <p className="text-sm text-muted-foreground mb-4">
                      Play with your pet to boost happiness! Activities cost energy.
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {PLAY_ACTIVITIES.map((activity) => {
                        const canPlay = pet.energy + activity.energy >= 0;
                        return (
                          <motion.button
                            key={activity.id}
                            whileHover={canPlay ? { scale: 1.05 } : {}}
                            whileTap={canPlay ? { scale: 0.95 } : {}}
                            onClick={() => canPlay && handlePlay(activity.id as PlayId)}
                            disabled={!canPlay}
                            className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-colors ${
                              canPlay
                                ? "bg-card hover:bg-secondary/30 cursor-pointer"
                                : "bg-card/50 opacity-50 cursor-not-allowed"
                            }`}
                          >
                            <span className="text-3xl">{activity.emoji}</span>
                            <p className="font-medium text-sm">{activity.name}</p>
                            <div className="flex gap-2 text-xs">
                              <span className="text-pink-400">+{activity.happiness}</span>
                              <span className="text-yellow-400">{activity.energy > 0 ? `+${activity.energy}` : activity.energy}</span>
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}

                {activeTab === "info" && (
                  <motion.div
                    key="info"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    <h4 className="font-semibold">Evolution Stages</h4>
                    <div className="flex items-center gap-2 flex-wrap">
                      {STAGE_THRESHOLDS.map((s, i) => (
                        <div
                          key={s.stage}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm ${
                            pet.stage === s.stage ? "bg-primary/10 border-primary/30 font-medium" : "bg-card"
                          }`}
                        >
                          <span className="text-xl">{s.emoji}</span>
                          <div>
                            <p className="capitalize">{s.stage}</p>
                            <p className="text-xs text-muted-foreground">{s.minXP} XP</p>
                          </div>
                          {i < STAGE_THRESHOLDS.length - 1 && (
                            <ArrowRight className="w-3 h-3 text-muted-foreground ml-1" />
                          )}
                        </div>
                      ))}
                    </div>

                    <h4 className="font-semibold pt-2">How It Works</h4>
                    <ul className="space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2">
                        <Sparkles className="w-4 h-4 mt-0.5 text-amber-400 shrink-0" />
                        <span>Complete tasks, focus sessions, and journal entries to earn food for your pet</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Heart className="w-4 h-4 mt-0.5 text-pink-400 shrink-0" />
                        <span>Feed your pet regularly to keep hunger and happiness high</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Zap className="w-4 h-4 mt-0.5 text-yellow-400 shrink-0" />
                        <span>Play activities cost energy but boost happiness</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Star className="w-4 h-4 mt-0.5 text-purple-400 shrink-0" />
                        <span>Earn enough XP and your pet evolves into new forms!</span>
                      </li>
                    </ul>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

        </div>
      </div>
    </MainLayout>
  );
}

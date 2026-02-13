export const confettiBurst = (opts?: { count?: number }) => {
  if (typeof document === "undefined") return;

  const count = Math.max(10, Math.min(80, opts?.count ?? 40));
  const colors = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#a855f7", "#ec4899"];

  const container = document.createElement("div");
  container.style.position = "fixed";
  container.style.left = "0";
  container.style.top = "0";
  container.style.width = "100%";
  container.style.height = "0";
  container.style.pointerEvents = "none";
  container.style.zIndex = "9999";

  document.body.appendChild(container);

  const w = window.innerWidth;
  const x0 = w * 0.5;

  for (let i = 0; i < count; i++) {
    const p = document.createElement("div");
    const size = 6 + Math.random() * 6;

    p.style.position = "absolute";
    p.style.left = `${x0}px`;
    p.style.top = "0px";
    p.style.width = `${size}px`;
    p.style.height = `${size * 0.6}px`;
    p.style.background = colors[Math.floor(Math.random() * colors.length)];
    p.style.borderRadius = "2px";
    p.style.opacity = "1";
    p.style.transform = `translate(-50%, 0) rotate(${Math.random() * 360}deg)`;

    const dx = (Math.random() - 0.5) * 500;
    const dy = 500 + Math.random() * 500;
    const rot = (Math.random() - 0.5) * 720;
    const duration = 700 + Math.random() * 500;

    p.animate(
      [
        { transform: `translate(-50%, 0) translate(0px, 0px) rotate(0deg)`, opacity: 1 },
        { transform: `translate(-50%, 0) translate(${dx}px, ${dy}px) rotate(${rot}deg)`, opacity: 0 },
      ],
      { duration, easing: "cubic-bezier(.17,.67,.25,1)", fill: "forwards" }
    );

    container.appendChild(p);

    window.setTimeout(() => {
      p.remove();
    }, duration + 50);
  }

  window.setTimeout(() => {
    container.remove();
  }, 1400);
};

export const bumpCompletionStreak = () => {
  if (typeof window === "undefined") return { streak: 0, lastDate: null as string | null };

  const today = new Date().toISOString().slice(0, 10);
  const lastDate = window.localStorage.getItem("completionStreak:lastDate");
  const streakRaw = window.localStorage.getItem("completionStreak:streak");
  const prevStreak = streakRaw ? parseInt(streakRaw) : 0;

  let nextStreak = 1;

  if (lastDate) {
    const last = new Date(lastDate);
    const expected = new Date(today);
    expected.setDate(expected.getDate() - 1);
    const expectedKey = expected.toISOString().slice(0, 10);

    if (lastDate === today) {
      nextStreak = prevStreak;
    } else if (lastDate === expectedKey) {
      nextStreak = prevStreak + 1;
    }
  }

  window.localStorage.setItem("completionStreak:lastDate", today);
  window.localStorage.setItem("completionStreak:streak", String(nextStreak));

  return { streak: nextStreak, lastDate: today };
};

export const readCompletionStreak = () => {
  if (typeof window === "undefined") return { streak: 0, lastDate: null as string | null };
  const lastDate = window.localStorage.getItem("completionStreak:lastDate");
  const streakRaw = window.localStorage.getItem("completionStreak:streak");
  const streak = streakRaw ? parseInt(streakRaw) : 0;
  return { streak: Number.isNaN(streak) ? 0 : streak, lastDate };
};

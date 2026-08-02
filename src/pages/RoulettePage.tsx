import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api, type RouletteBetType, type RouletteConfig, type RoulettePlayResult } from "../lib/api";
import { useAuth } from "../lib/auth";
import { AppPrompt } from "../components/ui";

// Casino palette — scoped to this page, independent of the site's green theme.
const C = {
  bg: "#090909",
  bg2: "#15100F",
  red: "#A20D13",
  redDeep: "#58070A",
  gold: "#D6A43B",
  goldLight: "#F2D084",
  green: "#087A55",
  white: "#F8F1E5",
  muted: "#B8AA98",
};

const reducedMotion = (): boolean =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---- tiny WebAudio sound (no assets); mute persisted locally ----
const useSound = (): { muted: boolean; toggle: () => void; play: (k: "tick" | "win" | "lose") => void } => {
  const [muted, setMuted] = useState(() => localStorage.getItem("rh-roulette-muted") === "1");
  const ctxRef = useRef<AudioContext | null>(null);
  const play = useCallback(
    (k: "tick" | "win" | "lose") => {
      if (muted) return;
      try {
        const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        ctxRef.current ??= new Ctx();
        const ctx = ctxRef.current;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        const now = ctx.currentTime;
        if (k === "tick") {
          osc.frequency.value = 1200;
          gain.gain.setValueAtTime(0.06, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
          osc.start(now);
          osc.stop(now + 0.05);
        } else {
          const notes = k === "win" ? [523, 659, 784, 1047] : [392, 294];
          notes.forEach((f, i) => {
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.connect(g);
            g.connect(ctx.destination);
            o.frequency.value = f;
            const t = now + i * 0.09;
            g.gain.setValueAtTime(0.09, t);
            g.gain.exponentialRampToValueAtTime(0.001, t + 0.16);
            o.start(t);
            o.stop(t + 0.16);
          });
        }
      } catch {
        /* audio is best-effort */
      }
    },
    [muted],
  );
  const toggle = useCallback(() => {
    setMuted((m) => {
      localStorage.setItem("rh-roulette-muted", m ? "0" : "1");
      return !m;
    });
  }, []);
  return { muted, toggle, play };
};

// ---- SVG wheel ----
const polar = (cx: number, cy: number, r: number, deg: number): [number, number] => {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.sin(a), cy - r * Math.cos(a)];
};

const Wheel = ({
  sequence,
  redNumbers,
  rotation,
  ballRotation,
  durationMs,
}: {
  sequence: number[];
  redNumbers: number[];
  rotation: number;
  ballRotation: number;
  durationMs: number;
}): JSX.Element => {
  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const R = 150;
  const seg = 360 / sequence.length;
  const reds = useMemo(() => new Set(redNumbers), [redNumbers]);
  const spin = `transform ${durationMs}ms cubic-bezier(0.17, 0.67, 0.12, 0.99)`;

  return (
    <svg viewBox={`0 0 ${size} ${size}`} width="100%" style={{ maxWidth: 360 }} role="img" aria-label="Roulette wheel">
      {/* rim */}
      <circle cx={cx} cy={cy} r={R + 8} fill={C.bg2} stroke={C.gold} strokeWidth={3} />
      <g style={{ transform: `rotate(${rotation}deg)`, transformOrigin: "center", transition: spin }}>
        {sequence.map((n, i) => {
          const a0 = i * seg - seg / 2;
          const a1 = i * seg + seg / 2;
          const [x0, y0] = polar(cx, cy, R, a0);
          const [x1, y1] = polar(cx, cy, R, a1);
          const fill = n === 0 ? C.green : reds.has(n) ? C.red : "#161616";
          const [tx, ty] = polar(cx, cy, R - 16, i * seg);
          return (
            <g key={n}>
              <path
                d={`M ${cx} ${cy} L ${x0} ${y0} A ${R} ${R} 0 0 1 ${x1} ${y1} Z`}
                fill={fill}
                stroke="#000"
                strokeWidth={0.5}
              />
              <text
                x={tx}
                y={ty}
                fill={C.white}
                fontSize={9}
                fontWeight={700}
                textAnchor="middle"
                dominantBaseline="middle"
                transform={`rotate(${i * seg} ${tx} ${ty})`}
              >
                {n}
              </text>
            </g>
          );
        })}
        <circle cx={cx} cy={cy} r={44} fill={C.bg2} stroke={C.gold} strokeWidth={2} />
        <circle cx={cx} cy={cy} r={30} fill={C.redDeep} stroke={C.goldLight} strokeWidth={1} />
      </g>
      {/* ball (counter-rotates) */}
      <g style={{ transform: `rotate(${ballRotation}deg)`, transformOrigin: "center", transition: spin }}>
        <circle cx={cx} cy={cy - (R - 10)} r={6} fill={C.goldLight} stroke="#fff" strokeWidth={1} />
      </g>
      {/* pointer */}
      <path d={`M ${cx - 9} 6 L ${cx + 9} 6 L ${cx} 24 Z`} fill={C.goldLight} stroke="#000" strokeWidth={0.5} />
    </svg>
  );
};

const betLabel = (t: RouletteBetType, n: number | null): string =>
  t === "NUMBER" ? `Number ${n}` : t.charAt(0) + t.slice(1).toLowerCase();

export const RoulettePage = (): JSX.Element => {
  const auth = useAuth();
  const sound = useSound();

  const [config, setConfig] = useState<RouletteConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [betType, setBetType] = useState<RouletteBetType | null>(null);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [amount, setAmount] = useState(50);
  const [useFree, setUseFree] = useState(false);

  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [ballRotation, setBallRotation] = useState(0);
  const [result, setResult] = useState<RoulettePlayResult | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [recent, setRecent] = useState<{ winningNumber: number; colour: string }[]>([]);
  const timerRef = useRef<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cfg = await api.rouletteConfig();
      setConfig(cfg);
      setAmount(cfg.defaultBet);
      setUseFree(cfg.status.freeGamesRemaining > 0);
      void api.rouletteRecent().then(setRecent).catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load the game");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (auth) void load();
  }, [auth, load]);

  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current); }, []);

  const potentialPayout = useMemo(() => {
    if (!config || !betType) return 0;
    const stake = useFree ? config.status.freeGameStake : amount;
    const m = config.payouts;
    const mult =
      betType === "NUMBER" ? m.number : betType === "ODD" ? m.odd : betType === "EVEN" ? m.even : betType === "RED" ? m.red : m.black;
    return stake * (mult + 1);
  }, [config, betType, amount, useFree]);

  if (!auth) return <div className="mx-auto max-w-6xl px-4 py-8"><AppPrompt /></div>;
  if (loading) return <div className="mx-auto max-w-6xl px-4 py-10"><div className="skeleton h-96 rounded-2xl" /></div>;
  if (error || !config) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-ink-soft">{error ?? "Game unavailable"}</p>
        <button type="button" className="btn-ghost mt-4 px-5 py-2 text-sm" onClick={() => void load()}>
          Retry
        </button>
      </div>
    );
  }

  const st = result?.status ?? config.status;
  const canPickNumber = config.betTypesEnabled.number;

  const selectBet = (t: RouletteBetType, n: number | null = null): void => {
    if (spinning) return;
    setBetType(t);
    setSelectedNumber(n);
  };

  const validStake = useFree ? true : amount >= config.minBet && amount <= config.maxBet;
  const canSpin =
    !spinning &&
    config.enabled &&
    !config.maintenanceMode &&
    betType !== null &&
    validStake &&
    (useFree ? st.freeGamesRemaining > 0 : st.walletBalance >= amount) &&
    st.cooldownRemainingMs <= 0;

  const spin = async (): Promise<void> => {
    if (!canSpin || betType === null) return;
    setSpinning(true);
    setShowModal(false);
    setResult(null);
    try {
      const res = await api.roulettePlay({
        betType,
        selectedValue: betType === "NUMBER" ? selectedNumber : null,
        betAmount: amount,
        useFreeGame: useFree,
        idempotencyKey: crypto.randomUUID(),
      });

      const seq = config.wheelSequence;
      const segDeg = 360 / seq.length;
      const target = ((-res.wheelIndex * segDeg) % 360 + 360) % 360;

      if (reducedMotion()) {
        setRotation(target);
        setBallRotation(0);
        setResult(res);
        setShowModal(true);
        sound.play(res.won ? "win" : "lose");
        setConfig((c) => (c ? { ...c, status: res.status } : c));
        setSpinning(false);
        return;
      }

      // Spin forward to land the winning pocket under the top pointer.
      setRotation((prev) => {
        const currentMod = ((prev % 360) + 360) % 360;
        const delta = (target - currentMod + 360) % 360;
        return prev + 360 * 6 + delta;
      });
      setBallRotation((prev) => prev - 360 * 9);
      sound.play("tick");

      timerRef.current = window.setTimeout(() => {
        setResult(res);
        setShowModal(true);
        sound.play(res.won ? "win" : "lose");
        setConfig((c) => (c ? { ...c, status: res.status } : c));
        setRecent((r) => [{ winningNumber: res.winningNumber, colour: res.winningColour }, ...r].slice(0, 15));
        setSpinning(false);
      }, res.animationDurationMs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Spin failed");
      setSpinning(false);
    }
  };

  const chip = (v: number, active: boolean, onClick: () => void, disabled = false): JSX.Element => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || spinning}
      style={{
        borderColor: active ? C.goldLight : "rgba(214,164,59,0.3)",
        background: active ? C.gold : "transparent",
        color: active ? "#1a1200" : C.goldLight,
      }}
      className="rounded-lg border px-3 py-1.5 text-sm font-bold transition-transform active:scale-95 disabled:opacity-40"
    >
      {v}
    </button>
  );

  const numberColour = (n: number): string =>
    n === 0 ? C.green : config.redNumbers.includes(n) ? C.red : "#161616";

  return (
    <div style={{ background: C.bg, color: C.white }} className="min-h-screen">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        {/* header */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold" style={{ color: C.goldLight }}>
              {config.title}
            </h1>
            <p className="text-sm" style={{ color: C.muted }}>{config.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full border px-3 py-1.5 text-sm font-semibold" style={{ borderColor: "rgba(214,164,59,0.3)", color: C.goldLight }}>
              Balance: {st.walletBalance.toLocaleString()} coins
            </span>
            {config.status.freeGamesEnabled && (
              <span className="rounded-full border px-3 py-1.5 text-sm font-semibold" style={{ borderColor: C.green, color: "#7fe9c0" }}>
                {st.freeGamesRemaining} free
              </span>
            )}
            <button type="button" onClick={sound.toggle} title={sound.muted ? "Unmute" : "Mute"} className="rounded-full border px-3 py-1.5 text-sm" style={{ borderColor: "rgba(214,164,59,0.3)", color: C.goldLight }}>
              {sound.muted ? "🔇" : "🔊"}
            </button>
          </div>
        </div>

        {config.maintenanceMode && (
          <div className="mb-4 rounded-xl border px-4 py-3 text-sm" style={{ borderColor: C.gold, color: C.goldLight, background: C.bg2 }}>
            The game is under maintenance. Betting is temporarily disabled.
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* wheel + recent */}
          <div className="flex flex-col items-center gap-4 rounded-2xl border p-5" style={{ borderColor: "rgba(214,164,59,0.2)", background: C.bg2 }}>
            <Wheel
              sequence={config.wheelSequence}
              redNumbers={config.redNumbers}
              rotation={rotation}
              ballRotation={ballRotation}
              durationMs={config.animationDurationMs}
            />
            <div className="flex w-full flex-wrap items-center justify-center gap-1.5">
              {recent.slice(0, 12).map((r, i) => (
                <span
                  key={i}
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold"
                  style={{ background: numberColour(r.winningNumber), color: C.white }}
                >
                  {r.winningNumber}
                </span>
              ))}
              {recent.length === 0 && <span className="text-xs" style={{ color: C.muted }}>No spins yet</span>}
            </div>
          </div>

          {/* betting controls */}
          <div className="rounded-2xl border p-5" style={{ borderColor: "rgba(214,164,59,0.2)", background: C.bg2 }}>
            {/* even-money bets */}
            <div className="grid grid-cols-2 gap-2">
              {config.betTypesEnabled.red && (
                <button type="button" disabled={spinning} onClick={() => selectBet("RED")} style={{ background: betType === "RED" ? C.red : C.redDeep, borderColor: betType === "RED" ? C.goldLight : "transparent" }} className="rounded-lg border-2 py-3 text-sm font-bold disabled:opacity-40">Red</button>
              )}
              {config.betTypesEnabled.black && (
                <button type="button" disabled={spinning} onClick={() => selectBet("BLACK")} style={{ background: "#161616", borderColor: betType === "BLACK" ? C.goldLight : "transparent" }} className="rounded-lg border-2 py-3 text-sm font-bold disabled:opacity-40">Black</button>
              )}
              {config.betTypesEnabled.odd && (
                <button type="button" disabled={spinning} onClick={() => selectBet("ODD")} style={{ borderColor: betType === "ODD" ? C.goldLight : "rgba(214,164,59,0.3)", color: C.goldLight }} className="rounded-lg border-2 py-3 text-sm font-bold disabled:opacity-40">Odd</button>
              )}
              {config.betTypesEnabled.even && (
                <button type="button" disabled={spinning} onClick={() => selectBet("EVEN")} style={{ borderColor: betType === "EVEN" ? C.goldLight : "rgba(214,164,59,0.3)", color: C.goldLight }} className="rounded-lg border-2 py-3 text-sm font-bold disabled:opacity-40">Even</button>
              )}
            </div>

            {/* number grid */}
            {canPickNumber && (
              <div className="mt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider" style={{ color: C.muted }}>Straight-up number</p>
                <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-9">
                  {Array.from({ length: 37 }, (_, n) => n).map((n) => {
                    const active = betType === "NUMBER" && selectedNumber === n;
                    return (
                      <button
                        key={n}
                        type="button"
                        disabled={spinning}
                        onClick={() => selectBet("NUMBER", n)}
                        style={{
                          background: numberColour(n),
                          outline: active ? `2px solid ${C.goldLight}` : "none",
                          color: C.white,
                        }}
                        className="flex h-9 items-center justify-center rounded-md text-sm font-bold disabled:opacity-40"
                      >
                        {n}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* amount + free toggle */}
            <div className="mt-4 rounded-xl border p-3" style={{ borderColor: "rgba(214,164,59,0.2)" }}>
              {config.status.freeGamesEnabled && st.freeGamesRemaining > 0 && (
                <label className="mb-3 flex items-center gap-2 text-sm font-semibold" style={{ color: "#7fe9c0" }}>
                  <input type="checkbox" checked={useFree} onChange={(e) => setUseFree(e.target.checked)} disabled={spinning} />
                  Use a free spin ({st.freeGamesRemaining} left · stake {config.status.freeGameStake})
                </label>
              )}
              <div className={`flex items-center justify-between gap-2 ${useFree ? "opacity-40" : ""}`}>
                <button type="button" disabled={useFree || spinning} onClick={() => setAmount((a) => Math.max(config.minBet, a - config.betStep))} className="h-9 w-9 rounded-lg border text-lg font-bold" style={{ borderColor: "rgba(214,164,59,0.3)", color: C.goldLight }}>−</button>
                <div className="text-center">
                  <p className="text-lg font-bold tabular-nums" style={{ color: C.goldLight }}>{useFree ? config.status.freeGameStake : amount}</p>
                  <p className="text-[10px]" style={{ color: C.muted }}>coins</p>
                </div>
                <button type="button" disabled={useFree || spinning} onClick={() => setAmount((a) => Math.min(config.maxBet, a + config.betStep))} className="h-9 w-9 rounded-lg border text-lg font-bold" style={{ borderColor: "rgba(214,164,59,0.3)", color: C.goldLight }}>＋</button>
              </div>
              {!useFree && (
                <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                  {[config.minBet, config.defaultBet, config.maxBet].filter((v, i, a) => a.indexOf(v) === i).map((v) => chip(v, amount === v, () => setAmount(v)))}
                </div>
              )}
            </div>

            {/* summary + spin */}
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span style={{ color: C.muted }}>
                  {betType ? `Bet: ${betLabel(betType, selectedNumber)}` : "Pick a bet"}
                </span>
                {betType && (
                  <span style={{ color: C.goldLight }}>Win pays {potentialPayout.toLocaleString()}</span>
                )}
              </div>
              {betType && (
                <button type="button" onClick={() => { setBetType(null); setSelectedNumber(null); }} disabled={spinning} className="mb-2 text-xs underline" style={{ color: C.muted }}>Clear selection</button>
              )}
              <button
                type="button"
                onClick={() => void spin()}
                disabled={!canSpin}
                style={{
                  background: canSpin ? `linear-gradient(180deg, ${C.gold}, ${C.red})` : "#2a2320",
                  color: canSpin ? "#1a1200" : C.muted,
                }}
                className="w-full rounded-xl py-4 text-lg font-extrabold uppercase tracking-wide shadow-lg transition-transform active:scale-[0.98] disabled:cursor-not-allowed"
              >
                {spinning ? "Spinning…" : useFree ? "Spin (free)" : "Spin"}
              </button>
              {st.cooldownRemainingMs > 0 && (
                <p className="mt-2 text-center text-xs" style={{ color: C.muted }}>Cooldown active — please wait.</p>
              )}
            </div>
          </div>
        </div>

        {/* rules */}
        <div className="mt-6 rounded-2xl border p-5 text-sm" style={{ borderColor: "rgba(214,164,59,0.2)", color: C.muted }}>
          <p className="mb-2 font-bold" style={{ color: C.goldLight }}>How to play</p>
          <p>{config.instructions}</p>
          <p className="mt-2">
            Payouts (to 1): number {config.payouts.number} · odd {config.payouts.odd} · even {config.payouts.even} · red {config.payouts.red} · black {config.payouts.black}. Estimated RTP {(config.estimatedRtp * 100).toFixed(2)}% · {config.probabilityMode} mode.
          </p>
          <p className="mt-2 text-xs">Virtual coins only — no cash value, no real-money payout.</p>
        </div>
      </div>

      {/* result modal */}
      {showModal && result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setShowModal(false)}>
          <div
            className="w-full max-w-sm rounded-2xl border p-6 text-center"
            style={{ borderColor: result.won ? C.goldLight : "rgba(214,164,59,0.3)", background: C.bg2, boxShadow: result.won ? `0 0 40px ${C.gold}55` : "none" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full text-2xl font-black" style={{ background: numberColour(result.winningNumber), color: C.white }}>
              {result.winningNumber}
            </div>
            <p className="mt-3 text-sm" style={{ color: C.muted }}>
              {result.winningColour} · {result.parity === "NONE" ? "zero" : result.parity.toLowerCase()}
            </p>
            <p className="mt-2 text-2xl font-extrabold" style={{ color: result.won ? C.goldLight : C.muted }}>
              {result.won ? `You won ${result.payoutAmount.toLocaleString()} coins!` : "No win this time"}
            </p>
            <p className="mt-1 text-sm" style={{ color: C.muted }}>Balance: {result.walletBalance.toLocaleString()} coins</p>
            <button
              type="button"
              onClick={() => setShowModal(false)}
              style={{ background: `linear-gradient(180deg, ${C.gold}, ${C.red})`, color: "#1a1200" }}
              className="mt-5 w-full rounded-xl py-3 font-bold"
            >
              Continue
            </button>
            <p className="mt-3 text-[10px]" style={{ color: C.muted }}>
              Provably fair · round {result.roundId.slice(0, 8)} · verifiable
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

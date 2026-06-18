import { useState, useRef, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";

// ─── SUPABASE CONFIG ──────────────────────────────────────────────
// Replace these with your Supabase project URL and anon key
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || "";
const supabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    : null;

// ─── TYPES ────────────────────────────────────────────────────────
interface SpinRecord {
  id: string;
  winner: string;
  campaign: string;
  spun_at: string;
}

// ─── PMG COLOR PALETTE ────────────────────────────────────────────
const PMG_COLORS = {
  green: {
    dark:  "#062a10",
    mid:   "#0f5c23",
    light: "#22c55e",
    pale:  "#dcfce7",
    glow:  "#16a34a",
  },
  red: {
    dark:  "#7f1d1d",
    mid:   "#dc2626",
    light: "#f87171",
    pale:  "#fee2e2",
  },
  white:    "#ffffff",
  offwhite: "#f0f4f1",
  gold:     "#22c55e",   // renomear uso de "gold" → agora é verde-brilho
  darkText: "#0a1f0e",
  gray: {
    light: "#f1f5f9",
    mid:   "#94a3b8",
    dark:  "#334155",
  },
};

// Wheel segment color pattern (cycles per segment)
const SEGMENT_PALETTE = [
  "#062a10",
  "#ffffff",
  "#7f1d1d",
  "#0f5c23",
  "#f0f4f1",
  "#dc2626",
];

// ─── CONFETTI ─────────────────────────────────────────────────────
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  rotation: number;
  rotSpeed: number;
  life: number;
  maxLife: number;
}

function createConfetti(canvas: HTMLCanvasElement): Particle[] {
  const colors = [
    PMG_COLORS.green.mid,
    PMG_COLORS.red.mid,
    PMG_COLORS.gold,
    "#ffffff",
    PMG_COLORS.green.light,
    PMG_COLORS.red.light,
  ];
  const particles: Particle[] = [];
  for (let i = 0; i < 180; i++) {
    particles.push({
      x: canvas.width / 2,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 18,
      vy: Math.random() * -18 - 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 10 + 5,
      rotation: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 12,
      life: 0,
      maxLife: 120 + Math.random() * 60,
    });
  }
  return particles;
}

// ─── WHEEL DRAWING ────────────────────────────────────────────────
function drawWheel(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  names: string[],
  rotation: number,
  highlightIdx: number | null
) {
  const n = names.length;
  const arc = (2 * Math.PI) / n;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  for (let i = 0; i < n; i++) {
    const startAngle = i * arc;
    const endAngle = startAngle + arc;
    const baseColor = SEGMENT_PALETTE[i % SEGMENT_PALETTE.length];
    const isLight = baseColor === PMG_COLORS.white;
    const isHighlight = highlightIdx === i;

    // Segment fill
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = isHighlight
      ? PMG_COLORS.gold
      : isLight
      ? "#f0f0f0"
      : baseColor;
    ctx.fill();

    // Border
    ctx.strokeStyle = PMG_COLORS.gold;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Text
    ctx.save();
    ctx.rotate(startAngle + arc / 2);
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const fontSize = Math.max(10, Math.min(16, radius / (n * 0.28)));
    ctx.font = `bold ${fontSize}px 'Montserrat', sans-serif`;
    ctx.fillStyle =
      isHighlight
        ? PMG_COLORS.darkText
        : isLight
        ? PMG_COLORS.green.dark
        : "#ffffff";
    ctx.shadowColor = "rgba(0,0,0,0.4)";
    ctx.shadowBlur = 3;

    const maxTextWidth = radius * 0.7;
    const label = names[i];
    ctx.fillText(label, radius - 14, 0, maxTextWidth);
    ctx.restore();
  }

  // Center circle
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.12, 0, 2 * Math.PI);
  ctx.fillStyle = PMG_COLORS.gold;
  ctx.fill();
  ctx.strokeStyle = PMG_COLORS.green.dark;
  ctx.lineWidth = 3;
  ctx.stroke();

  // Center "PMG" label placeholder (replaced by logo image if provided)
  ctx.fillStyle = PMG_COLORS.green.dark;
  ctx.font = `bold ${Math.max(8, radius * 0.05)}px 'Montserrat', sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowBlur = 0;
  ctx.fillText("PMG", 0, 0);

  ctx.restore();

  // Outer ring glow border
  ctx.save();
  ctx.translate(cx, cy);
  ctx.beginPath();
  ctx.arc(0, 0, radius + 6, 0, 2 * Math.PI);
  ctx.strokeStyle = PMG_COLORS.gold;
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(0, 0, radius + 12, 0, 2 * Math.PI);
  ctx.strokeStyle = PMG_COLORS.green.dark;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

function drawPointer(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number
) {
  const pSize = 28;
  ctx.save();
  ctx.translate(cx + radius + pSize * 0.3, cy);
  ctx.beginPath();
  ctx.moveTo(pSize, 0);
  ctx.lineTo(0, -pSize * 0.5);
  ctx.lineTo(-pSize * 0.1, 0);
  ctx.lineTo(0, pSize * 0.5);
  ctx.closePath();
  ctx.fillStyle = PMG_COLORS.red.dark;
  ctx.strokeStyle = PMG_COLORS.gold;
  ctx.lineWidth = 2;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────
export default function App() {
  // Names state
  const [namesRaw, setNamesRaw] = useState(
    "João Silva\nMaria Santos\nPedro Lima\nAna Costa\nCarlos Souza\nFernanda Rocha\nRicardo Alves\nBeatriz Nunes"
  );
  const names = namesRaw
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

  // Campaign
  const [campaign, setCampaign] = useState("Sorteio PMG");
// Duração do giro (segundos)
const [spinDuration, setSpinDuration] = useState(5);
  // Spin state
  const [isSpinning, setIsSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [, setWinnerIdx] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState<number | null>(null);

  // History
  const [history, setHistory] = useState<SpinRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"names" | "history">("names");

  // Asset fallback state (true while real logo/mascot files aren't found)
  const [logoMissing, setLogoMissing] = useState(false);
const [mascotMissing, setMascotMissing] = useState(false);
  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const rotRef = useRef(0);
  const confettiRef = useRef<Particle[]>([]);
  const confettiActiveRef = useRef(false);
  const pulseRef = useRef(0);

  // ── Draw loop ──
  const draw = useCallback(
    (spinning: boolean, targetHighlight: number | null) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const W = canvas.width;
      const H = canvas.height;
      ctx.clearRect(0, 0, W, H);

      const cx = W / 2;
      const cy = H / 2;
      const radius = Math.min(cx, cy) - 32;

      // Idle pulse glow
      if (!spinning) {
        pulseRef.current += 0.03;
        const glow = 0.3 + 0.2 * Math.sin(pulseRef.current);
        ctx.save();
        ctx.translate(cx, cy);
        ctx.beginPath();
        ctx.arc(0, 0, radius + 20, 0, 2 * Math.PI);
        ctx.strokeStyle = `rgba(46, 125, 50, ${glow})`;
        ctx.lineWidth = 8;
        ctx.stroke();
        ctx.restore();
      }

      if (names.length >= 2) {
        drawWheel(
          ctx,
          cx,
          cy,
          radius,
          names,
          rotRef.current,
          targetHighlight
        );
        drawPointer(ctx, cx, cy, radius);
      } else {
        // Placeholder
        ctx.save();
        ctx.translate(cx, cy);
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, 2 * Math.PI);
        ctx.fillStyle = PMG_COLORS.green.pale;
        ctx.fill();
        ctx.strokeStyle = PMG_COLORS.green.dark;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.fillStyle = PMG_COLORS.green.dark;
        ctx.font = "bold 16px Montserrat, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Adicione nomes", 0, 0);
        ctx.restore();
      }

      // Confetti
      if (confettiActiveRef.current && confettiRef.current.length > 0) {
        confettiRef.current = confettiRef.current.filter((p) => {
          p.life++;
          const alpha = 1 - p.life / p.maxLife;
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.5;
          p.rotation += p.rotSpeed;
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.translate(p.x, p.y);
          ctx.rotate((p.rotation * Math.PI) / 180);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.5);
          ctx.restore();
          return p.life < p.maxLife;
        });
        if (confettiRef.current.length === 0) {
          confettiActiveRef.current = false;
        }
      }
    },
    [names]
  );

  // ── Animation frame ──
  const frameRef = useRef<() => void>(() => {});
  frameRef.current = () => {
    const spinning = isSpinning;
    draw(spinning, highlightIdx);
    animRef.current = requestAnimationFrame(frameRef.current);
  };

  useEffect(() => {
    animRef.current = requestAnimationFrame(frameRef.current);
    return () => cancelAnimationFrame(animRef.current);
  }, [draw, isSpinning, highlightIdx]);

  // ── Canvas resize ──
  useEffect(() => {
    const resize = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const container = canvas.parentElement;
      if (!container) return;
      const size = Math.min(container.clientWidth, 520);
      canvas.width = size;
      canvas.height = size;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // ── Load history ──
  const loadHistory = useCallback(async () => {
    if (!supabase) return;
    setHistoryLoading(true);
    try {
      const { data } = await supabase
        .from("wheel_spins")
        .select("*")
        .order("spun_at", { ascending: false })
        .limit(50);
      if (data) setHistory(data as SpinRecord[]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // ── Save spin to Supabase ──
  const saveSpin = async (winnerName: string) => {
    if (!supabase) return;
    await supabase.from("wheel_spins").insert({
      winner: winnerName,
      campaign: campaign.trim() || "Sorteio PMG",
      spun_at: new Date().toISOString(),
    });
    loadHistory();
  };

  // ── Spin logic ──
  const spin = () => {
    if (isSpinning || names.length < 2) return;
    setWinner(null);
    setWinnerIdx(null);
    setHighlightIdx(null);
    setShowModal(false);
    setIsSpinning(true);
    confettiActiveRef.current = false;

    const minSpins = 5;
    const maxSpins = 9;
    const totalRotation =
      (minSpins + Math.random() * (maxSpins - minSpins)) * 2 * Math.PI;
    const duration = spinDuration * 1000;
    const start = performance.now();
    const startRot = rotRef.current;

    // Easing: ease-out cubic
    const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(elapsed / duration, 1);
      rotRef.current = startRot + totalRotation * easeOut(t);

      if (t < 1) {
        requestAnimationFrame(tick);
      } else {
        // Pointer is at angle 0 (right side), wheel rotated
        const normalizedRot =
          ((rotRef.current % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
        const pointerAngle = 2 * Math.PI - normalizedRot;
        const idx = Math.floor(
          ((pointerAngle % (2 * Math.PI)) / (2 * Math.PI)) * names.length
        ) % names.length;
        const winnerName = names[idx];

        setWinnerIdx(idx);
        setHighlightIdx(idx);
        setWinner(winnerName);
        setIsSpinning(false);
        setShowModal(true);

        // Confetti
        const canvas = canvasRef.current;
        if (canvas) {
          confettiRef.current = createConfetti(canvas);
          confettiActiveRef.current = true;
        }

        saveSpin(winnerName);
      }
    };

    requestAnimationFrame(tick);
  };

  // ── Remove winner ──
  const removeWinner = () => {
  if (!winner) return;
  const next = names.filter((n) => n !== winner).join("\n");
  setNamesRaw(next);
  setWinner(null);
  setWinnerIdx(null);
  setHighlightIdx(null);
  setShowModal(false);
};

  // ─────────────────────────────────────────────────────────────────
  return (
    <div style={styles.root}>
      {/* ── Header ── */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.headerBrand}>
            {/* Logo real — cai para o placeholder "PMG" se /logo.png não existir */}
            {!logoMissing ? (
              <img
                src="/logo.png"
                alt="Logo PMG Atacadista"
                width={52}
                height={52}
                style={styles.logoImg}
                onError={() => setLogoMissing(true)}
              />
            ) : (
              <div style={styles.logoPlaceholder}>
                <span style={styles.logoText}>PMG</span>
              </div>
            )}
            <div>
              <h1 style={styles.headerTitle}>Roda da Sorte</h1>
              <p style={styles.headerSub}>PMG Atacadista</p>
            </div>
          </div>
          <div style={styles.headerCampaign}>
            <label style={styles.label}>Campanha</label>
            <input
              value={campaign}
              onChange={(e) => setCampaign(e.target.value)}
              style={styles.campaignInput}
              placeholder="Nome da campanha..."
            />
          </div>
        </div>
      </header>

      {/* ── Main layout ── */}
      <main style={styles.main}>
        {/* ── Wheel column ── */}
        <section style={styles.wheelCol}>
          <div style={styles.canvasWrapper}>
            <canvas ref={canvasRef} style={styles.canvas} />
          </div>
{/* Duração do giro */}
<div style={{ width: "100%", maxWidth: 320 }}>
  <label style={{ ...styles.label, display: "flex", justifyContent: "space-between" }}>
    <span>Duração do giro</span>
    <span style={{ color: PMG_COLORS.green.glow, fontWeight: 800 }}>{spinDuration}s</span>
  </label>
  <input
    type="range"
    min={2}
    max={15}
    step={1}
    value={spinDuration}
    onChange={(e) => setSpinDuration(Number(e.target.value))}
    disabled={isSpinning}
    style={{ width: "100%", accentColor: PMG_COLORS.green.light, marginTop: 6 }}
  />
  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: PMG_COLORS.gray.mid, marginTop: 2 }}>
    <span>2s (rápido)</span>
    <span>15s (lento)</span>
  </div>
</div>
          <button
            onClick={spin}
            disabled={isSpinning || names.length < 2}
            style={{
              ...styles.spinBtn,
              ...(isSpinning || names.length < 2
                ? styles.spinBtnDisabled
                : {}),
            }}
          >
            {isSpinning ? (
              <span style={styles.spinBtnText}>
                <SpinnerIcon /> Girando...
              </span>
            ) : (
              <span style={styles.spinBtnText}>🎡 GIRAR</span>
            )}
          </button>

          {winner && !showModal && (
            <div style={styles.winnerBadge}>
              🏆 <strong>{winner}</strong> foi sorteado!
            </div>
          )}
        </section>

        {/* ── Side panel ── */}
        <aside style={styles.panel}>
          {/* Tab switcher */}
          <div style={styles.tabBar}>
            <button
              onClick={() => setActiveTab("names")}
              style={{
                ...styles.tab,
                ...(activeTab === "names" ? styles.tabActive : {}),
              }}
            >
              Participantes ({names.length})
            </button>
            <button
              onClick={() => {
                setActiveTab("history");
                loadHistory();
              }}
              style={{
                ...styles.tab,
                ...(activeTab === "history" ? styles.tabActive : {}),
              }}
            >
              Histórico
            </button>
          </div>

          {activeTab === "names" && (
            <div style={styles.panelBody}>
              <label style={styles.label}>
                Um nome por linha
              </label>
              <textarea
                value={namesRaw}
                onChange={(e) => {
                  setNamesRaw(e.target.value);
                  setWinner(null);
                  setWinnerIdx(null);
                  setHighlightIdx(null);
                }}
                style={styles.textarea}
                placeholder={"João Silva\nMaria Santos\nPedro Lima\n..."}
                rows={16}
              />
              <div style={styles.nameActions}>
                <button
                  onClick={() => setNamesRaw("")}
                  style={styles.secondaryBtn}
                >
                  Limpar
                </button>
                {winner && (
                  <button onClick={removeWinner} style={styles.dangerBtn}>
                    Remover vencedor
                  </button>
                )}
              </div>

              {names.length < 2 && (
                <p style={styles.hint}>
                  ⚠️ Adicione pelo menos 2 participantes para girar.
                </p>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div style={styles.panelBody}>
              {!supabase && (
                <div style={styles.supabaseNotice}>
                  <p style={styles.supabaseNoticeTitle}>Supabase não conectado</p>
                  <p style={styles.supabaseNoticeText}>
                    Configure as variáveis de ambiente{" "}
                    <code>VITE_SUPABASE_URL</code> e{" "}
                    <code>VITE_SUPABASE_ANON_KEY</code> e crie a tabela{" "}
                    <code>wheel_spins</code> no seu projeto Supabase.
                  </p>
                  <pre style={styles.sqlBlock}>{SQL_SCHEMA}</pre>
                </div>
              )}

              {supabase && historyLoading && (
                <p style={styles.hint}>Carregando histórico...</p>
              )}

              {supabase && !historyLoading && history.length === 0 && (
                <p style={styles.hint}>Nenhum sorteio registrado ainda.</p>
              )}

              {supabase && !historyLoading && history.length > 0 && (
                <div style={styles.historyList}>
                  {history.map((r) => (
                    <div key={r.id} style={styles.historyItem}>
                      <div style={styles.historyWinner}>🏆 {r.winner}</div>
                      <div style={styles.historyMeta}>
                        <span style={styles.historyTag}>{r.campaign}</span>
                        <span style={styles.historyDate}>
                          {new Date(r.spun_at).toLocaleString("pt-BR", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </aside>
        {!mascotMissing && (
          <div
            className="pmg-floating-mascot"
            style={styles.floatingMascotWrap}
          >
            <img
              src="/mascot.png"
              alt="Mascote PMG"
              style={styles.floatingMascotImg}
              onError={() => setMascotMissing(true)}
            />
          </div>
        )}

      </main>

      {/* ── Winner Modal ── */}
      {showModal && winner && (
        <div style={styles.modalOverlay} onClick={() => setShowModal(false)}>
          <div
            style={styles.modal}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mascot placeholder */}
            <div style={styles.mascotArea}>
              <div style={styles.mascotPlaceholder}>
  {!mascotMissing ? (
    <img
      src="/mascot.png"
      alt="Mascote"
      style={{ width: "100%", height: "100%", objectFit: "contain" }}
      onError={() => setMascotMissing(true)}
    />
  ) : (
    <span style={{ fontSize: 52 }}>🏆</span>
  )}
</div>
            </div>

            <div style={styles.modalContent}>
              <p style={styles.modalLabel}>Parabéns!</p>
              <h2 style={styles.modalWinner}>{winner}</h2>
              <p style={styles.modalCampaign}>{campaign}</p>

              <div style={styles.modalActions}>
                <button
                  onClick={() => {
  setShowModal(false);
  setTimeout(() => spin(), 50);
}}
                  style={styles.spinBtn}
                >
                  Girar Novamente
                </button>
                <button onClick={removeWinner} style={styles.dangerBtn}>
                  Remover e Continuar
                </button>
                <button
                  onClick={() => setShowModal(false)}
                  style={styles.secondaryBtn}
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      
    </div>
  );
}

// ─── SPINNER ICON ─────────────────────────────────────────────────
function SpinnerIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      style={{ animation: "spin 1s linear infinite", verticalAlign: "middle" }}
    >
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  );
}

// ─── SQL SCHEMA (shown when Supabase not configured) ──────────────
const SQL_SCHEMA = `create table wheel_spins (
  id uuid default gen_random_uuid() primary key,
  winner text not null,
  campaign text not null default 'Sorteio PMG',
  spun_at timestamptz default now()
);

-- Enable Row Level Security (opcional)
alter table wheel_spins enable row level security;
create policy "public insert" on wheel_spins
  for insert with check (true);
create policy "public select" on wheel_spins
  for select using (true);`;

// ─── STYLES ───────────────────────────────────────────────────────
const styles: Record<string, React.CSSProperties> = {
  root: {
    width: "100%",           // ← era 100vw (causava overflow)
    minHeight: "100vh",
    maxWidth: "100%",
    display: "flex",
    flexDirection: "column" as const,
    fontFamily: "'Inter', 'Montserrat', sans-serif",
    background: `radial-gradient(ellipse at top, #dcfce7 0%, #f0f4f1 60%)`,
    color: PMG_COLORS.darkText,
    overflow: "hidden",
  },

  header: {
    background: `linear-gradient(135deg, ${PMG_COLORS.green.dark} 0%, #0f5c23 60%, ${PMG_COLORS.green.dark} 100%)`,
    borderBottom: `3px solid ${PMG_COLORS.green.light}`,
    padding: "0 24px",
    boxShadow: "0 4px 32px rgba(34,197,94,0.18)",
    flexShrink: 0,           // ← impede o header de encolher
  },
  headerInner: {
    maxWidth: 1200,
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: "14px 0",
    flexWrap: "wrap" as const,
  },
  headerBrand: {
    display: "flex",
    alignItems: "center",
    gap: 14,
  },
  logoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    background: "rgba(34,197,94,0.15)",
    border: "2px dashed #22c55e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 800,
    fontSize: 14,
    color: "#22c55e",
    letterSpacing: 1,
    flexShrink: 0,
  },
  logoText: { fontFamily: "Montserrat, sans-serif" },
  logoImg: {
    width: 250,
    height: 250,
    borderRadius: 8,
    objectFit: "contain" as const,
    flexShrink: 0,
  },
  headerTitle: {
    margin: 0,
    fontSize: 28,
    fontFamily: "'Bebas Neue', sans-serif",
    fontWeight: 400,
    color: "#ffffff",
    lineHeight: 1,
    letterSpacing: 3,
  },
  headerSub: {
    margin: 0,
    fontSize: 12,
    color: PMG_COLORS.gold,
    fontWeight: 600,
    textTransform: "uppercase" as const,
    letterSpacing: 1,
  },
  headerCampaign: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 4,
    minWidth: 220,
  },
  campaignInput: {
    padding: "8px 12px",
    borderRadius: 8,
    border: `2px solid ${PMG_COLORS.gold}`,
    background: "rgba(255,255,255,0.12)",
    color: "#ffffff",
    fontSize: 14,
    fontWeight: 600,
    outline: "none",
    fontFamily: "Montserrat, sans-serif",
  },

  main: {
    flex: 1,
    width: "100%",
    padding: "24px clamp(16px, 3vw, 48px)", // ← padding responsivo
    display: "flex",
    gap: 40,
    flexWrap: "wrap" as const,              // ← era nowrap (quebrava em telas menores)
    alignItems: "flex-start",               // ← era center (causava roda comprimida)
    justifyContent: "center",
  },

  wheelCol: {
    flex: "1 1 380px",                       // ← substitui o width fixo
    maxWidth: 520,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 20,
  },
  canvasWrapper: {
  width: "100%",
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  padding: 0,
},
  canvas: {
  width: "100%",
  maxWidth: 480,
  height: "auto",
  display: "block",
  borderRadius: "50%",
  animation: "pulseGlow 3s ease-in-out infinite",
  filter: "drop-shadow(0 8px 32px rgba(46,125,50,0.25))",
},
floatingMascotWrap: {
  position: "fixed" as const,
  bottom: 20,
  right: 20,
  width: 120,
  height: 120,
  zIndex: 40,
  animation: "mascotFloat 3.5s ease-in-out infinite",
  pointerEvents: "none" as const,
},
floatingMascotImg: {
  width: "100",
  height: "100",
  objectFit: "contain" as const,
  filter: "drop-shadow(0 12px 24px rgba(6,42,16,0.35))",
},
  spinBtn: {
    width: "100%",
    maxWidth: 320,
    padding: "18px 32px",
    background: `linear-gradient(160deg, ${PMG_COLORS.green.light} 0%, ${PMG_COLORS.green.glow} 100%)`,
    color: "#ffffff",
    border: "none",
    borderRadius: 50,
    fontSize: 22,
    fontWeight: 900,
    fontFamily: "'Bebas Neue', Montserrat, sans-serif",
    cursor: "pointer",
    letterSpacing: 5,
    textTransform: "uppercase" as const,
    transition: "transform 0.18s cubic-bezier(.34,1.56,.64,1), box-shadow 0.18s",
    boxShadow: "0 8px 32px rgba(34,197,94,0.45), 0 2px 8px rgba(0,0,0,0.18)",
  },
  spinBtnDisabled: {
    opacity: 0.5,
    cursor: "not-allowed",
    boxShadow: "none",
  },
  spinBtnText: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  winnerBadge: {
    background: PMG_COLORS.green.pale,
    border: `2px solid ${PMG_COLORS.green.mid}`,
    color: PMG_COLORS.green.dark,
    borderRadius: 12,
    padding: "12px 20px",
    fontSize: 16,
    fontWeight: 700,
    textAlign: "center" as const,
  },

  panel: {
    flex: "1 1 280px",
    maxWidth: 380,
    minWidth: 260,
    maxHeight: "80vh",
    background: PMG_COLORS.white,
    borderRadius: 20,
    border: "1px solid #e2e8f0",
    boxShadow: "0 4px 32px rgba(6,42,16,0.10)",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column" as const,
  },
  tabBar: {
    display: "flex",
    borderBottom: `1px solid #e2e8f0`,
    flexShrink: 0,
  },
  tab: {
    flex: 1,
    padding: "14px 8px",
    background: "transparent",
    border: "none",
    borderBottom: "3px solid transparent",
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 700,
    color: PMG_COLORS.gray.mid,
    fontFamily: "Montserrat, sans-serif",
    transition: "color 0.2s",
  },
  tabActive: {
    color: PMG_COLORS.green.dark,
    borderBottomColor: PMG_COLORS.green.dark,
  },
  panelBody: {
    padding: 20,
    display: "flex",
    flexDirection: "column" as const,
    gap: 12,
    overflowY: "auto" as const,   // ← scroll aqui, não no panel inteiro
    flex: 1,
  },
  label: {
    fontSize: 11,
    fontWeight: 700,
    color: PMG_COLORS.gray.dark,
    textTransform: "uppercase" as const,
    letterSpacing: 0.8,
  },
  textarea: {
    width: "100%",
    padding: "12px",
    border: `1.5px solid #e2e8f0`,
    borderRadius: 10,
    fontSize: 14,
    fontFamily: "Montserrat, sans-serif",
    resize: "vertical" as const,
    outline: "none",
    color: PMG_COLORS.darkText,
    lineHeight: 1.7,
    boxSizing: "border-box" as const,
  },
  nameActions: {
    display: "flex",
    gap: 8,
    flexWrap: "wrap" as const,
  },
  secondaryBtn: {
    padding: "8px 16px",
    borderRadius: 8,
    border: `1.5px solid #e2e8f0`,
    background: "#f8fafc",
    color: PMG_COLORS.gray.dark,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 600,
    fontFamily: "Montserrat, sans-serif",
  },
  dangerBtn: {
    padding: "8px 16px",
    borderRadius: 8,
    border: `1.5px solid ${PMG_COLORS.red.light}`,
    background: PMG_COLORS.red.pale,
    color: PMG_COLORS.red.dark,
    cursor: "pointer",
    fontSize: 13,
    fontWeight: 700,
    fontFamily: "Montserrat, sans-serif",
  },
  hint: {
    fontSize: 13,
    color: PMG_COLORS.gray.mid,
    margin: 0,
  },

  historyList: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
  },
  historyItem: {
    background: "#f8fafc",
    borderRadius: 10,
    padding: "10px 14px",
    border: "1px solid #e2e8f0",
  },
  historyWinner: {
    fontWeight: 700,
    fontSize: 14,
    color: PMG_COLORS.green.dark,
    marginBottom: 4,
  },
  historyMeta: {
    display: "flex",
    gap: 8,
    alignItems: "center",
    flexWrap: "wrap" as const,
  },
  historyTag: {
    background: PMG_COLORS.green.pale,
    color: PMG_COLORS.green.dark,
    fontSize: 11,
    fontWeight: 700,
    padding: "2px 8px",
    borderRadius: 20,
  },
  historyDate: {
    fontSize: 11,
    color: PMG_COLORS.gray.mid,
  },

  supabaseNotice: {
    background: "#fffbeb",
    border: "1px solid #fde68a",
    borderRadius: 10,
    padding: 16,
  },
  supabaseNoticeTitle: {
    margin: "0 0 6px",
    fontWeight: 700,
    fontSize: 14,
    color: "#92400e",
  },
  supabaseNoticeText: {
    margin: "0 0 12px",
    fontSize: 12,
    color: "#78350f",
    lineHeight: 1.6,
  },
  sqlBlock: {
    background: "#1e293b",
    color: "#94d2bd",
    borderRadius: 8,
    padding: 12,
    fontSize: 10,
    lineHeight: 1.7,
    overflowX: "auto" as const,
    margin: 0,
    fontFamily: "monospace",
  },

  modalOverlay: {
    position: "fixed" as const,
    inset: 0,
    background: "rgba(6,42,16,0.85)",
    backdropFilter: "blur(8px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
    padding: 20,
  },
  modal: {
    background: `linear-gradient(160deg, ${PMG_COLORS.green.dark} 0%, #0f5c23 100%)`,
    borderRadius: 24,
    border: `2px solid ${PMG_COLORS.green.light}`,
    boxShadow: "0 32px 96px rgba(6,42,16,0.7), 0 0 64px rgba(34,197,94,0.2)",
    overflow: "hidden",
    maxWidth: 480,
    width: "100%",
    position: "relative" as const,
    animation: "fadeSlideUp 0.4s cubic-bezier(.34,1.56,.64,1)",
  },
  mascotArea: {
    padding: "36px 20px 16px",
    display: "flex",
    justifyContent: "center",
    position: "relative" as const,
    overflow: "hidden" as const,
  },
  mascotPlaceholder: {
    width: 110,
    height: 110,
    borderRadius: "50%",
    background: "rgba(34,197,94,0.12)",
    border: "2px dashed #22c55e",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  modalContent: {
    padding: "28px 36px 36px",
    textAlign: "center" as const,
    display: "flex",
    flexDirection: "column" as const,
    gap: 14,
    background: "rgba(0,0,0,0.15)",
  },
  modalLabel: {
    margin: 0,
    fontSize: 11,
    fontWeight: 700,
    fontFamily: "'Inter', sans-serif",
    color: PMG_COLORS.green.light,
    textTransform: "uppercase" as const,
    letterSpacing: 4,
  },
  modalWinner: {
    margin: 0,
    fontSize: 64,
    fontFamily: "'Bebas Neue', sans-serif",
    fontWeight: 400,
    color: "#ffffff",
    lineHeight: 1,
    letterSpacing: 2,
    textShadow: "0 0 48px rgba(34,197,94,0.6)",
    animation: "winnerpop 0.5s cubic-bezier(.34,1.56,.64,1) 0.1s both",
  },
  modalCampaign: {
    margin: 0,
    fontSize: 13,
    color: "rgba(255,255,255,0.55)",
    fontFamily: "'Inter', sans-serif",
    fontWeight: 500,
    letterSpacing: 1,
  },
  modalActions: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
    marginTop: 8,
  },
};

// ── Inject keyframes ──────────────────────────────────────────────
if (!document.getElementById("pmg-styles")) {
  const style = document.createElement("style");
  style.id = "pmg-styles";
  style.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;600;700&family=Montserrat:wght@800;900&display=swap');
    @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    * { box-sizing: border-box; }
    body { margin: 0; }
    textarea:focus, input:focus { border-color: #2e7d32 !important; box-shadow: 0 0 0 3px rgba(46,125,50,0.15); }
    button:not(:disabled):hover { transform: translateY(-2px) scale(1.03) !important; filter: brightness(1.08); }
button:not(:disabled):active { transform: scale(0.97) !important; }
    @keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 32px 8px rgba(34,197,94,0.25), 0 0 80px 16px rgba(34,197,94,0.08); }
  50%       { box-shadow: 0 0 56px 16px rgba(34,197,94,0.45), 0 0 120px 32px rgba(34,197,94,0.18); }
}
@keyframes mascotFloat {
  0%, 100% { transform: translateY(0) rotate(-3deg); }
  50%       { transform: translateY(-16px) rotate(3deg); }
}
@media (max-width: 640px) {
  .pmg-floating-mascot { width: 76px !important; height: 76px !important; bottom: 12px !important; right: 12px !important; }
}
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(28px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0)   scale(1);    }
}
@keyframes winnerpop {
  0%   { opacity: 0; transform: scale(0.7) translateY(30px); }
  70%  { transform: scale(1.05) translateY(-4px); }
  100% { opacity: 1; transform: scale(1) translateY(0); }
}

@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position:  400px 0; }
}
  
  `;
  document.head.appendChild(style);
}

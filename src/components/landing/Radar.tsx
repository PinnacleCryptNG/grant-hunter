"use client";

import { useEffect, useRef, useState } from "react";

const LIME = "198,244,50";
const TAU = Math.PI * 2;

type Target = { a: number; r: number; kind?: string; seed: number };

const TARGETS: Target[] = [
  { a: 5.65, r: 0.6, kind: "GRANT" },
  { a: 0.55, r: 0.55, kind: "BOUNTY" },
  { a: 2.35, r: 0.5, kind: "HACKATHON" },
  { a: 3.75, r: 0.62, kind: "CONTEST" },
  { a: 1.05, r: 0.3 },
  { a: 1.75, r: 0.84 },
  { a: 2.95, r: 0.27 },
  { a: 4.3, r: 0.88 },
  { a: 4.9, r: 0.38 },
  { a: 0.15, r: 0.86 },
  { a: 3.2, r: 0.78 },
].map((t, i) => ({ ...t, seed: i * 1.37 }));

export function Radar({ speed = 1, labels = true, core = true, className = "" }: { speed?: number; labels?: boolean; core?: boolean; className?: string }) {
  const wrap = useRef<HTMLDivElement>(null);
  const tilt = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const target = useRef(speed);

  useEffect(() => {
    target.current = speed;
  }, [speed]);

  useEffect(() => {
    const canvas = cv.current;
    const box = wrap.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !box || !ctx) return;

    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mono = getComputedStyle(document.body).getPropertyValue("--font-mono-face").trim() || "ui-monospace, monospace";
    let w = 0, h = 0, dpr = 1;
    const resize = () => {
      dpr = Math.min(devicePixelRatio || 1, 2);
      w = box.clientWidth;
      h = box.clientHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(box);

    let theta = -Math.PI / 2;
    let cur = target.current;
    let last = performance.now();
    let raf = 0;
    let visible = true;

    const draw = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      cur += (target.current - cur) * 0.04;
      theta = (theta + dt * (TAU / 6) * cur) % TAU;
      const t = now / 1000;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const cx = w / 2, cy = h / 2;
      const R = Math.min(w, h) / 2 * (labels ? 0.8 : 0.96);
      const fs = Math.max(9, R * 0.042);

      const disc = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
      disc.addColorStop(0, `rgba(${LIME},0.10)`);
      disc.addColorStop(0.7, `rgba(${LIME},0.025)`);
      disc.addColorStop(1, `rgba(${LIME},0)`);
      ctx.fillStyle = disc;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, TAU);
      ctx.fill();

      ctx.lineWidth = 1;
      [0.25, 0.5, 0.75, 1].forEach((f) => {
        ctx.strokeStyle = `rgba(${LIME},${f === 1 ? 0.3 : 0.1})`;
        ctx.beginPath();
        ctx.arc(cx, cy, R * f, 0, TAU);
        ctx.stroke();
      });

      ctx.strokeStyle = `rgba(${LIME},0.08)`;
      ctx.beginPath();
      ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy);
      ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R);
      ctx.stroke();
      ctx.setLineDash([2, 6]);
      ctx.strokeStyle = `rgba(${LIME},0.05)`;
      ctx.beginPath();
      const d = R * Math.SQRT1_2;
      ctx.moveTo(cx - d, cy - d); ctx.lineTo(cx + d, cy + d);
      ctx.moveTo(cx + d, cy - d); ctx.lineTo(cx - d, cy + d);
      ctx.stroke();
      ctx.setLineDash([]);

      if (labels) {
        for (let deg = 0; deg < 360; deg += 5) {
          const a = (deg / 360) * TAU - Math.PI / 2;
          const major = deg % 30 === 0;
          const len = major ? 9 : 4;
          ctx.strokeStyle = `rgba(${LIME},${major ? 0.45 : 0.18})`;
          ctx.beginPath();
          ctx.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
          ctx.lineTo(cx + Math.cos(a) * (R + len), cy + Math.sin(a) * (R + len));
          ctx.stroke();
          if (major) {
            ctx.fillStyle = "rgba(233,237,245,0.3)";
            ctx.font = `500 ${fs * 0.9}px ${mono}`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(String(deg).padStart(3, "0"), cx + Math.cos(a) * (R + 22), cy + Math.sin(a) * (R + 22));
          }
        }
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-t * 0.06);
        ctx.setLineDash([1.5, 9]);
        ctx.strokeStyle = `rgba(${LIME},0.25)`;
        ctx.beginPath();
        ctx.arc(0, 0, R * 1.2, 0, TAU);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.strokeStyle = `rgba(${LIME},0.55)`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(0, 0, R * 1.2, 0, 0.5);
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.restore();
      }

      const phase = (t % 4) / 4;
      ctx.strokeStyle = `rgba(${LIME},${(1 - phase) * 0.22})`;
      ctx.beginPath();
      ctx.arc(cx, cy, R * phase, 0, TAU);
      ctx.stroke();

      const trail = 1.25;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, theta - trail, theta);
      ctx.closePath();
      if (typeof ctx.createConicGradient === "function") {
        const g = ctx.createConicGradient(theta - trail, cx, cy);
        g.addColorStop(0, `rgba(${LIME},0)`);
        g.addColorStop(trail / TAU, `rgba(${LIME},0.34)`);
        g.addColorStop(Math.min(1, trail / TAU + 0.0001), `rgba(${LIME},0)`);
        ctx.fillStyle = g;
      } else {
        ctx.fillStyle = `rgba(${LIME},0.12)`;
      }
      ctx.fill();
      ctx.restore();

      for (let i = 0; i < 7; i++) {
        const a = theta - Math.random() * trail * 0.6;
        const r = Math.random() * R;
        ctx.fillStyle = `rgba(${LIME},${Math.random() * 0.35})`;
        ctx.fillRect(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1.2, 1.2);
      }

      ctx.save();
      ctx.shadowColor = `rgba(${LIME},0.9)`;
      ctx.shadowBlur = 14;
      ctx.strokeStyle = `rgba(${LIME},0.95)`;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(theta) * R, cy + Math.sin(theta) * R);
      ctx.stroke();
      ctx.restore();

      for (const tg of TARGETS) {
        const behind = (((theta - tg.a) % TAU) + TAU) % TAU;
        const glow = Math.max(0.16, Math.exp(-behind / 1.5));
        const r = R * (tg.r + Math.sin(t * 0.35 + tg.seed) * 0.012);
        const x = cx + Math.cos(tg.a) * r;
        const y = cy + Math.sin(tg.a) * r;

        if (behind < 1.1) {
          const p = behind / 1.1;
          ctx.strokeStyle = `rgba(${LIME},${(1 - p) * 0.8})`;
          ctx.beginPath();
          ctx.arc(x, y, 3 + p * R * 0.09, 0, TAU);
          ctx.stroke();
        }
        const halo = ctx.createRadialGradient(x, y, 0, x, y, 14);
        halo.addColorStop(0, `rgba(${LIME},${glow * 0.55})`);
        halo.addColorStop(1, `rgba(${LIME},0)`);
        ctx.fillStyle = halo;
        ctx.beginPath();
        ctx.arc(x, y, 14, 0, TAU);
        ctx.fill();
        ctx.fillStyle = `rgba(${tg.kind ? "236,255,170" : LIME},${0.35 + glow * 0.65})`;
        ctx.beginPath();
        ctx.arc(x, y, tg.kind ? 3 : 2, 0, TAU);
        ctx.fill();

        if (labels && tg.kind) {
          const right = Math.cos(tg.a) >= 0;
          const up = Math.sin(tg.a) < 0;
          const ex = x + (right ? 12 : -12);
          const ey = y + (up ? -12 : 12);
          const lx = ex + (right ? 18 : -18);
          const alpha = 0.4 + glow * 0.6;
          ctx.strokeStyle = `rgba(${LIME},${alpha * 0.7})`;
          ctx.beginPath();
          ctx.moveTo(x + (right ? 4 : -4), y + (up ? -4 : 4));
          ctx.lineTo(ex, ey);
          ctx.lineTo(lx, ey);
          ctx.stroke();
          ctx.textAlign = right ? "left" : "right";
          ctx.textBaseline = "middle";
          ctx.font = `600 ${fs}px ${mono}`;
          ctx.fillStyle = `rgba(233,237,245,${alpha})`;
          ctx.fillText(tg.kind, lx + (right ? 5 : -5), ey - fs * 0.55);
          const bearing = String(Math.round((((tg.a + Math.PI / 2) % TAU) / TAU) * 360)).padStart(3, "0");
          ctx.font = `400 ${fs * 0.85}px ${mono}`;
          ctx.fillStyle = `rgba(${LIME},${alpha * 0.8})`;
          ctx.fillText(`${bearing}° · R${tg.r.toFixed(2).slice(1)}`, lx + (right ? 5 : -5), ey + fs * 0.65);
        }
      }

      if (!reduced && visible) raf = requestAnimationFrame(draw);
    };

    const start = () => {
      cancelAnimationFrame(raf);
      last = performance.now();
      raf = requestAnimationFrame(draw);
    };
    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting;
      if (visible && !reduced) start();
    });
    io.observe(box);
    start();

    const onMove = (e: PointerEvent) => {
      const el = tilt.current;
      if (!el || !labels || reduced) return;
      const r = box.getBoundingClientRect();
      const nx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / r.width));
      const ny = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / r.height));
      el.style.transform = `perspective(1200px) rotateX(${-ny * 7}deg) rotateY(${nx * 7}deg)`;
    };
    addEventListener("pointermove", onMove, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      removeEventListener("pointermove", onMove);
    };
  }, [labels]);

  return (
    <div ref={wrap} className={`relative aspect-square w-full ${className}`}>
      <div ref={tilt} className="absolute inset-0 transition-transform duration-500 ease-out will-change-transform">
        <canvas ref={cv} aria-hidden className="absolute inset-0 h-full w-full" />
        {core && <div className="absolute left-1/2 top-1/2 grid h-[11%] w-[11%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-[28%] bg-lime text-night shadow-[0_0_50px_rgba(198,244,50,0.55)]">
          <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M22 12h-4M6 12H2M12 6V2M12 22v-4" /></svg>
        </div>}
      </div>
    </div>
  );
}

const SWEEPS = ["superteam.fun/earn", "devpost.com", "gitcoin.co", "x.com", "ecosystem grant pages", "creator contests"];

export function RadarReadout() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setI((n) => (n + 1) % SWEEPS.length), 1500);
    return () => clearInterval(id);
  }, []);
  return (
    <p className="flex items-center justify-center gap-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-fg/40">
      <span className="relative flex h-1.5 w-1.5"><span className="absolute inset-0 animate-ping rounded-full bg-lime/70" /><span className="relative h-1.5 w-1.5 rounded-full bg-lime" /></span>
      Sweeping <span key={i} className="animate-rise text-lime/90 normal-case tracking-normal">{SWEEPS[i]}</span>
    </p>
  );
}

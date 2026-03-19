import { useEffect, useRef } from 'react';

interface TransactionFlowGlobeProps {
  className?: string;
}

// --- Canvas size ---
const S = 480;
const R = 175;
const ROTATION_SPEED = 0.0008;
const SPAWN_INTERVAL = 40;

// --- Fintech ecosystem nodes ---
const nodes = [
  { label: 'Banking', angle: 0, isCore: true, color: { r: 99, g: 91, b: 255 } },
  { label: 'Payments', angle: 45, isCore: true, color: { r: 255, g: 59, b: 139 } },
  { label: 'Lending', angle: 90, isCore: false, color: { r: 93, g: 202, b: 165 } },
  { label: 'Fintech', angle: 135, isCore: false, color: { r: 133, g: 183, b: 235 } },
  { label: 'Fintech', angle: 180, isCore: false, color: { r: 237, g: 147, b: 177 } },
  { label: 'Fintech', angle: 225, isCore: false, color: { r: 255, g: 107, b: 0 } },
  { label: 'Fintech', angle: 270, isCore: false, color: { r: 168, g: 130, b: 255 } },
  { label: 'Brim', angle: 315, isCore: true, color: { r: 212, g: 168, b: 67 } },
];

// --- Connections between sectors ---
const conns = [
  // Core ring
  { from: 0, to: 1, type: 0 },
  { from: 1, to: 2, type: 1 },
  { from: 2, to: 3, type: 2 },
  { from: 3, to: 4, type: 3 },
  { from: 4, to: 5, type: 4 },
  { from: 5, to: 6, type: 5 },
  { from: 6, to: 7, type: 6 },
  { from: 7, to: 0, type: 7 },
  // Cross connections (how sectors interconnect)
  { from: 0, to: 2, type: 0 }, // Banking ↔ Lending
  { from: 0, to: 4, type: 0 }, // Banking ↔ RegTech
  { from: 1, to: 5, type: 1 }, // Payments ↔ Crypto
  { from: 1, to: 7, type: 1 }, // Payments ↔ Infra
  { from: 2, to: 6, type: 2 }, // Lending ↔ WealthTech
  { from: 3, to: 4, type: 3 }, // InsurTech ↔ RegTech
  { from: 5, to: 7, type: 5 }, // Crypto ↔ Infra
  { from: 6, to: 0, type: 6 }, // WealthTech ↔ Banking
];

interface Particle {
  conn: number;
  t: number;
  sp: number;
  sz: number;
}

export default function TransactionFlowGlobe({ className }: TransactionFlowGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const tickRef = useRef(0);
  const isVisibleRef = useRef(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const g = canvas.getContext('2d');
    if (!g) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = S * dpr;
    canvas.height = S * dpr;
    canvas.style.width = S + 'px';
    canvas.style.height = S + 'px';
    g.setTransform(dpr, 0, 0, dpr, 0, 0);

    const particles = particlesRef.current;

    // Seed initial particles (sparse)
    for (let i = 0; i < 4; i++) {
      particles.push({
        conn: Math.floor(Math.random() * conns.length),
        t: Math.random() * 0.8,
        sp: 0.0015 + Math.random() * 0.002,
        sz: 1.5 + Math.random() * 1.5,
      });
    }

    const r2 = (v: number) => Math.round(v * 2) / 2;

    function nodePos(idx: number, rotOff: number, cx: number, cy: number) {
      const n = nodes[idx];
      const a = ((n.angle + rotOff) * Math.PI) / 180;
      return { x: r2(cx + Math.cos(a) * R), y: r2(cy + Math.sin(a) * R) };
    }

    function pathPt(fi: number, ti: number, t: number, rotOff: number, cx: number, cy: number) {
      const p1 = nodePos(fi, rotOff, cx, cy);
      const p2 = nodePos(ti, rotOff, cx, cy);
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      let mx = (p1.x + p2.x) / 2;
      let my = (p1.y + p2.y) / 2;
      const toCx = cx - mx;
      const toCy = cy - my;
      const toLen = Math.sqrt(toCx * toCx + toCy * toCy);
      if (toLen > 0) {
        mx += (toCx / toLen) * dist * 0.15;
        my += (toCy / toLen) * dist * 0.15;
      }
      const mt = 1 - t;
      return {
        x: mt * mt * p1.x + 2 * mt * t * mx + t * t * p2.x,
        y: mt * mt * p1.y + 2 * mt * t * my + t * t * p2.y,
      };
    }

    function spawn() {
      particles.push({
        conn: Math.floor(Math.random() * conns.length),
        t: 0,
        sp: 0.0015 + Math.random() * 0.002,
        sz: 1.5 + Math.random() * 1.5,
      });
    }

    function draw(time: number) {
      if (!isVisibleRef.current) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      g!.clearRect(0, 0, S, S);

      const cx = S / 2;
      const cy = S / 2;
      const rotOff = time * ROTATION_SPEED;
      const ctx = g!;
      const rcx = r2(cx);
      const rcy = r2(cy);

      // Orbital rings
      ctx.beginPath();
      ctx.arc(rcx, rcy, R + 20, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(rcx, rcy, R, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(rcx, rcy, R * 0.45, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.03)';
      ctx.lineWidth = 1;
      ctx.stroke();

      // Connection paths
      for (const conn of conns) {
        const p1 = nodePos(conn.from, rotOff, cx, cy);
        const p2 = nodePos(conn.to, rotOff, cx, cy);
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        let mx = (p1.x + p2.x) / 2;
        let my = (p1.y + p2.y) / 2;
        const toCx = cx - mx;
        const toCy = cy - my;
        const toLen = Math.sqrt(toCx * toCx + toCy * toCy);
        if (toLen > 0) {
          mx += (toCx / toLen) * dist * 0.15;
          my += (toCy / toLen) * dist * 0.15;
        }
        const cl = nodes[conn.from].color;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.quadraticCurveTo(mx, my, p2.x, p2.y);
        ctx.strokeStyle = `rgba(${cl.r},${cl.g},${cl.b},0.12)`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      // Spawn particles
      tickRef.current++;
      if (tickRef.current % SPAWN_INTERVAL === 0) spawn();

      // Draw particles
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.t += p.sp;
        if (p.t > 1) {
          particles.splice(i, 1);
          continue;
        }
        const conn = conns[p.conn];
        const pos = pathPt(conn.from, conn.to, p.t, rotOff, cx, cy);
        const cl = nodes[conn.from].color;
        const rgb = `${cl.r},${cl.g},${cl.b}`;

        // Trail
        for (let tr = 1; tr <= 4; tr++) {
          const tt = Math.max(0, p.t - tr * 0.012);
          const tp = pathPt(conn.from, conn.to, tt, rotOff, cx, cy);
          ctx.beginPath();
          ctx.arc(tp.x, tp.y, p.sz * 0.4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${rgb},${(0.2 * (1 - tr / 4)).toFixed(3)})`;
          ctx.fill();
        }

        // Glow
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, p.sz + 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},0.12)`;
        ctx.fill();

        // Dot
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, p.sz, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},0.8)`;
        ctx.fill();

        // Arrival pulse
        if (p.t > 0.9) {
          const ep = nodePos(conn.to, rotOff, cx, cy);
          const pulse = (p.t - 0.9) / 0.1;
          ctx.beginPath();
          ctx.arc(ep.x, ep.y, 10 + pulse * 8, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${rgb},${(0.2 * (1 - pulse)).toFixed(3)})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      // Draw nodes
      nodes.forEach((n, idx) => {
        const pos = nodePos(idx, rotOff, cx, cy);
        const br = (n.isCore ? 16 : 14) + Math.sin(time * 0.001 + idx * 0.9) * 2;
        const px = r2(pos.x);
        const py = r2(pos.y);
        const { r, g: gv, b } = n.color;

        // Breathing ring
        ctx.beginPath();
        ctx.arc(px, py, br, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${r},${gv},${b},${n.isCore ? 0.15 : 0.08})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Node circle
        ctx.beginPath();
        ctx.arc(px, py, n.isCore ? 10 : 8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${gv},${b},0.08)`;
        ctx.fill();
        ctx.strokeStyle = `rgba(${r},${gv},${b},${n.isCore ? 0.4 : 0.25})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Center dot
        ctx.beginPath();
        ctx.arc(px, py, n.isCore ? 3.5 : 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${r},${gv},${b},0.7)`;
        ctx.fill();

        // Labels
        const a = ((n.angle + rotOff) * Math.PI) / 180;
        const lx = cx + Math.cos(a) * (R + 24);
        const ly = cy + Math.sin(a) * (R + 24);
        const normA = (((n.angle + rotOff) % 360) + 360) % 360;

        ctx.font = n.isCore
          ? '600 9px "JetBrains Mono", monospace'
          : '500 8px "JetBrains Mono", monospace';

        if (normA > 80 && normA < 100) {
          ctx.textAlign = 'center';
        } else if (normA > 260 && normA < 280) {
          ctx.textAlign = 'center';
        } else if (normA > 90 && normA < 270) {
          ctx.textAlign = 'right';
        } else {
          ctx.textAlign = 'left';
        }

        const lyOffset = normA > 80 && normA < 100 ? 8 : normA > 260 && normA < 280 ? -2 : 0;

        ctx.fillStyle = `rgba(${r},${gv},${b},${n.isCore ? 0.6 : 0.45})`;
        ctx.fillText(n.label, lx, ly + 3 + lyOffset);
      });

      // Center hub glow
      const hubPulse = 0.04 + Math.sin(time * 0.002) * 0.02;
      ctx.beginPath();
      ctx.arc(rcx, rcy, 6, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(99,91,255,${hubPulse})`;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(rcx, rcy, 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      ctx.fill();

      animRef.current = requestAnimationFrame(draw);
    }

    // Pause when not visible
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.isIntersecting;
      },
      { threshold: 0.1 },
    );
    observer.observe(canvas);

    animRef.current = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animRef.current);
      observer.disconnect();
      particlesRef.current = [];
      tickRef.current = 0;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{
        width: S,
        height: S,
        maxWidth: '100%',
        aspectRatio: '1',
      }}
    />
  );
}

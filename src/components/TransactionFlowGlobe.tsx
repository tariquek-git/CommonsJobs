import { useEffect, useRef } from 'react';

interface TransactionFlowGlobeProps {
  className?: string;
}

// --- Constants ---
const S = 480;
const R = 170;
const ROTATION_SPEED = 0.0012;
const SPAWN_INTERVAL = 16;
const MOUSE_EASE = 0.05;
const MOUSE_MAX_OFFSET = 18;

// --- Node definitions ---
const nodes = [
  { label: 'Brim', angle: -90, isBrim: true },
  { label: 'Cardholder', angle: -30, isBrim: false },
  { label: 'Merchant', angle: 30, isBrim: false },
  { label: 'Acquirer', angle: 90, isBrim: false },
  { label: 'Network', angle: 150, isBrim: false },
  { label: 'Brim', angle: 210, isBrim: true },
  { label: 'Settlement', angle: 270, isBrim: false },
];

// --- Connection definitions ---
const conns = [
  // Auth flow (gold)
  { from: 0, to: 1, type: 'platform' as const },
  { from: 1, to: 2, type: 'auth' as const },
  { from: 2, to: 3, type: 'auth' as const },
  { from: 3, to: 4, type: 'auth' as const },
  { from: 4, to: 5, type: 'auth' as const },
  { from: 5, to: 0, type: 'platform' as const },
  // Response flow (teal)
  { from: 0, to: 5, type: 'response' as const },
  { from: 5, to: 4, type: 'response' as const },
  { from: 4, to: 3, type: 'response' as const },
  { from: 3, to: 2, type: 'response' as const },
  { from: 2, to: 1, type: 'response' as const },
  // Clearing flow (blue)
  { from: 3, to: 6, type: 'clearing' as const },
  { from: 5, to: 6, type: 'clearing' as const },
  // Settlement flow (pink)
  { from: 6, to: 3, type: 'settlement' as const },
  { from: 6, to: 5, type: 'settlement' as const },
  // Cross paths
  { from: 0, to: 4, type: 'platform' as const },
  { from: 1, to: 5, type: 'auth' as const },
];

// --- Flow colors ---
const colors: Record<string, { r: number; g: number; b: number }> = {
  auth: { r: 212, g: 168, b: 67 },
  response: { r: 93, g: 202, b: 165 },
  clearing: { r: 133, g: 183, b: 235 },
  settlement: { r: 237, g: 147, b: 177 },
  platform: { r: 212, g: 168, b: 67 },
};

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
  const mouseTargetRef = useRef({ x: 0, y: 0 });
  const mouseCurrentRef = useRef({ x: 0, y: 0 });
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

    // Seed initial particles
    for (let i = 0; i < 8; i++) {
      particles.push({
        conn: Math.floor(Math.random() * conns.length),
        t: Math.random() * 0.8,
        sp: 0.003 + Math.random() * 0.004,
        sz: 1.5 + Math.random() * 1.5,
      });
    }

    // Round to half-pixel for crisp lines
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
        mx += (toCx / toLen) * dist * 0.12;
        my += (toCy / toLen) * dist * 0.12;
      }
      const mt = 1 - t;
      return {
        x: mt * mt * p1.x + 2 * mt * t * mx + t * t * p2.x,
        y: mt * mt * p1.y + 2 * mt * t * my + t * t * p2.y,
      };
    }

    function spawn() {
      const ci = Math.floor(Math.random() * conns.length);
      particles.push({
        conn: ci,
        t: 0,
        sp: 0.003 + Math.random() * 0.004,
        sz: 1.5 + Math.random() * 1.5,
      });
    }

    function draw(time: number) {
      if (!isVisibleRef.current) {
        animRef.current = requestAnimationFrame(draw);
        return;
      }

      g!.clearRect(0, 0, S, S);

      // Mouse follow lerp
      const mt = mouseTargetRef.current;
      const mc = mouseCurrentRef.current;
      mc.x += (mt.x - mc.x) * MOUSE_EASE;
      mc.y += (mt.y - mc.y) * MOUSE_EASE;

      const cx = S / 2 + mc.x * MOUSE_MAX_OFFSET;
      const cy = S / 2 + mc.y * MOUSE_MAX_OFFSET;
      const rotOff = time * ROTATION_SPEED;

      const ctx = g!;

      // Orbital rings — rounded center for crisp rendering
      const rcx = r2(cx);
      const rcy = r2(cy);

      ctx.beginPath();
      ctx.arc(rcx, rcy, R + 30, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(rcx, rcy, R, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.04)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(rcx, rcy, R * 0.5, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.025)';
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
          mx += (toCx / toLen) * dist * 0.12;
          my += (toCy / toLen) * dist * 0.12;
        }
        const cl = colors[conn.type];
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.quadraticCurveTo(mx, my, p2.x, p2.y);
        ctx.strokeStyle = `rgba(${cl.r},${cl.g},${cl.b},0.14)`;
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
        const cl = colors[conn.type];
        const rgb = `${cl.r},${cl.g},${cl.b}`;

        // Trail
        for (let tr = 1; tr <= 5; tr++) {
          const tt = Math.max(0, p.t - tr * 0.014);
          const tp = pathPt(conn.from, conn.to, tt, rotOff, cx, cy);
          ctx.beginPath();
          ctx.arc(tp.x, tp.y, p.sz * 0.45, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${rgb},${(0.25 * (1 - tr / 5)).toFixed(3)})`;
          ctx.fill();
        }

        // Glow
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, p.sz + 5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},0.15)`;
        ctx.fill();

        // Dot
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, p.sz, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${rgb},0.85)`;
        ctx.fill();

        // Arrival pulse
        if (p.t > 0.9) {
          const ep = nodePos(conn.to, rotOff, cx, cy);
          const pulse = (p.t - 0.9) / 0.1;
          ctx.beginPath();
          ctx.arc(ep.x, ep.y, 12 + pulse * 10, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(${rgb},${(0.25 * (1 - pulse)).toFixed(3)})`;
          ctx.lineWidth = 0.8;
          ctx.stroke();
        }
      }

      // Draw nodes
      nodes.forEach((n, idx) => {
        const pos = nodePos(idx, rotOff, cx, cy);
        const br = 15 + Math.sin(time * 0.001 + idx * 1.1) * 2;

        const px = r2(pos.x);
        const py = r2(pos.y);

        if (n.isBrim) {
          // Breathing ring
          ctx.beginPath();
          ctx.arc(px, py, br, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(212,168,67,0.12)';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Node circle
          ctx.beginPath();
          ctx.arc(px, py, 10, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(212,168,67,0.4)';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Center dot
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(212,168,67,0.7)';
          ctx.fill();
        } else {
          // Breathing ring
          ctx.beginPath();
          ctx.arc(px, py, br, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255,255,255,0.06)';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Node circle
          ctx.beginPath();
          ctx.arc(px, py, 9, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255,255,255,0.12)';
          ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.3)';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Center dot
          ctx.beginPath();
          ctx.arc(px, py, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(212,168,67,0.7)';
          ctx.fill();
        }

        // Labels
        const a = ((n.angle + rotOff) * Math.PI) / 180;
        const lx = cx + Math.cos(a) * (R + 22);
        const ly = cy + Math.sin(a) * (R + 22);
        const normA = (((n.angle + rotOff) % 360) + 360) % 360;

        ctx.font = n.isBrim
          ? '600 8.5px "JetBrains Mono", monospace'
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

        ctx.fillStyle = n.isBrim ? 'rgba(212,168,67,0.5)' : 'rgba(255,255,255,0.45)';
        ctx.fillText(n.label, lx, ly + 3 + lyOffset);
      });

      // Center hub
      ctx.beginPath();
      ctx.arc(rcx, rcy, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fill();

      animRef.current = requestAnimationFrame(draw);
    }

    // Mouse event handlers
    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = ((e.clientY - rect.top) / rect.height) * 2 - 1;
      mouseTargetRef.current = {
        x: Math.max(-1, Math.min(1, x)),
        y: Math.max(-1, Math.min(1, y)),
      };
    };

    const handleMouseLeave = () => {
      mouseTargetRef.current = { x: 0, y: 0 };
    };

    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseleave', handleMouseLeave);

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
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
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
        pointerEvents: 'auto',
      }}
    />
  );
}

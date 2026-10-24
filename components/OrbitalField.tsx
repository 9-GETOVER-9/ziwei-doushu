'use client';
import { useEffect, useRef } from 'react';

/** Editable time-driven field; static redraws still follow theme and viewport changes. */
export default function OrbitalField() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame: number | null = null;
    let last = 0;
    let visible = true;
    let disposed = false;

    function draw(now: number) {
      if (!canvas || !ctx) return;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (!width || !height) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      const dark = document.documentElement.dataset.theme === 'dark';
      const time = reduced.matches ? 0 : now / 16000;
      const tilt = -.36 + Math.sin(time) * .12;
      const scale = Math.min(width / 4.5, height / 3.3);
      const points: { x: number; y: number; z: number; l: number }[] = [];
      const project = (x: number, y: number, z: number, l: number) => {
        const a = x * Math.cos(tilt) - y * Math.sin(tilt);
        const b = x * Math.sin(tilt) + y * Math.cos(tilt);
        points.push({ x: width / 2 + a * scale, y: height / 2 + b * scale, z, l });
      };
      for (let y = -.98; y <= .98; y += .058) for (let x = -.98; x <= .98; x += .052) {
        const distance = x * x + y * y;
        if (distance > 1) continue;
        const z = Math.sqrt(1 - distance);
        const grain = .08 * Math.sin(x * 30 + time * 4) * Math.cos(y * 24 - time * 2);
        project(x, y, z, Math.max(.05, .2 + z * .52 - x * .17 - y * .1 + grain));
      }
      for (let radius = 1.35; radius < 1.9; radius += .075) for (let angle = 0; angle < Math.PI * 2; angle += .026) {
        const x = radius * Math.cos(angle);
        const z = radius * Math.sin(angle);
        const y = z * .32;
        if (z < 0 && x * x + y * y < 1) continue;
        project(x, y, z, .14 + .35 * (Math.sin(angle + time) + 1) / 2);
      }
      points.sort((a, b) => a.z - b.z);
      ctx.font = `${Math.max(6, scale * .064)}px 'Reference Mono', monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const chars = ' .,:;JVRS#@';
      points.forEach(point => {
        ctx.fillStyle = dark ? `rgba(210,210,220,${point.l * .85})` : `rgba(24,24,30,${point.l})`;
        ctx.fillText(chars[Math.min(chars.length - 1, Math.floor(point.l * chars.length))], point.x, point.y);
      });
    }

    function cancel() {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
    }
    function tick(now: number) {
      frame = null;
      if (disposed || document.hidden || !visible) return;
      if (!last || now - last >= 65) { draw(now); last = now; }
      if (!reduced.matches) frame = requestAnimationFrame(tick);
    }
    function refresh() {
      cancel();
      last = 0;
      if (!disposed && !document.hidden && visible) frame = requestAnimationFrame(tick);
    }
    const resize = new ResizeObserver(refresh);
    resize.observe(canvas);
    const theme = new MutationObserver(refresh);
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    const intersection = new IntersectionObserver(entries => {
      visible = entries[0]?.isIntersecting ?? false;
      refresh();
    }, { rootMargin: '120px' });
    intersection.observe(canvas);
    reduced.addEventListener('change', refresh);
    document.addEventListener('visibilitychange', refresh);
    window.addEventListener('resize', refresh);
    void document.fonts.ready.then(() => { if (!disposed) refresh(); });
    refresh();
    return () => {
      disposed = true;
      cancel();
      resize.disconnect(); theme.disconnect(); intersection.disconnect();
      reduced.removeEventListener('change', refresh);
      document.removeEventListener('visibilitychange', refresh);
      window.removeEventListener('resize', refresh);
    };
  }, []);
  return <div className="orbital-field" aria-hidden="true"><canvas ref={ref} /></div>;
}

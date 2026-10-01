'use client';

import { useEffect, useRef, useState } from 'react';

import { Icon } from '@/components/Icon';
import { CHAPTERS, READINGS, SENSORS } from '@/lib/content';
import type { SceneApi } from '@/lib/scene';
import { band, clamp01, ease, isMobile, prefersReducedMotion, sectionProgress } from '@/lib/scroll';

function formatReading(value: number, decimals = 0, prefix = '', unit = '') {
  return `${prefix}${value.toFixed(decimals)}${unit}`;
}

/** Tell the preloader the 3D scene has drawn its first frame. */
function announceReady() {
  document.documentElement.dataset.sceneReady = 'true';
  window.dispatchEvent(new Event('agribot:ready'));
}

/** Pinned, scroll-driven 3D story: studio hero, patrol, target, scan, sense, notify, top-view finale. */
export function Story() {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hatchRef = useRef<HTMLDivElement>(null);
  const reticleRef = useRef<HTMLDivElement>(null);
  const bboxRef = useRef<HTMLDivElement>(null);
  const hudRef = useRef<HTMLDivElement>(null);
  const notifyRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const hintRef = useRef<HTMLDivElement>(null);
  const calloutsRef = useRef<HTMLDivElement>(null);
  const linesRef = useRef<SVGSVGElement>(null);
  const chapterRefs = useRef<(HTMLElement | null)[]>([]);
  const counterRefs = useRef<(HTMLElement | null)[]>([]);
  const labelRefs = useRef<(HTMLElement | null)[]>([]);
  const markerRefs = useRef<(HTMLDivElement | null)[]>([]);
  const lineRefs = useRef<(SVGLineElement | null)[]>([]);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const section = sectionRef.current!;
    const canvas = canvasRef.current!;
    let scene: SceneApi | null = null;
    let raf = 0;
    let disposed = false;
    let visible = true;
    let width = 0;
    let height = 0;
    const reduceMotion = prefersReducedMotion();

    const resize = () => {
      width = canvas.clientWidth;
      height = canvas.clientHeight;
      scene?.resize(width, height);
      linesRef.current?.setAttribute('viewBox', `0 0 ${width} ${height}`);
    };
    const observer = new IntersectionObserver(([entry]) => (visible = entry.isIntersecting));
    observer.observe(section);

    // Scroll sets a target; the scene eases towards it every frame so motion stays fluid.
    let current = sectionProgress(section);
    let last = performance.now();
    let first = true;

    const placeCallouts = (p: number, mobile: boolean) => {
      const show = clamp01((p - 0.885) / 0.035);
      calloutsRef.current!.style.opacity = String(show);
      if (show <= 0) return;
      const points = scene!.anchors(width, height);
      const byId = new Map(points.map((pt) => [pt.id, pt]));
      // Balance labels: the four left-most anchors go left, the rest right; each column sorted top to bottom.
      const ordered = SENSORS.map((s, i) => ({ s, i, pt: byId.get(s.id)! })).sort((a, b) => a.pt.x - b.pt.x);
      const columns = [ordered.slice(0, 4), ordered.slice(4)].map((col) => col.sort((a, b) => a.pt.y - b.pt.y));
      const top = height * 0.3;
      const bottom = height * 0.9;
      columns.forEach((col, side) => {
        col.forEach(({ i, pt }, row) => {
          const stagger = clamp01((p - 0.885 - i * 0.004) / 0.03);
          const label = labelRefs.current[i];
          const marker = markerRefs.current[i];
          const line = lineRefs.current[i];
          if (marker) marker.style.transform = `translate(${pt.x}px, ${pt.y}px) scale(${0.4 + 0.6 * ease(stagger)})`;
          if (!label || !line) return;
          if (mobile) {
            label.style.opacity = String(stagger);
            line.style.opacity = '0';
            return;
          }
          const y = top + ((row + 0.5) / col.length) * (bottom - top);
          const labelW = label.offsetWidth;
          const x = side === 0 ? width * 0.05 : width * 0.95 - labelW;
          label.style.opacity = String(stagger);
          label.style.transform = `translate(${x + (1 - ease(stagger)) * (side === 0 ? -24 : 24)}px, ${y - label.offsetHeight / 2}px)`;
          const lx = side === 0 ? x + labelW : x;
          line.setAttribute('x1', String(lx));
          line.setAttribute('y1', String(y));
          line.setAttribute('x2', String(lx + (pt.x - lx) * ease(stagger)));
          line.setAttribute('y2', String(y + (pt.y - y) * ease(stagger)));
          line.style.opacity = String(stagger);
        });
      });
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!scene || !visible) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const target = sectionProgress(section);
      current += (target - current) * (reduceMotion ? 1 : 1 - Math.exp(-dt * 5.5));
      if (Math.abs(target - current) < 0.00005) current = target;
      const p = current;
      const mobile = isMobile();

      scene.update(p, now / 1000);
      if (first) {
        first = false;
        announceReady();
      }
      barRef.current!.style.transform = `scaleX(${p})`;
      hintRef.current!.style.opacity = String(1 - clamp01(p / 0.03));
      // Light studio first (no scrim, dark text), the field with a text scrim, then no scrim for the top view.
      const studio = 1 - clamp01((p - 0.1) / 0.06);
      hatchRef.current!.style.opacity = String(studio);
      pinRef.current!.style.setProperty('--scrim', String((1 - studio) * (1 - clamp01((p - 0.84) / 0.05))));

      CHAPTERS.forEach((ch, i) => {
        const el = chapterRefs.current[i];
        if (!el) return;
        // The first chapter is fully visible at the top; the last stays to the end.
        const o = (ch.start <= 0 ? 1 : clamp01((p - ch.start) / 0.025)) * (ch.end >= 1 ? 1 : clamp01((ch.end - p) / 0.025));
        const shift = (1 - o) * (p < (ch.start + ch.end) / 2 ? 30 : -30);
        el.style.opacity = String(o);
        el.style.transform = ch.top || mobile ? `translateY(${shift}px)` : `translateY(calc(-50% + ${shift}px))`;
      });

      // Target reticle, then a detection box around the diseased plant.
      const r = scene.plantRect(width, height);
      const reticle = reticleRef.current!;
      reticle.style.opacity = String(band(p, 0.345, 0.45, 0.02));
      const pulse = 1 + 0.08 * Math.sin(now / 160);
      reticle.style.transform = `translate(${r.x + r.w / 2}px, ${r.y + r.h / 2}px) scale(${(1.6 - 0.6 * ease(clamp01((p - 0.345) / 0.035))) * pulse})`;
      const bbox = bboxRef.current!;
      const pad = 10;
      bbox.style.opacity = String(band(p, 0.43, 0.565, 0.02));
      bbox.style.transform = `translate(${r.x - pad}px, ${r.y - pad}px)`;
      bbox.style.width = `${r.w + pad * 2}px`;
      bbox.style.height = `${r.h + pad * 2}px`;

      // Sensor readings count up while the probe is in the soil.
      hudRef.current!.style.opacity = String(band(p, 0.585, 0.695, 0.025));
      const count = ease(clamp01((p - 0.59) / 0.04));
      READINGS.forEach((reading, i) => {
        const el = counterRefs.current[i];
        if (el) el.textContent = formatReading(reading.to * count, reading.decimals, reading.prefix, reading.unit);
      });

      // Phone notification slides in, then clears for the top view.
      const no = clamp01((p - 0.71) / 0.035) * (1 - clamp01((p - 0.825) / 0.03));
      const notify = notifyRef.current!;
      notify.style.opacity = String(no);
      notify.style.transform = mobile ? `translate(50%, ${(1 - no) * -20}px) scale(0.78)` : `translate(${(1 - ease(no)) * 60}px, -50%)`;

      placeCallouts(p, mobile);
    };

    (async () => {
      try {
        const { createScene } = await import('@/lib/scene');
        if (disposed) return;
        scene = createScene(canvas, { mobile: isMobile() });
        resize();
        window.addEventListener('resize', resize);
        raf = requestAnimationFrame(frame);
      } catch (error) {
        console.error(error);
        if (!disposed) {
          setFailed(true);
          announceReady();
        }
      }
    })();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      observer.disconnect();
      scene?.dispose();
    };
  }, []);

  return (
    <section id="story" className="story" aria-label="How AgriBot works" ref={sectionRef}>
      <div className="story-pin" ref={pinRef}>
        <canvas id="scene" ref={canvasRef} aria-hidden="true" />
        <div className="studio-hatch" ref={hatchRef} aria-hidden="true" />
        {failed ? <div className="scene-failed">Your browser could not start 3D graphics. Scroll on to see the app.</div> : null}

        <div className="reticle" ref={reticleRef} aria-hidden="true"><i /><i /><i /><i /></div>
        <div className="bbox" ref={bboxRef} aria-hidden="true">
          <span className="bbox-label"><b>Late Blight</b> 86%</span>
        </div>

        <div className="hud" ref={hudRef} aria-hidden="true">
          {READINGS.map((reading, i) => (
            <div className="hud-card" key={reading.label}>
              <span className="icon-circle"><Icon name={reading.icon} /></span>
              <small>{reading.label}</small>
              <strong ref={(el) => { counterRefs.current[i] = el; }}>{formatReading(0, reading.decimals, reading.prefix, reading.unit)}</strong>
            </div>
          ))}
        </div>

        <div className="notify" ref={notifyRef} aria-hidden="true">
          <div className="notify-phone">
            <div className="notify-wall" />
            <div className="notify-time">9:41</div>
            <div className="notify-card">
              <div className="notify-head"><span className="notify-icon" /><b>AgriBot</b><em>now</em></div>
              <p><b>Late Blight detected · Row 3, plant 18</b><br />Soil 42% · 27.8°C · 68% humidity. Remove infected leaves and avoid overhead watering today.</p>
            </div>
            <div className="notify-card faded">
              <div className="notify-head"><span className="notify-icon" /><b>AgriBot</b><em>2h ago</em></div>
              <p>Rows 1–2 scanned. All plants healthy.</p>
            </div>
          </div>
        </div>

        {/* Top-view finale: every sensor labelled. */}
        <div className="callouts" ref={calloutsRef}>
          <svg className="callout-lines" ref={linesRef} aria-hidden="true">
            {SENSORS.map((sensor, i) => <line key={sensor.id} ref={(el) => { lineRefs.current[i] = el; }} />)}
          </svg>
          {SENSORS.map((sensor, i) => (
            <div className="callout-marker" key={`m-${sensor.id}`} ref={(el) => { markerRefs.current[i] = el; }} aria-hidden="true"><span>{i + 1}</span></div>
          ))}
          <ol className="callout-list">
            {SENSORS.map((sensor, i) => (
              <li className="callout" key={sensor.id} ref={(el) => { labelRefs.current[i] = el; }}>
                <span className="callout-num">{i + 1}</span>
                <span><b>{sensor.name}</b><small>{sensor.detail}</small></span>
              </li>
            ))}
          </ol>
        </div>

        <div className="chapters">
          {CHAPTERS.map((ch, i) => {
            const Heading = ch.hero ? 'h1' : 'h2';
            return (
              <article className={`chapter${ch.top ? ' chapter-top' : ''}${ch.hero ? ' chapter-hero' : ''}`} key={ch.eyebrow} ref={(el) => { chapterRefs.current[i] = el; }}>
                <p className="eyebrow">{ch.eyebrow}</p>
                <Heading>{ch.title}{ch.accent ? <> <span>{ch.accent}</span></> : null}</Heading>
                <p className={ch.hero ? 'lede' : undefined}>{ch.body}</p>
              </article>
            );
          })}
        </div>

        <div className="progress" aria-hidden="true"><span ref={barRef} /></div>
        <div className="scroll-hint" ref={hintRef} aria-hidden="true">Scroll</div>
      </div>
    </section>
  );
}

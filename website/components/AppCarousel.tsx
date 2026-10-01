'use client';

import { useEffect, useRef, useState, type CSSProperties } from 'react';

import { SCREENS } from '@/lib/content';
import { isMobile, prefersReducedMotion, sectionProgress } from '@/lib/scroll';

function StatusIcons() {
  return (
    <span className="sb-icons">
      <svg viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1" /><rect x="5" y="5" width="3" height="7" rx="1" /><rect x="10" y="2.5" width="3" height="9.5" rx="1" /><rect x="15" y="0" width="3" height="12" rx="1" /></svg>
      <svg viewBox="0 0 16 12"><path d="M8 2.2c2.3 0 4.4.9 6 2.4l1.3-1.4A10.4 10.4 0 008 .2 10.4 10.4 0 00.7 3.2L2 4.6a8.4 8.4 0 016-2.4zm0 3.9c1.3 0 2.5.5 3.4 1.3l1.3-1.4A6.8 6.8 0 008 4.1c-1.8 0-3.4.7-4.7 1.9l1.3 1.4C5.5 6.6 6.7 6.1 8 6.1zM8 12l2.3-2.4a3.3 3.3 0 00-4.6 0z" /></svg>
      <svg viewBox="0 0 27 12"><rect x="0.5" y="0.5" width="23" height="11" rx="3.5" fill="none" stroke="currentColor" opacity=".4" /><rect x="2" y="2" width="20" height="8" rx="2" /><rect x="24.5" y="4" width="1.8" height="4" rx="0.9" opacity=".4" /></svg>
    </span>
  );
}

// Three copies form a ring, so there are always screens on both sides and the
// wrap-around jump happens far off-screen: the carousel feels endless.
const COPIES = 3;
const SLOTS = SCREENS.length * COPIES;

/** Horizontal offset for a card |a| steps from centre, in card widths: near neighbours close, far ones tucked behind. */
function offsetFor(a: number) {
  return a <= 1 ? a * 1.08 : 1.08 + (a - 1) * 0.55;
}

/** Signed distance from slot to the current position on a ring of SLOTS. */
function ringDistance(slot: number, current: number) {
  let d = (slot - current) % SLOTS;
  if (d < -SLOTS / 2) d += SLOTS;
  if (d >= SLOTS / 2) d -= SLOTS;
  return d;
}

/** Vertical scroll moves an endless ring of app screens sideways; the pin releases after the last screen. */
export function AppCarousel() {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const [active, setActive] = useState(0);

  /** Scrolls the page to the position where screen `index` is centred. */
  const goTo = (index: number) => {
    const section = sectionRef.current;
    if (!section) return;
    const clamped = Math.max(0, Math.min(SCREENS.length - 1, index));
    const top = section.getBoundingClientRect().top + window.scrollY;
    const span = section.offsetHeight - window.innerHeight;
    window.scrollTo({ top: top + (clamped / (SCREENS.length - 1)) * span + 1, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
  };

  useEffect(() => {
    const section = sectionRef.current!;
    const track = trackRef.current!;
    const reduceMotion = prefersReducedMotion();
    let cardW = 260;
    let current = 0;
    let shown = 0;
    let raf = 0;

    const layout = () => {
      const mobile = isMobile();
      cardW = Math.min(mobile ? window.innerWidth * 0.66 : 400, window.innerHeight * 0.635 * (390 / 844));
      track.style.setProperty('--card-w', `${cardW}px`);
      // Same scroll logic as before: a little under one viewport of scroll per screen.
      section.style.height = `${100 + (SCREENS.length - 1) * 85}vh`;
    };
    layout();
    window.addEventListener('resize', layout);

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const target = sectionProgress(section) * (SCREENS.length - 1);
      current += (target - current) * (reduceMotion ? 1 : 0.14);
      const center = track.clientWidth / 2 - cardW / 2;
      cardRefs.current.forEach((card, slot) => {
        if (!card) return;
        const d = ringDistance(slot, current);
        const a = Math.abs(d);
        if (a > 2.9) {
          card.style.visibility = 'hidden';
          return;
        }
        card.style.visibility = 'visible';
        const scale = 1 - Math.min(a, 1) * 0.24 - Math.max(0, Math.min(a - 1, 1)) * 0.1;
        const x = center + Math.sign(d) * offsetFor(a) * cardW;
        card.style.transform = `translate3d(${x}px, 0, 0) scale(${scale})`;
        // Only the centred screen is sharp, with a dark device frame and side buttons;
        // neighbours are blurred light silhouettes, fading out at the far edge.
        card.style.filter = a < 0.02 ? 'none' : `blur(${Math.min(a, 2) * 3.6}px)`;
        card.style.opacity = String(1 - Math.max(0, a - 2) * 1.1);
        card.style.zIndex = String(100 - Math.round(a * 10));
        const centred = a < 0.5;
        card.style.setProperty('--frame', centred ? '#1c2420' : '#ffffff');
        card.style.setProperty('--buttons', centred ? '1' : '0');
      });
      const next = ((Math.round(current) % SCREENS.length) + SCREENS.length) % SCREENS.length;
      if (next !== shown) {
        shown = next;
        setActive(next);
      }
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', layout);
    };
  }, []);

  return (
    <section id="app" className="app" aria-label="The AgriBot app" ref={sectionRef}>
      <div className="app-pin">
        <div className="app-head">
          <h2>Your whole field, in your pocket.</h2>
        </div>
        <div className="carousel">
          <div className="track" ref={trackRef}>
            {Array.from({ length: SLOTS }, (_, slot) => {
              const screen = SCREENS[slot % SCREENS.length];
              const isPrimaryCopy = slot < SCREENS.length;
              return (
                <figure
                  className="screen"
                  key={slot}
                  ref={(el) => { cardRefs.current[slot] = el; }}
                  style={{ '--bar': screen.bar } as CSSProperties}
                  aria-hidden={isPrimaryCopy ? undefined : true}
                >
                  <div className="screen-inner">
                    <div className="statusbar" aria-hidden="true">
                      <span>9:41</span>
                      <i className="island" />
                      <StatusIcons />
                    </div>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={screen.src} alt={isPrimaryCopy ? `AgriBot app: ${screen.title}` : ''} loading={slot < 2 ? 'eager' : 'lazy'} decoding="async" />
                  </div>
                </figure>
              );
            })}
          </div>
        </div>
        <p className="carousel-caption" aria-live="polite">
          <b>{SCREENS[active].title}</b>
          <span>{SCREENS[active].text}</span>
        </p>
        <div className="carousel-controls">
          <button type="button" className="carousel-arrow" aria-label="Previous screen" disabled={active === 0} onClick={() => goTo(active - 1)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
          </button>
          <div className="dots">
            {SCREENS.map((screen, i) => (
              <button type="button" key={screen.src} className={i === active ? 'on' : undefined} aria-label={`Show ${screen.title}`} aria-current={i === active || undefined} onClick={() => goTo(i)} />
            ))}
          </div>
          <button type="button" className="carousel-arrow" aria-label="Next screen" disabled={active === SCREENS.length - 1} onClick={() => goTo(active + 1)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
          </button>
        </div>
      </div>
    </section>
  );
}

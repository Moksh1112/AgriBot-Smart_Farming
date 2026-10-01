'use client';

import { useEffect, useState } from 'react';

import { LeafIcon } from '@/components/Nav';

const MIN_VISIBLE_MS = 900;
const MAX_WAIT_MS = 12000;

/**
 * Branded loading screen in the app's forest/mint style. Shows on first load until the
 * 3D scene has drawn and fonts are ready, and again whenever the visitor follows a link
 * that leaves the page (redirects, downloads in the same tab, external links).
 */
export function Preloader() {
  const [state, setState] = useState<'loading' | 'leaving' | 'hidden'>('loading');
  const [progress, setProgress] = useState(0.08);

  useEffect(() => {
    const started = performance.now();
    let done = false;
    let tick = 0;

    // Ease the bar towards 90% while waiting; it completes when everything is ready.
    const grow = () => {
      setProgress((value) => (done ? value : value + (0.9 - value) * 0.06));
      tick = window.setTimeout(grow, 120);
    };
    grow();

    const finish = () => {
      if (done) return;
      done = true;
      setProgress(1);
      const wait = Math.max(0, MIN_VISIBLE_MS - (performance.now() - started));
      window.setTimeout(() => {
        setState('hidden');
        document.documentElement.dataset.ready = 'true';
      }, wait + 250);
    };

    const sceneReady = new Promise<void>((resolve) => {
      if (document.documentElement.dataset.sceneReady === 'true') resolve();
      else window.addEventListener('agribot:ready', () => resolve(), { once: true });
    });
    Promise.all([sceneReady, document.fonts.ready]).then(finish);
    const fallback = window.setTimeout(finish, MAX_WAIT_MS);

    // Leaving the page: show the loader immediately so the redirect never flashes a blank page.
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = (event.target as Element | null)?.closest?.('a');
      if (!link || link.target === '_blank' || link.hasAttribute('download') || link.getAttribute('aria-disabled') === 'true') return;
      const href = link.getAttribute('href') ?? '';
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      setProgress(0.15);
      setState('leaving');
    };
    // Coming back through the browser's back/forward cache: hide it again.
    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) setState('hidden');
    };
    document.addEventListener('click', onClick);
    window.addEventListener('pageshow', onPageShow);

    return () => {
      window.clearTimeout(tick);
      window.clearTimeout(fallback);
      document.removeEventListener('click', onClick);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, []);

  return (
    <div className={`preloader${state === 'hidden' ? ' is-hidden' : ''}`} role="status" aria-live="polite" aria-hidden={state === 'hidden'}>
      <div className="preloader-inner">
        <div className="preloader-mark">
          <span className="preloader-ring" />
          <span className="preloader-leaf"><LeafIcon /></span>
        </div>
        <p className="preloader-name">AgriBot</p>
        <p className="preloader-text">{state === 'leaving' ? 'Taking you there…' : 'Preparing the field…'}</p>
        <div className="preloader-bar"><span style={{ transform: `scaleX(${progress})` }} /></div>
      </div>
    </div>
  );
}

import type { IconName } from '@/lib/content';

// Material-style glyphs matching the Flutter app's metric chips.
const PATHS: Record<IconName, string> = {
  water: 'M12 2.7c-.3 0-.6.1-.8.4C9 6 5.5 10.6 5.5 14.5a6.5 6.5 0 0013 0c0-3.9-3.5-8.5-5.7-11.4a1 1 0 00-.8-.4z',
  thermometer: 'M15 13V5a3 3 0 00-6 0v8a5 5 0 106 0zm-3-9a1 1 0 011 1v3h-2V5a1 1 0 011-1z',
  cloud: 'M19.4 10.1A7 7 0 006.3 8.1 5.5 5.5 0 006.5 19h12.3a4.5 4.5 0 00.6-8.9z',
  flask: 'M9 2v2h1v5.4L4.6 18.5A2.3 2.3 0 006.6 22h10.8a2.3 2.3 0 002-3.5L14 9.4V4h1V2H9zm3 9.2l2.9 4.8H9.1l2.9-4.8z',
};

export function Icon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="icon">
      <path d={PATHS[name]} />
    </svg>
  );
}

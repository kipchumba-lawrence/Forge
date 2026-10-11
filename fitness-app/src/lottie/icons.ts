import { buildIconAnimation, type IconDef } from './svgToLottie';

// Geometry copied from the Cut Plan design's 24×24 SVG icons (1.8 stroke,
// round caps). The Fuel-screen icons, which the design doesn't include, are
// drawn on the same grid and stroke so they sit in the same family.
const ICONS = {
  // Tab bar
  home:      { parts: [{ path: 'M3 11l9-7 9 7' }, { path: 'M5 10v10h14V10' }] },
  plan:      { parts: [{ rect: [3, 5, 18, 16, 3] }, { path: 'M3 10h18M8 3v4M16 3v4' }] },
  play:      { parts: [{ path: 'M8 5l11 7-11 7z' }], strokeWidth: 2.2 },
  stats:     { parts: [{ path: 'M5 20V11M10 20V5M15 20v-8M20 20v-5' }] },
  exercises: { parts: [{ path: 'M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12' }] },

  // Home
  settings:  { parts: [{ circle: [12, 12, 3] }, { path: 'M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1L7 17M17 7l2.1-2.1' }] },
  chevronLeft:  { parts: [{ path: 'M15 5l-7 7 7 7' }] },
  chevronRight: { parts: [{ path: 'M9 5l7 7-7 7' }] },
  flame:     { parts: [{ path: 'M12 3c1 4 6 6 6 11a6 6 0 0 1-12 0c0-3 2-4 2-7 2 1 3 3 3 5 1-2 1-5 1-9z' }] },
  swap:      { parts: [{ path: 'M4 8h14l-3-3M20 16H6l3 3' }] },
  target:    { parts: [{ circle: [12, 12, 8] }, { circle: [12, 12, 4] }, { circle: [12, 12, 0.5] }] },
  plus:      { parts: [{ path: 'M12 5v14M5 12h14' }] },
  minus:     { parts: [{ path: 'M5 12h14' }] },

  // Fuel
  utensils:  { parts: [{ path: 'M5 3v4a2 2 0 0 0 4 0V3M7 3v18' }, { path: 'M17 21V3c-2 1-3 3.5-3 6.5V13h3' }] },
  camera:    { parts: [{ rect: [3, 7, 18, 13, 3] }, { path: 'M8 7l2-3h4l2 3' }, { circle: [12, 13.5, 3.5] }] },
  image:     { parts: [{ rect: [3, 4, 18, 16, 3] }, { circle: [9, 10, 1.5] }, { path: 'M21 16l-5-5-9 9' }] },
  sparkle:   { parts: [{ path: 'M11 4l1.8 5.2L18 11l-5.2 1.8L11 18l-1.8-5.2L4 11l5.2-1.8z' }, { path: 'M19 3v4M17 5h4' }] },
  pencil:    { parts: [{ path: 'M4 20h4L19 9l-4-4L4 16z' }, { path: 'M13 7l4 4' }] },
  check:     { parts: [{ path: 'M5 12l5 5 9-10' }] },
  close:     { parts: [{ path: 'M6 6l12 12M18 6L6 18' }] },
  trash:     { parts: [{ path: 'M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13' }] },
  refresh:   { parts: [{ path: 'M20 11a8 8 0 1 0-2.3 5.7' }, { path: 'M20 4v7h-7' }] },

  // Settings (geometry from the design's settings screens)
  search:    { parts: [{ circle: [11, 11, 6] }, { path: 'M20 20l-4.5-4.5' }] },
  palette:   { parts: [{ path: 'M12 3a9 9 0 0 0 0 18c1.5 0 2-1 2-2s-1-2 0-3h3a4 4 0 0 0 4-4c0-5-4-9-9-9z' }, { circle: [8, 10, 1] }, { circle: [12, 7, 1] }, { circle: [16, 10, 1] }] },
  folder:    { parts: [{ path: 'M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' }] },
  info:      { parts: [{ circle: [12, 12, 9] }, { path: 'M12 11v6M12 7.5v.5' }] },
  timer:     { parts: [{ circle: [12, 13, 8] }, { path: 'M12 9v4l2 2M9 2h6' }] },
  trend:     { parts: [{ path: 'M4 18l6-6 4 4 6-8' }] },
  history:   { parts: [{ path: 'M4 12a8 8 0 1 0 3-6.2M4 4v4h4M12 8v4l3 2' }] },
  moon:      { parts: [{ path: 'M20 14A8 8 0 1 1 10 4a6 6 0 0 0 10 10z' }] },
  person:    { parts: [{ circle: [12, 9, 4] }, { path: 'M4 21a8 8 0 0 1 16 0' }] },
  scale:     { parts: [{ path: 'M12 4v16M5 8h14M5 8l-2 6a3 3 0 0 0 4 0zM19 8l-2 6a3 3 0 0 0 4 0z' }] },
  qr:        { parts: [{ rect: [4, 4, 6, 6] }, { rect: [14, 4, 6, 6] }, { rect: [4, 14, 6, 6] }, { path: 'M14 14h2v2h-2zM18 18h2v2h-2zM14 18h2' }] },
  download:  { parts: [{ path: 'M12 4v11M7 10l5 5 5-5M5 20h14' }] },
  upload:    { parts: [{ path: 'M12 20V9M7 14l5-5 5 5M5 4h14' }] },
  reset:     { parts: [{ path: 'M4 12a8 8 0 1 0 2.3-5.7M4 4v5h5' }] },
  share:     { parts: [{ path: 'M12 3v12M7 8l5-5 5 5M5 14v6h14v-6' }] },

  // Stats & history
  trophy:    { parts: [{ path: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H4a3 3 0 0 0 4 4M16 6h4a3 3 0 0 1-4 4M12 13v4M8 20h8' }] },
  chevronDown: { parts: [{ path: 'M6 9l6 6 6-6' }] },
  copy:      { parts: [{ rect: [8, 8, 12, 13, 2] }, { path: 'M5 16V5a2 2 0 0 1 2-2h9' }] },
  save:      { parts: [{ path: 'M6 4h12v17l-6-4-6 4z' }] },

  // Workout
  link:      { parts: [{ path: 'M10 14a4 4 0 0 0 6 0l3-3a4 4 0 0 0-6-6l-1 1M14 10a4 4 0 0 0-6 0l-3 3a4 4 0 0 0 6 6l1-1' }] },
  more:      { parts: [{ circle: [5, 12, 1] }, { circle: [12, 12, 1] }, { circle: [19, 12, 1] }] },
  arrowUp:   { parts: [{ path: 'M6 15l6-6 6 6' }] }
} satisfies Record<string, IconDef>;

export type IconName = keyof typeof ICONS;

// Animations are built once per icon and shared by every instance.
const cache = new Map<IconName, object>();
export function iconAnimation(name: IconName) {
  let data = cache.get(name);
  if (!data) {
    data = buildIconAnimation(ICONS[name] as IconDef);
    cache.set(name, data);
  }
  return data;
}

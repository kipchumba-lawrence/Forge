import { watch } from 'vue';
import { useSettings } from '@/data/useSettings';
import type { AccentColor, ThemeMode } from '@/db/models/AppSetting.model';

// The design's eight accents. Dark values are the design's own; light values
// are darkened so text and icons on the cream background keep 4.5:1 contrast.
export const ACCENTS: Record<AccentColor, { label: string; dark: [string, string]; light: [string, string] }> = {
  green:  { label: 'Green',  dark: ['#8FB569', '143, 181, 105'], light: ['#4C7A2B', '76, 122, 43'] },
  blue:   { label: 'Blue',   dark: ['#7FA8C9', '127, 168, 201'], light: ['#3F6E93', '63, 110, 147'] },
  amber:  { label: 'Amber',  dark: ['#E8A33D', '232, 163, 61'],  light: ['#A6670F', '166, 103, 15'] },
  violet: { label: 'Violet', dark: ['#B58BD6', '181, 139, 214'], light: ['#7A4FA8', '122, 79, 168'] },
  pink:   { label: 'Pink',   dark: ['#E07A8C', '224, 122, 140'], light: ['#B23A55', '178, 58, 85'] },
  coral:  { label: 'Coral',  dark: ['#E0866A', '224, 134, 106'], light: ['#B04A2E', '176, 74, 46'] },
  teal:   { label: 'Teal',   dark: ['#77C1C9', '119, 193, 201'], light: ['#2F7E87', '47, 126, 135'] },
  yellow: { label: 'Yellow', dark: ['#E6CF5A', '230, 207, 90'],  light: ['#8A7410', '138, 116, 16'] }
};

const media = window.matchMedia('(prefers-color-scheme: light)');

function resolve(mode: ThemeMode): 'dark' | 'light' {
  if (mode === 'system') return media.matches ? 'light' : 'dark';
  return mode;
}

function apply(mode: ThemeMode, accent: AccentColor) {
  const scheme = resolve(mode);
  const root = document.documentElement;
  root.dataset.theme = scheme;
  root.style.colorScheme = scheme;

  // Settings saved before the palette changed may name a retired accent.
  const [hex, rgb] = (ACCENTS[accent] ?? ACCENTS.green)[scheme];
  root.style.setProperty('--primary', hex);
  root.style.setProperty('--primary-rgb', rgb);

  // Tint the iOS status bar / browser chrome to the page background.
  const bg = getComputedStyle(root).getPropertyValue('--bg-color').trim();
  let meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'theme-color';
    document.head.appendChild(meta);
  }
  meta.content = bg;
}

// Call once at startup, before mounting, so the first paint is already themed.
export async function initTheme() {
  const { settings, ensureLoaded } = useSettings();
  await ensureLoaded();
  watch(() => [settings.theme, settings.accent] as const, ([mode, accent]) => apply(mode, accent), { immediate: true });
  media.addEventListener('change', () => {
    if (settings.theme === 'system') apply(settings.theme, settings.accent);
  });
}

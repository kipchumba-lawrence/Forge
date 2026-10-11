import { animation, group, layer } from './builder';

// Hand-built Lottie animations used beyond plain icons. Each documents the
// frame ranges LottiePlayer needs to drive it.

const HEART = 'M12 20.5s-7.5-4.6-7.5-10.1A4.4 4.4 0 0 1 12 7.6a4.4 4.4 0 0 1 7.5 2.8c0 5.5-7.5 10.1-7.5 10.1z';
const DUMBBELL = 'M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12';

// Favourite. Frame 0 = outline (not a favourite); last frame = filled.
// Playing 0→end: squash, fill in, overshoot, and six sparks fly outward.
function heartBurst() {
  const sparks = [0, 60, 120, 180, 240, 300].map(angle =>
    layer([group([{ path: 'M12 4.6V3' }], { strokeWidth: 1.6 })], {
      rotation: angle,
      opacity: [{ t: 0, s: 0 }, { t: 9, s: 0 }, { t: 10, s: 100 }, { t: 30, s: 0 }],
      scale: [{ t: 9, s: [55, 55] }, { t: 30, s: [150, 150] }]
    })
  );
  const heart = layer(
    [group([{ path: HEART }], { fillOpacity: [{ t: 0, s: 0 }, { t: 5, s: 0 }, { t: 12, s: 100 }] })],
    { scale: [{ t: 0, s: [100, 100] }, { t: 6, s: [72, 72] }, { t: 17, s: [118, 118] }, { t: 28, s: [100, 100] }] }
  );
  return animation([heart, ...sparks], 36);
}

// Loading: a dumbbell being lifted, with its shadow shrinking. Loops 0→end.
function liftLoader() {
  const bar = layer([group([{ path: DUMBBELL }], { strokeWidth: 1.9 })], {
    position: [{ t: 0, s: [12, 13] }, { t: 22, s: [12, 8.5] }, { t: 34, s: [12, 8.5] }, { t: 56, s: [12, 13] }, { t: 64, s: [12, 13] }],
    rotation: [{ t: 0, s: 0 }, { t: 22, s: -6 }, { t: 34, s: 6 }, { t: 56, s: 0 }, { t: 64, s: 0 }],
    scale: [{ t: 0, s: [100, 100] }, { t: 56, s: [100, 100] }, { t: 59, s: [106, 94] }, { t: 64, s: [100, 100] }]
  });
  const shadow = layer([group([{ path: 'M7.5 21h9' }], { strokeWidth: 1.6 })], {
    opacity: [{ t: 0, s: 60 }, { t: 22, s: 25 }, { t: 34, s: 25 }, { t: 56, s: 60 }, { t: 64, s: 60 }],
    scale: [{ t: 0, s: [100, 100] }, { t: 22, s: [60, 100] }, { t: 34, s: [60, 100] }, { t: 56, s: [100, 100] }, { t: 64, s: [100, 100] }],
    anchor: [12, 21], position: [12, 21]
  });
  return animation([bar, shadow], 64);
}

// Empty search: a magnifier sweeping back and forth. Loops 0→end.
function searchSweep() {
  const glass = layer([group([{ circle: [10.5, 10.5, 5.5] }, { path: 'M14.6 14.6L19 19' }])], {
    position: [{ t: 0, s: [10, 12] }, { t: 40, s: [14, 11] }, { t: 80, s: [10, 12] }],
    rotation: [{ t: 0, s: -8 }, { t: 40, s: 8 }, { t: 80, s: -8 }]
  });
  const dots = [7, 12, 17].map((x, i) =>
    layer([group([{ circle: [x, 20.5, 0.6] }], { fillOpacity: 100 })], {
      opacity: [{ t: 0, s: 25 }, { t: 15 + i * 12, s: 100 }, { t: 35 + i * 12, s: 25 }, { t: 80, s: 25 }]
    })
  );
  return animation([glass, ...dots], 80);
}

// Success: ring draws, then the tick, then a small pop. Plays once.
function successCheck() {
  const ring = layer([group([{ circle: [12, 12, 9] }], { trimEnd: [{ t: 0, s: 0 }, { t: 18, s: 100 }] })], {
    rotation: -90,
    scale: [{ t: 0, s: [100, 100] }, { t: 26, s: [100, 100] }, { t: 32, s: [110, 110] }, { t: 40, s: [100, 100] }]
  });
  const tick = layer([group([{ path: 'M8 12.5l2.8 2.8L16.5 9.5' }], { strokeWidth: 2, trimEnd: [{ t: 0, s: 0 }, { t: 12, s: 0 }, { t: 28, s: 100 }] })], {
    scale: [{ t: 0, s: [100, 100] }, { t: 26, s: [100, 100] }, { t: 32, s: [110, 110] }, { t: 40, s: [100, 100] }]
  });
  return animation([tick, ring], 42);
}

// Celebration (PRs, finishing a workout): the trophy drops in with a bounce
// while confetti bursts outward and tumbles. Plays once.
function trophyBurst() {
  const trophy = layer([group([{ path: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H4a3 3 0 0 0 4 4M16 6h4a3 3 0 0 1-4 4M12 13v4M8 20h8' }], { strokeWidth: 1.7 })], {
    position: [{ t: 0, s: [12, 2] }, { t: 14, s: [12, 13] }, { t: 22, s: [12, 11.5] }, { t: 30, s: [12, 12] }],
    scale: [{ t: 0, s: [40, 40] }, { t: 14, s: [112, 88] }, { t: 22, s: [94, 106] }, { t: 30, s: [100, 100] }]
  });
  // Ten pieces at staggered angles and distances; alternating shapes.
  const confetti = Array.from({ length: 10 }, (_, i) => {
    const angle = i * 36 + (i % 2 ? 12 : 0);
    const piece = i % 3 === 0 ? { circle: [12, 6.2, 0.7] as [number, number, number] } : { path: 'M12 5.4v1.8' };
    const start = 8 + (i % 4) * 2;
    return layer([group([piece], { strokeWidth: 1.4, ...(i % 3 === 0 ? { fillOpacity: 100 } : {}) })], {
      rotation: [{ t: start, s: angle }, { t: start + 34, s: angle + (i % 2 ? 40 : -40) }],
      opacity: [{ t: 0, s: 0 }, { t: start, s: 0 }, { t: start + 1, s: 100 }, { t: start + 26, s: 100 }, { t: start + 34, s: 0 }],
      scale: [{ t: start, s: [60, 60] }, { t: start + 34, s: [175 + (i % 3) * 15, 175 + (i % 3) * 15] }]
    });
  });
  return animation([trophy, ...confetti], 54);
}

const BUILDERS = { heartBurst, liftLoader, searchSweep, successCheck, trophyBurst };
export type AnimationName = keyof typeof BUILDERS;

const cache = new Map<AnimationName, object>();
export function getAnimation(name: AnimationName) {
  let data = cache.get(name);
  if (!data) {
    data = BUILDERS[name]();
    cache.set(name, data);
  }
  return data;
}

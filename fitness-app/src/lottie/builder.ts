// Small helpers for composing multi-layer Lottie animations by hand, on the
// same 24×24 grid and stroke style as the icons. Colours baked in here are
// placeholders: LottiePlayer repaints strokes/fills with currentColor.

import { parsePath, type IconPart } from './svgToLottie';

type Json = Record<string, unknown>;
export interface Key<T> { t: number; s: T }

const still = (k: unknown) => ({ a: 0, k });
const EASE_1 = { i: { x: [0.3], y: [1] }, o: { x: [0.5], y: [0] } };
const EASE_3 = { i: { x: [0.3, 0.3, 0.3], y: [1, 1, 1] }, o: { x: [0.5, 0.5, 0.5], y: [0, 0, 0] } };

// Animated property from keyframes; a single keyframe is a still value.
function prop<T extends number | number[]>(keys: Key<T>[] | T, dims: 1 | 3 = 1): Json {
  if (!Array.isArray(keys) || (keys.length && typeof keys[0] === 'number')) return still(keys);
  const list = keys as Key<T>[];
  if (list.length === 1) return still(list[0].s);
  const ease = dims === 3 ? EASE_3 : EASE_1;
  return {
    a: 1,
    k: list.map((kf, i) => {
      const s = Array.isArray(kf.s) ? kf.s : [kf.s];
      return i === list.length - 1 ? { t: kf.t, s } : { t: kf.t, s, ...ease };
    })
  };
}

function shapesFor(part: IconPart): Json[] {
  if ('path' in part) return parsePath(part.path).map(s => ({ ty: 'sh', ks: still({ v: s.v, i: s.i, o: s.o, c: s.c }) }));
  if ('rect' in part) {
    const [x, y, w, h, rx = 0] = part.rect;
    return [{ ty: 'rc', d: 1, p: still([x + w / 2, y + h / 2]), s: still([w, h]), r: still(rx) }];
  }
  const [cx, cy, r] = part.circle;
  return [{ ty: 'el', d: 1, p: still([cx, cy]), s: still([r * 2, r * 2]) }];
}

export interface GroupOpts {
  strokeWidth?: number;
  stroke?: boolean;                 // default true
  fillOpacity?: Key<number>[] | number;   // 0–100; omit for no fill
  trimEnd?: Key<number>[];          // 0–100, draws the strokes in
}

// One group of shapes with its own stroke / fill / trim.
export function group(parts: IconPart[], opts: GroupOpts = {}): Json {
  const white = still([1, 1, 1, 1]);
  return {
    ty: 'gr',
    it: [
      ...parts.flatMap(shapesFor),
      ...(opts.trimEnd ? [{ ty: 'tm', m: 1, s: still(0), o: still(0), e: prop(opts.trimEnd) }] : []),
      ...(opts.fillOpacity !== undefined ? [{ ty: 'fl', c: white, o: prop(opts.fillOpacity), r: 1 }] : []),
      ...(opts.stroke === false ? [] : [{ ty: 'st', c: white, o: still(100), w: still(opts.strokeWidth ?? 1.8), lc: 2, lj: 2, ml: 4 }]),
      { ty: 'tr', p: still([0, 0]), a: still([0, 0]), s: still([100, 100]), r: still(0), o: still(100), sk: still(0), sa: still(0) }
    ]
  };
}

export interface LayerOpts {
  position?: Key<number[]>[] | number[];   // [x, y]; default centre
  anchor?: number[];                       // default centre
  scale?: Key<number[]>[] | number[];      // [sx, sy] percent
  rotation?: Key<number>[] | number;       // degrees
  opacity?: Key<number>[] | number;        // 0–100
}

const isKeys = (v: unknown): v is Key<number[]>[] => Array.isArray(v) && typeof v[0] === 'object';

export function layer(groups: Json[], opts: LayerOpts = {}): Json {
  const pos = opts.position ?? [12, 12];
  const scale = opts.scale ?? [100, 100];
  return {
    ddd: 0, ty: 4, sr: 1, ao: 0, bm: 0, st: 0, ip: 0, op: 9999,
    ks: {
      o: prop(opts.opacity ?? 100),
      r: prop(opts.rotation ?? 0),
      p: isKeys(pos) ? prop(pos.map(k => ({ t: k.t, s: [k.s[0], k.s[1], 0] })), 3) : still([pos[0], pos[1], 0]),
      a: still([...(opts.anchor ?? [12, 12]), 0]),
      s: isKeys(scale) ? prop(scale.map(k => ({ t: k.t, s: [k.s[0], k.s[1], 100] })), 3) : still([scale[0], scale[1], 100])
    },
    shapes: groups
  };
}

// Wraps layers into a complete animation. Layers are listed top-most first.
export function animation(layers: Json[], frames: number, fps = 60): Json {
  return {
    v: '5.7.4', fr: fps, ip: 0, op: frames, w: 24, h: 24, nm: 'forge', ddd: 0, assets: [],
    layers: layers.map((l, i) => ({ ...l, ind: i + 1, op: frames }))
  };
}

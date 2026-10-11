// Builds Lottie animations from 24×24 stroke icons written as SVG primitives,
// so the icons stay pixel-identical to the design's SVGs while animating
// through lottie-web.
//
// Each icon gets two segments on one timeline:
//   0 → DRAW_END   "draw": strokes trace themselves in (trim path 0→100%)
//   POP_START → end "pop": a quick squash-and-settle used on tap/activate
// The stroke colour baked into the JSON is irrelevant: LottieIcon.vue forces
// stroke to currentColor so icons follow the theme like the SVGs did.

export type IconPart =
  | { path: string }
  | { rect: [x: number, y: number, w: number, h: number, rx?: number] }
  | { circle: [cx: number, cy: number, r: number] };

export interface IconDef {
  parts: IconPart[];
  strokeWidth?: number;
  fill?: boolean;      // filled glyphs (e.g. the play triangle) draw with fill too
}

export const FPS = 60;
export const DRAW_END = 28;
export const POP_START = 30;
export const POP_END = 54;

type Pt = [number, number];
interface Sub { v: Pt[]; i: Pt[]; o: Pt[]; c: boolean }

const sub = (a: Pt, b: Pt): Pt => [a[0] - b[0], a[1] - b[1]];

// ---------- SVG path parsing (M L H V C S Q A Z, absolute + relative) ----------

function tokenize(d: string) {
  return d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
}

// Arc → cubic Béziers (SVG spec F.6 endpoint-to-centre conversion).
function arcToCubics(p0: Pt, rx: number, ry: number, phiDeg: number, large: number, sweep: number, p: Pt): [Pt, Pt, Pt][] {
  if (rx === 0 || ry === 0) return [[p0, p, p]];
  const phi = (phiDeg * Math.PI) / 180;
  const cos = Math.cos(phi), sin = Math.sin(phi);
  const dx = (p0[0] - p[0]) / 2, dy = (p0[1] - p[1]) / 2;
  const x1 = cos * dx + sin * dy, y1 = -sin * dx + cos * dy;
  rx = Math.abs(rx); ry = Math.abs(ry);
  const lambda = (x1 * x1) / (rx * rx) + (y1 * y1) / (ry * ry);
  if (lambda > 1) { rx *= Math.sqrt(lambda); ry *= Math.sqrt(lambda); }
  const num = rx * rx * ry * ry - rx * rx * y1 * y1 - ry * ry * x1 * x1;
  const den = rx * rx * y1 * y1 + ry * ry * x1 * x1;
  const coef = (large === sweep ? -1 : 1) * Math.sqrt(Math.max(0, num / den));
  const cx1 = coef * ((rx * y1) / ry), cy1 = coef * (-(ry * x1) / rx);
  const cx = cos * cx1 - sin * cy1 + (p0[0] + p[0]) / 2;
  const cy = sin * cx1 + cos * cy1 + (p0[1] + p[1]) / 2;
  const ang = (ux: number, uy: number, vx: number, vy: number) => {
    const a = Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy);
    return a;
  };
  const t1 = ang(1, 0, (x1 - cx1) / rx, (y1 - cy1) / ry);
  let dt = ang((x1 - cx1) / rx, (y1 - cy1) / ry, (-x1 - cx1) / rx, (-y1 - cy1) / ry);
  if (!sweep && dt > 0) dt -= 2 * Math.PI;
  if (sweep && dt < 0) dt += 2 * Math.PI;
  const segs = Math.ceil(Math.abs(dt) / (Math.PI / 2));
  const step = dt / segs;
  const k = (4 / 3) * Math.tan(step / 4);
  const point = (t: number): Pt => [cx + rx * Math.cos(t) * cos - ry * Math.sin(t) * sin, cy + rx * Math.cos(t) * sin + ry * Math.sin(t) * cos];
  const deriv = (t: number): Pt => [-rx * Math.sin(t) * cos - ry * Math.cos(t) * sin, -rx * Math.sin(t) * sin + ry * Math.cos(t) * cos];
  const out: [Pt, Pt, Pt][] = [];
  for (let s = 0; s < segs; s++) {
    const a = t1 + s * step, b = a + step;
    const pa = point(a), pb = point(b), da = deriv(a), db = deriv(b);
    out.push([[pa[0] + k * da[0], pa[1] + k * da[1]], [pb[0] - k * db[0], pb[1] - k * db[1]], pb]);
  }
  return out;
}

export function parsePath(d: string): Sub[] {
  const t = tokenize(d);
  const subs: Sub[] = [];
  let cur: Sub | null = null;
  let pos: Pt = [0, 0], start: Pt = [0, 0], lastCtrl: Pt | null = null, cmd = '';
  let i = 0;
  const num = () => parseFloat(t[i++]);

  const moveTo = (p: Pt) => {
    cur = { v: [p], i: [[0, 0]], o: [[0, 0]], c: false };
    subs.push(cur);
    pos = start = p;
  };
  const cubicTo = (c1: Pt, c2: Pt, p: Pt) => {
    if (!cur) moveTo(pos);
    cur!.o[cur!.o.length - 1] = sub(c1, pos);
    cur!.v.push(p); cur!.i.push(sub(c2, p)); cur!.o.push([0, 0]);
    pos = p;
  };
  const lineTo = (p: Pt) => cubicTo(pos, p, p);

  while (i < t.length) {
    if (/[a-zA-Z]/.test(t[i])) cmd = t[i++];
    const rel = cmd === cmd.toLowerCase();
    const at = (x: number, y: number): Pt => (rel ? [pos[0] + x, pos[1] + y] : [x, y]);
    switch (cmd.toUpperCase()) {
      case 'M': moveTo(at(num(), num())); cmd = rel ? 'l' : 'L'; lastCtrl = null; break;
      case 'L': lineTo(at(num(), num())); lastCtrl = null; break;
      case 'H': { const x = num(); lineTo([rel ? pos[0] + x : x, pos[1]]); lastCtrl = null; break; }
      case 'V': { const y = num(); lineTo([pos[0], rel ? pos[1] + y : y]); lastCtrl = null; break; }
      case 'C': { const c1 = at(num(), num()), c2 = at(num(), num()), p = at(num(), num()); cubicTo(c1, c2, p); lastCtrl = c2; break; }
      case 'S': {
        const c1: Pt = lastCtrl ? [2 * pos[0] - lastCtrl[0], 2 * pos[1] - lastCtrl[1]] : pos;
        const c2 = at(num(), num()), p = at(num(), num()); cubicTo(c1, c2, p); lastCtrl = c2; break;
      }
      case 'Q': {
        const q = at(num(), num()), p = at(num(), num());
        cubicTo([pos[0] + (2 / 3) * (q[0] - pos[0]), pos[1] + (2 / 3) * (q[1] - pos[1])], [p[0] + (2 / 3) * (q[0] - p[0]), p[1] + (2 / 3) * (q[1] - p[1])], p);
        lastCtrl = null; break;
      }
      case 'A': {
        const rx = num(), ry = num(), rot = num(), large = num(), sweep = num(), p = at(num(), num());
        for (const [c1, c2, e] of arcToCubics(pos, rx, ry, rot, large, sweep, p)) cubicTo(c1, c2, e);
        lastCtrl = null; break;
      }
      case 'Z': {
        if (cur) {
          const c = cur as Sub;
          const last = c.v.length - 1;
          // Drop a duplicated closing vertex, keeping its incoming tangent.
          if (last > 0 && Math.hypot(c.v[last][0] - start[0], c.v[last][1] - start[1]) < 1e-6) {
            c.i[0] = c.i[last]; c.v.pop(); c.i.pop(); c.o.pop();
          }
          c.c = true;
        }
        pos = start; cur = null; lastCtrl = null; break;
      }
      default: i++;  // unknown token; skip rather than loop forever
    }
  }
  return subs;
}

// ---------- Lottie JSON ----------

const st = (k: unknown) => ({ a: 0, k });
const ease = { i: { x: [0.25], y: [1] }, o: { x: [0.4], y: [0] } };
const ease3 = { i: { x: [0.3, 0.3, 0.3], y: [1, 1, 1] }, o: { x: [0.5, 0.5, 0.5], y: [0, 0, 0] } };

// Lottie shape items are loosely typed JSON.
type Shape = Record<string, unknown>;

function shapesFor(part: IconPart): Shape[] {
  if ('path' in part) {
    return parsePath(part.path).map(s => ({ ty: 'sh', ks: st({ v: s.v, i: s.i, o: s.o, c: s.c }) }));
  }
  if ('rect' in part) {
    const [x, y, w, h, rx = 0] = part.rect;
    return [{ ty: 'rc', d: 1, p: st([x + w / 2, y + h / 2]), s: st([w, h]), r: st(rx) }];
  }
  const [cx, cy, r] = part.circle;
  return [{ ty: 'el', d: 1, p: st([cx, cy]), s: st([r * 2, r * 2]) }];
}

export function buildIconAnimation(def: IconDef) {
  const shapes = def.parts.flatMap(shapesFor);
  const white = st([1, 1, 1, 1]);
  return {
    v: '5.7.4', fr: FPS, ip: 0, op: POP_END + 1, w: 24, h: 24, nm: 'icon', ddd: 0, assets: [],
    layers: [{
      ddd: 0, ind: 1, ty: 4, nm: 'glyph', sr: 1, ao: 0, ip: 0, op: POP_END + 1, st: 0, bm: 0,
      ks: {
        o: st(100), r: st(0), p: st([12, 12, 0]), a: st([12, 12, 0]),
        s: {
          a: 1, k: [
            { t: 0, s: [100, 100, 100], h: 1 },
            { t: POP_START, s: [100, 100, 100], ...ease3 },
            { t: POP_START + 8, s: [82, 82, 100], ...ease3 },
            { t: POP_START + 18, s: [108, 108, 100], ...ease3 },
            { t: POP_END, s: [100, 100, 100] }
          ]
        }
      },
      shapes: [{
        ty: 'gr', nm: 'g',
        it: [
          ...shapes,
          {
            ty: 'tm', m: 1, o: st(0), s: st(0),
            e: { a: 1, k: [{ t: 0, s: [0], ...ease }, { t: DRAW_END, s: [100] }] }
          },
          ...(def.fill ? [{ ty: 'fl', c: white, o: st(100), r: 1 }] : []),
          { ty: 'st', c: white, o: st(100), w: st(def.strokeWidth ?? 1.8), lc: 2, lj: 2, ml: 4 },
          { ty: 'tr', p: st([0, 0]), a: st([0, 0]), s: st([100, 100]), r: st(0), o: st(100), sk: st(0), sa: st(0) }
        ]
      }]
    }]
  };
}

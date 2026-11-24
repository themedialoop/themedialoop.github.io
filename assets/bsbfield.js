/* The BSB field: Walter Netsch's Behavioral Sciences Building plan, as dots.
   A footprint of square bays (six across, three deep, corners missing) repeating left to right and top to bottom.
   Every bay is a big hexagon at the crossing of two corridors, with a small turned hexagon inside; the corridors and
   the serrated outer wall are drawn in fine dots. Everything else is filled with small dots, so there is no empty page.
   mlBSB({ W, H, u, seed, periodic, gap, edge, ox, oy }) returns { dots, P, D }:
     u        the size of one bay in px (the dots are sized from it: D = u * .2)
     periodic true when the field repeats left to right with period P (W is then rounded to a whole number of repeats)
     gap      extra px kept clear between every two dots (room for them to wander and breathe)
     edge     px kept clear at the top and bottom (and at the sides when not periodic); null lets dots run past the edge
   Each dot: { x, y, R (its room), r (its drawn size), b (part of the building), fine, ring, s (distance along its line), li (its line) } */
(() => {
  const MASK = ['.####.', '######', '.##.##'];
  const has = (c, r) => MASK[((r % 3) + 3) % 3][((c % 6) + 6) % 6] === '#';
  const rot = (p, cx, cy, a) => { const c = Math.cos(a), s = Math.sin(a); return p.map(([x, y]) => [cx + (x - cx) * c - (y - cy) * s, cy + (x - cx) * s + (y - cy) * c]); };
  const hex = (cx, cy, h, a = 0) => ({ pts: rot([0, 1, 2, 3, 4, 5].map(i => [cx + h * Math.cos(i * Math.PI / 3), cy + h * Math.sin(i * Math.PI / 3)]), cx, cy, a), closed: 1 });
  const ln = (...p) => ({ pts: p, closed: 0 });
  const resample = (pts, step, closed) => { const P = closed ? [...pts, pts[0]] : pts, out = [P[0]]; let carry = 0;
    for (let i = 1; i < P.length; i++) { const [ax, ay] = P[i - 1], [bx, by] = P[i], seg = Math.hypot(bx - ax, by - ay); if (!seg) continue; let t = step - carry;
      while (t <= seg) { const f = t / seg; out.push([ax + (bx - ax) * f, ay + (by - ay) * f]); t += step; } carry = seg - (t - step); }
    if (closed) out.pop(); return out; };
  window.mlBSB = o => {
    const u = o.u, D = u * .2, P = 6 * u, per = !!o.periodic, gap = o.gap || 0, edge = o.edge == null ? null : o.edge;
    const W = per ? Math.max(1, Math.round(o.W / P)) * P : o.W, H = o.H, ox = o.ox || 0, oy = o.oy || 0;
    let seed = (o.seed || 7) % 233280; const rnd = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
    const wdx = per ? (a, b) => { const d = Math.abs(a - b) % W; return Math.min(d, W - d); } : (a, b) => Math.abs(a - b);
    // the plan, in bay units, over a little more than the area so nothing stops short at an edge
    const c0 = Math.floor((-ox - u) / u) - 1, c1 = Math.ceil((W - ox + u) / u) + 1, r0 = Math.floor((-oy - u) / u) - 1, r1 = Math.ceil((H - oy + u) / u) + 1;
    const big = [], fine = [];
    for (let c = c0; c < c1; c++) for (let r = r0; r < r1; r++) { if (!has(c, r)) continue; const x = c + .5, y = r + .5;
      big.push(hex(x, y, .34)); fine.push(ln([c, r], [c + 1, r + 1]), ln([c + 1, r], [c, r + 1]), hex(x, y, .16, Math.PI / 6));
      for (const [dc, dr] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) { if (has(c + dc, r + dr)) continue;   // an outside wall, in 45° teeth
        const tx = -dr, ty = dc, ax = x + dc / 2 - tx / 2, ay = y + dr / 2 - ty / 2, p = [];
        for (let i = 0; i <= 4; i++) { const f = i / 4, k = i % 2 ? .25 : 0; p.push([ax + tx * f + dc * k, ay + ty * f + dr * k]); }
        fine.push({ pts: p, closed: 0 }); } }
    const cs = D * 1.3, G = new Map(), nI = Math.ceil(W / cs) + 1, gk = (i, j) => i * 8192 + j + 4096, dots = [];
    const ci = x => per ? ((Math.floor(x / cs) % nI) + nI) % nI : Math.floor(x / cs);
    const clash = (x, y, R, g) => { const gi = Math.floor(x / cs), gj = Math.floor(y / cs);
      for (let di = -2; di <= 2; di++) for (let dj = -2; dj <= 2; dj++) { const a = G.get(gk(per ? (((gi + di) % nI) + nI) % nI : gi + di, gj + dj)); if (a) for (const d of a) if (wdx(d.x, x) ** 2 + (d.y - y) ** 2 < (R + d.R + g) ** 2) return true; }
      return false; };
    const inside = (x, y, R) => (per ? x >= 0 && x < W : edge == null ? x > -R && x < W + R : x > R + edge && x < W - R - edge) && (edge == null ? y > -R && y < H + R : y > R + edge && y < H - R - edge);
    const add = d => { dots.push(d); const k = gk(ci(d.x), Math.floor(d.y / cs)); (G.get(k) || G.set(k, []).get(k)).push(d); };
    const lay = (shapes, isFine) => shapes.forEach((sh, li) => { const pts = resample(sh.pts.map(([x, y]) => [ox + x * u, oy + y * u]), 1, sh.closed), sp = (isFine ? D * .6 : D * 1.22) + gap;
      for (let s = 0; s < pts.length; s += sp) { const [x, y] = pts[Math.floor(s)], sz = isFine ? .48 + rnd() * .08 : .95 + rnd() * .35, R = D * .46 * sz;
        if (!inside(x, y, R) || clash(x, y, R, (isFine ? D * .06 : D * .14) + gap)) continue;
        add({ x, y, R, r: D * .38 * sz, sz, b: true, fine: isFine, ring: rnd() < .15, s, li: li + (isFine ? 5000 : 0) }); } });
    lay(big, false); lay(fine, true);   // the big hexagons first, then the fine lines round them
    const c = D * .6 + gap;   // the field: small dots packed right up to the building
    for (let y = -c, row = 0; y < H + c; y += c * .87, row++) for (let x = (row % 2) * c * .5 - (per ? 0 : c); x < W + (per ? 0 : c); x += c) {
      let px = x + (rnd() - .5) * c * .55; const py = y + (rnd() - .5) * c * .55, sz = .44 + rnd() * .14, R = D * .46 * sz;
      if (per) px = ((px % W) + W) % W;
      if (!inside(px, py, R) || clash(px, py, R, D * .1 + gap)) continue;
      add({ x: px, y: py, R, r: D * .38 * sz, sz, b: false, fine: false, ring: rnd() < .15, s: 0, li: -1 }); }
    return { dots, P, D, W };
  };
})();

/* the BSB plan as a soft background of organic dots in the palette (no blue): the building's big hexagons and its fine lines and walls in
   orange, pink and purple, the field round them in gold with a few teal, thinned so the plan shows through as a gentle rhythm of big,
   medium and small. mlBSBDots({ W, H, u, seed, periodic, keep }) returns { dots: [{ x, y, r, c, ring, b }], W } */
window.mlBSBDots = o => {
  const f = mlBSB({ W: o.W, H: o.H, u: o.u, seed: o.seed || 5, periodic: !!o.periodic, gap: o.gap == null ? 6 : o.gap, edge: o.edge == null ? 4 : o.edge });
  let s = (o.seed || 5) * 7 + 3; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const keep = o.keep == null ? .5 : o.keep, BIG = ['#e0773a', '#d8708e', '#9b6aa6', '#e0773a'], FINE = ['#9b6aa6', '#d8708e', '#2a8c8c'], FIELD = ['#e7aa4d', '#e7aa4d', '#e7aa4d', '#e0773a', '#2a8c8c'];
  const dots = [];
  for (const q of f.dots) { if (!q.b && rnd() > keep) continue;
    dots.push({ x: q.x, y: q.y, r: q.r, b: q.b && !q.fine, ring: q.ring, c: q.b ? (q.fine ? FINE : BIG)[Math.floor(rnd() * (q.fine ? 3 : 4))] : FIELD[Math.floor(rnd() * 5)] }); }
  return { dots, W: f.W };
};

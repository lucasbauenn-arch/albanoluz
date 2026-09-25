#!/usr/bin/env node
/**
 * Gera as ilustrações técnicas (SVG) usadas como placeholders no site
 * Albano Luz Engenharia, além das imagens de marca em PNG (og-image e ícones).
 *
 * Uso: npm run ilustracoes   (ou: node scripts/gerar-ilustracoes.mjs)
 *
 * Saída:
 *   public/ilustracoes/<nome>.svg
 *   public/og-image.png, public/apple-touch-icon.png, public/icon-192.png, public/icon-512.png
 *
 * Tudo é determinístico: rodar de novo produz arquivos idênticos.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PUB = join(ROOT, 'public');
const OUT = join(PUB, 'ilustracoes');

/* ------------------------------------------------------------------ */
/* Paleta e temas                                                      */
/* ------------------------------------------------------------------ */
const NAVY = '#0F2344';
const NV2 = '#2C4470';
const NV3 = '#4A6089';
const NV4 = '#A9B6CD';
const PAPEL = '#F4F4F2';
const GRAF = '#4A4A4A';
const VERM = '#A4483A';
const VERDE = '#3F7A5A';
const FONT = 'Inter, Arial, Helvetica, sans-serif';

const TH_PAPEL = { bg: PAPEL, ink: NAVY, ink2: GRAF, dim: GRAF, axis: NV3, faint: '#B4BCCB', mob: '#8C929C' };
const TH_AZUL = { bg: NAVY, ink: '#FFFFFF', ink2: NV4, dim: NV4, axis: NV4, faint: NV3, mob: NV4 };

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */
const N = (v) => {
  const r = Math.round(v * 10) / 10;
  return r === 0 ? 0 : r;
};
const N3 = (v) => {
  const r = Math.round(v * 1000) / 1000;
  return r === 0 ? 0 : r;
};
/** número no formato brasileiro: 4.5 -> "4,50" */
const br = (v, d = 2) => v.toFixed(d).replace('.', ',');
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const A = (o) =>
  Object.entries(o)
    .filter(([, v]) => v !== undefined && v !== null && v !== false)
    .map(([k, v]) => ` ${k}="${v}"`)
    .join('');
const pts = (p) => p.map((q) => `${N(q[0])},${N(q[1])}`).join(' ');
const D = (p, z = false) => 'M' + p.map((q) => `${N(q[0])} ${N(q[1])}`).join('L') + (z ? 'Z' : '');

const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const mix = (a, b, t) => {
  const A1 = hex(a);
  const B1 = hex(b);
  return '#' + A1.map((v, i) => Math.round(v + (B1[i] - v) * t).toString(16).padStart(2, '0')).join('');
};

/** PRNG determinístico (mulberry32) */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* primitivas SVG */
const ln = (x1, y1, x2, y2, a = {}) => `<line x1="${N(x1)}" y1="${N(y1)}" x2="${N(x2)}" y2="${N(y2)}"${A(a)}/>`;
const rc = (x, y, w, h, a = {}) => `<rect x="${N(x)}" y="${N(y)}" width="${N(w)}" height="${N(h)}"${A(a)}/>`;
const ci = (cx, cy, r, a = {}) => `<circle cx="${N(cx)}" cy="${N(cy)}" r="${N(r)}"${A(a)}/>`;
const el = (cx, cy, rx, ry, a = {}) => `<ellipse cx="${N(cx)}" cy="${N(cy)}" rx="${N(rx)}" ry="${N(ry)}"${A(a)}/>`;
const pg = (p, a = {}) => `<polygon points="${pts(p)}"${A(a)}/>`;
const pl = (p, a = {}) => `<polyline points="${pts(p)}"${A(a.fill ? a : { fill: 'none', ...a })}/>`;
const pa = (d, a = {}) => `<path d="${d}"${A(a)}/>`;
const G = (a, ...c) => `<g${A(a)}>${c.flat(Infinity).join('')}</g>`;
const mtx = (m) => `matrix(${m.map((v, i) => (i < 4 ? N3(v) : N(v))).join(' ')})`;

function T(x, y, s, o = {}) {
  const a = {};
  if (o.fs) a['font-size'] = o.fs;
  if (o.fw) a['font-weight'] = o.fw;
  if (o.anchor) a['text-anchor'] = o.anchor;
  if (o.fill) a.fill = o.fill;
  if (o.ls) a['letter-spacing'] = o.ls;
  if (o.op !== undefined) a['fill-opacity'] = o.op;
  if (o.ff) a['font-family'] = o.ff;
  if (o.it) a['font-style'] = 'italic';
  if (o.halo) a.style = `stroke:${o.halo};stroke-width:3px;paint-order:stroke;stroke-linejoin:round`;
  const xy = ` x="${N(x)}" y="${N(y)}"`;
  if (o.rot) a.transform = `rotate(${o.rot} ${N(x)} ${N(y)})`;
  if (o.m) a.transform = mtx(o.m);
  return `<text${xy}${A(a)}>${esc(s)}</text>`;
}

/** largura aproximada de um texto (Arial/Inter) em px */
function tw(s, fs, bold = false) {
  let w = 0;
  for (const ch of String(s)) {
    if (ch === ' ') w += 0.28;
    else if (/[A-ZÁÂÃÉÊÍÓÔÕÚÇ]/.test(ch)) w += bold ? 0.72 : 0.67;
    else if (/[0-9]/.test(ch)) w += 0.56;
    else if (/[.,:;'!|il]/.test(ch)) w += 0.28;
    else if (/[—]/.test(ch)) w += 1.0;
    else w += bold ? 0.58 : 0.54;
  }
  return w * fs;
}

/* ------------------------------------------------------------------ */
/* Documento, padrões, prancha                                         */
/* ------------------------------------------------------------------ */
const PAT = {
  bpg: `<pattern id="bpg" width="100" height="100" patternUnits="userSpaceOnUse"><path d="M20 0V100M40 0V100M60 0V100M80 0V100M0 20H100M0 40H100M0 60H100M0 80H100" stroke="#fff" stroke-opacity=".035"/><path d="M0 0V100M0 0H100" stroke="#fff" stroke-opacity=".075"/></pattern>`,
  terra: `<pattern id="terra" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V7" stroke="${GRAF}" stroke-width=".7"/></pattern>`,
  alv: `<pattern id="alv" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V5" stroke="${GRAF}" stroke-width=".55"/></pattern>`,
  mad: `<pattern id="mad" width="6" height="10" patternUnits="userSpaceOnUse"><rect width="6" height="10" fill="#E7DFD4"/><path d="M0 0V10" stroke="${GRAF}" stroke-opacity=".55" stroke-width=".6"/></pattern>`,
  met: `<pattern id="met" width="5" height="10" patternUnits="userSpaceOnUse"><rect width="5" height="10" fill="#F2F2F0"/><path d="M0 0V10" stroke="${GRAF}" stroke-opacity=".45" stroke-width=".55"/></pattern>`,
  telha: `<pattern id="telha" width="9" height="6" patternUnits="userSpaceOnUse"><rect width="9" height="6" fill="#E8E5E0"/><path d="M0 5.5H9M4.5 0V5.5" stroke="${GRAF}" stroke-opacity=".45" stroke-width=".55"/></pattern>`,
  arg: `<pattern id="arg" width="6" height="6" patternUnits="userSpaceOnUse"><rect width="6" height="6" fill="#ECE9E2"/><circle cx="1.5" cy="1.5" r=".55" fill="${GRAF}" fill-opacity=".5"/><circle cx="4.5" cy="4.2" r=".45" fill="${GRAF}" fill-opacity=".5"/></pattern>`,
  alvF: `<pattern id="alvF" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="#F0EBE3"/><path d="M0 0V5" stroke="${GRAF}" stroke-width=".55"/></pattern>`,
  hn: `<pattern id="hn" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><path d="M0 0V6" stroke="${NAVY}" stroke-opacity=".35" stroke-width=".8"/></pattern>`,
  conc: (() => {
    const r = rng(7);
    let s = '';
    for (let i = 0; i < 9; i++) s += `<circle cx="${N(r() * 34)}" cy="${N(r() * 34)}" r="${N(0.5 + r() * 0.5)}"/>`;
    for (let i = 0; i < 4; i++) {
      const x = r() * 30 + 2;
      const y = r() * 30 + 2;
      const a = r() * 6.28;
      const k = 2.4 + r() * 1.4;
      const p = [0, 2.1, 4.2].map((d) => [x + k * Math.cos(a + d), y + k * Math.sin(a + d)]);
      s += `<polygon points="${pts(p)}" fill="none" stroke-width=".55"/>`;
    }
    return `<pattern id="conc" width="34" height="34" patternUnits="userSpaceOnUse"><g fill="${GRAF}" stroke="${GRAF}">${s}</g></pattern>`;
  })(),
};

function svgDoc({ w = 1200, h = 900, th, defs = [], css = '', body, grid = false }) {
  const pats = [...new Set(grid ? ['bpg', ...defs] : defs)].map((k) => (PAT[k] ? PAT[k] : k)).join('');
  let bg = `<rect width="${w}" height="${h}" fill="${th.bg}"/>`;
  if (grid) bg += `<rect width="${w}" height="${h}" fill="url(#bpg)"/>`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="${FONT}">` +
    `<style>text{stroke:none}${css}</style>` +
    (pats ? `<defs>${pats}</defs>` : '') +
    bg +
    body +
    `</svg>\n`
  );
}

/** Marca oficial (public/marca, vetorizada de marca/logo-original.webp) */
function lerMarca(arquivo) {
  const svg = readFileSync(join(PUB, 'marca', arquivo), 'utf8');
  const [x, y, w, h] = svg.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
  return { x, y, w, h, d: svg.match(/ d="([^"]+)"/)[1] };
}
const MONO = lerMarca('monograma-simplificado-branco.svg');
const LOGO = lerMarca('logo-branco.svg');
function marca(m, x, y, largura, fill) {
  return `<path transform="translate(${N(x)} ${N(y)}) scale(${(largura / m.w).toFixed(5)}) translate(${-m.x} ${-m.y})" fill="${fill}" fill-rule="evenodd" d="${m.d}"/>`;
}
function monograma(x, y, size, bg = NAVY, fg = '#fff') {
  const larg = size * 0.86;
  const alt = (larg * MONO.h) / MONO.w;
  return `<rect x="${N(x)}" y="${N(y)}" width="${N(size)}" height="${N(size)}" fill="${bg}"/>` + marca(MONO, x + (size - larg) / 2, y + (size - alt) / 2, larg, fg);
}

/** Moldura da prancha + carimbo */
function prancha(th, W, H, titulo, o = {}) {
  const { escala = 'ESC. 1:100', folha = '01/01', cw = 356, ch = 86, moldura = true } = o;
  const x = W - 18 - cw;
  const y = H - 18 - ch;
  const s = [];
  if (moldura) {
    s.push(rc(18, 18, W - 36, H - 36, { fill: 'none', stroke: th.ink, 'stroke-width': 1.1 }));
    const k = 7;
    s.push(
      G(
        { stroke: th.ink, 'stroke-width': 0.8 },
        ln(W / 2, 18, W / 2, 18 + k),
        ln(W / 2, H - 18, W / 2, H - 18 - k),
        ln(18, H / 2, 18 + k, H / 2),
        ln(W - 18, H / 2, W - 18 - k, H / 2),
      ),
    );
  }
  s.push(rc(x, y, cw, ch, { fill: th.bg, stroke: th.ink, 'stroke-width': 1.1 }));
  s.push(
    G(
      { stroke: th.ink, 'stroke-width': 0.6 },
      ln(x, y + 33, x + cw, y + 33),
      ln(x, y + 62, x + cw, y + 62),
      ln(x + 118, y + 62, x + 118, y + ch),
      ln(x + 236, y + 62, x + 236, y + ch),
    ),
  );
  s.push(monograma(x + 5, y + 5, 23));
  s.push(T(x + 36, y + 16, 'ALBANO LUZ ENGENHARIA', { fs: 11.5, fw: 700, ls: 1.1, fill: th.ink }));
  s.push(T(x + 36, y + 27.5, 'PROJETO ESTRUTURAL · CÁLCULO E DETALHAMENTO', { fs: 6.8, ls: 0.9, fill: th.ink2 }));
  s.push(T(x + 7, y + 42, 'DESENHO', { fs: 6.2, ls: 1, fill: th.ink2 }));
  s.push(T(x + 7, y + 56, titulo, { fs: tw(titulo, 11, true) > cw - 14 ? 9.5 : 11, fw: 700, fill: th.ink }));
  s.push(T(x + 7, y + 78, escala, { fs: 9.5, fw: 600, fill: th.ink }));
  s.push(T(x + 125, y + 78, `FOLHA ${folha}`, { fs: 9.5, fw: 600, fill: th.ink }));
  s.push(T(x + 243, y + 78, 'REV. 00', { fs: 9.5, fw: 600, fill: th.ink }));
  return s.join('');
}

/** Título de desenho sublinhado (ex.: "FACHADA FRONTAL" + "ESC. 1:100") */
function legenda(th, x, y, titulo, escala = 'ESC. 1:100', anchor = 'start') {
  const fs = 14;
  const w = tw(titulo, fs, true) + 6;
  const x0 = anchor === 'middle' ? x - w / 2 : x;
  return (
    T(x0, y, titulo, { fs, fw: 700, fill: th.ink, ls: 0.4 }) +
    ln(x0, y + 6, x0 + w, y + 6, { stroke: th.ink, 'stroke-width': 1.6 }) +
    ln(x0, y + 9.5, x0 + w, y + 9.5, { stroke: th.ink, 'stroke-width': 0.6 }) +
    (escala ? T(x0 + w, y + 23, escala, { fs: 9.5, fill: th.ink2, anchor: 'end', ls: 0.4 }) : '')
  );
}

/** Cota horizontal encadeada. xs em px; s = px por metro */
function cotaH(th, xs, y, o = {}) {
  const { s = 1, from = null, labels = null, fs = 10.5, col = th.dim } = o;
  const L = [ln(xs[0] - 5, y, xs[xs.length - 1] + 5, y)];
  const Tx = [];
  for (const x of xs) {
    L.push(ln(x - 3.2, y + 3.2, x + 3.2, y - 3.2, { 'stroke-width': 1.3 }));
    if (from !== null) {
      const sg = from > y ? 1 : -1;
      L.push(ln(x, from - sg * 3, x, y - sg * 5));
    } else L.push(ln(x, y - 5, x, y + 5));
  }
  let alt = 0;
  for (let i = 0; i < xs.length - 1; i++) {
    const w = xs[i + 1] - xs[i];
    const t = labels ? labels[i] : br(w / s);
    if (!t) continue;
    let yy = y - 4;
    if (tw(t, fs) > w - 3) yy = y - 4 - (alt++ % 2 ? 0 : fs);
    Tx.push(T((xs[i] + xs[i + 1]) / 2, yy, t, { fs, anchor: 'middle', fill: col, halo: th.bg }));
  }
  return G({ stroke: col, 'stroke-width': 0.7 }, L) + Tx.join('');
}

/** Cota vertical encadeada. ys em px */
function cotaV(th, ys, x, o = {}) {
  const { s = 1, from = null, labels = null, fs = 10.5, col = th.dim, side = -1 } = o;
  const L = [ln(x, ys[0] - 5, x, ys[ys.length - 1] + 5)];
  const Tx = [];
  for (const y of ys) {
    L.push(ln(x - 3.2, y + 3.2, x + 3.2, y - 3.2, { 'stroke-width': 1.3 }));
    if (from !== null) {
      const sg = from > x ? 1 : -1;
      L.push(ln(from - sg * 3, y, x - sg * 5, y));
    } else L.push(ln(x - 5, y, x + 5, y));
  }
  for (let i = 0; i < ys.length - 1; i++) {
    const h = Math.abs(ys[i + 1] - ys[i]);
    const t = labels ? labels[i] : br(h / s);
    if (!t) continue;
    const my = (ys[i] + ys[i + 1]) / 2;
    const xx = side < 0 ? x - 4 : x + 4 + fs * 0.75;
    Tx.push(T(xx, my, t, { fs, anchor: 'middle', fill: col, rot: -90, halo: th.bg }));
  }
  return G({ stroke: col, 'stroke-width': 0.7 }, L) + Tx.join('');
}

/** Eixo de locação com bolha */
function eixo(th, x1, y1, x2, y2, lab, o = {}) {
  const { r = 12, fs = 11.5, at = 'start', col = th.axis, sw = 0.7 } = o;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const L = Math.hypot(dx, dy);
  const ux = dx / L;
  const uy = dy / L;
  let s = ln(x1, y1, x2, y2, { stroke: col, 'stroke-width': sw, 'stroke-dasharray': '18 4 3 4' });
  const bub = (x, y) =>
    ci(x, y, r, { fill: th.bg, stroke: col, 'stroke-width': 1 }) +
    T(x, y + fs * 0.36, lab, { fs, anchor: 'middle', fill: th.ink, fw: 600 });
  if (at === 'start' || at === 'both') s += bub(x1 - ux * r, y1 - uy * r);
  if (at === 'end' || at === 'both') s += bub(x2 + ux * r, y2 + uy * r);
  return s;
}

/** Marcador de nível em elevação */
function nivel(th, x, y, lab, o = {}) {
  const { dir = 1, len = 66, fs = 10.5, col = th.ink, sub = null } = o;
  const tx = x + dir * 12;
  return (
    G(
      { stroke: col, 'stroke-width': 0.8, fill: 'none' },
      ln(x, y, x + dir * len, y),
      pg([
        [tx, y],
        [tx - 5, y - 8],
        [tx + 5, y - 8],
      ]),
      pg(
        [
          [tx, y],
          [tx - 5, y - 8],
          [tx, y - 8],
        ],
        { fill: col, stroke: 'none' },
      ),
    ) +
    T(tx + dir * 9, y - 3.5, lab, { fs, fill: col, anchor: dir > 0 ? 'start' : 'end', fw: 600 }) +
    (sub ? T(tx + dir * 9, y + 11, sub, { fs: fs - 2.5, fill: col, anchor: dir > 0 ? 'start' : 'end', ls: 0.5 }) : '')
  );
}

/** Linha de terreno com hachura */
function terreno(th, x1, x2, y, o = {}) {
  const { d = 16, sw = 2 } = o;
  return (
    rc(x1, y, x2 - x1, d, { fill: 'url(#terra)', opacity: 0.5 }) +
    ln(x1, y, x2, y, { stroke: th.ink2, 'stroke-width': sw })
  );
}

/** Seta de norte simples */
function norte(th, x, y, r = 22) {
  return G(
    { stroke: th.ink, 'stroke-width': 0.9, fill: 'none' },
    ci(x, y, r),
    pg([
      [x, y - r + 3],
      [x + 7, y + r * 0.55],
      [x, y + r * 0.25],
    ], { fill: th.ink }),
    pg([
      [x, y - r + 3],
      [x - 7, y + r * 0.55],
      [x, y + r * 0.25],
    ]),
    T(x, y - r - 5, 'N', { fs: 11, fw: 700, anchor: 'middle', fill: th.ink }),
  );
}

/* ------------------------------------------------------------------ */
/* Motor isométrico                                                    */
/* ------------------------------------------------------------------ */
const COS30 = Math.cos(Math.PI / 6);
function isoP(ox, oy, s) {
  const P = (x, y, z = 0) => [ox + (x - y) * COS30 * s, oy + (x + y) * 0.5 * s - z * s];
  /** matriz de texto sobre um plano: gx (chão, ao longo de x), gy (chão, ao longo de -y),
   *  vx (vertical, face +y, ao longo de x), vy (vertical, face +x, ao longo de -y) */
  P.m = (pl, x, y, z = 0) => {
    const [px, py] = P(x, y, z);
    const M = { gx: [COS30, 0.5, -COS30, 0.5], gy: [COS30, -0.5, COS30, 0.5], vx: [COS30, 0.5, 0, 1], vy: [COS30, -0.5, 0, 1] };
    return [...M[pl], px, py];
  };
  P.s = s;
  return P;
}
/** encaixa uma lista de pontos 3D num retângulo de tela */
function isoFit(points, box, s) {
  const P0 = isoP(0, 0, s);
  const sc = points.map((p) => P0(...p));
  const xs = sc.map((p) => p[0]);
  const ys = sc.map((p) => p[1]);
  const [x0, y0, x1, y1] = box;
  const ox = (x0 + x1) / 2 - (Math.min(...xs) + Math.max(...xs)) / 2;
  const oy = (y0 + y1) / 2 - (Math.min(...ys) + Math.max(...ys)) / 2;
  return isoP(ox, oy, s);
}
/** caixa isométrica (3 faces visíveis: topo, +x, +y) usando classes CSS t/r/l */
function isoBox(P, b, cls = '') {
  const { x0, x1, y0, y1, z0, z1 } = b;
  const f = (q) => q.map((p) => P(...p));
  const top = f([
    [x0, y0, z1],
    [x1, y0, z1],
    [x1, y1, z1],
    [x0, y1, z1],
  ]);
  const rx = f([
    [x1, y0, z0],
    [x1, y1, z0],
    [x1, y1, z1],
    [x1, y0, z1],
  ]);
  const ly = f([
    [x0, y1, z0],
    [x1, y1, z0],
    [x1, y1, z1],
    [x0, y1, z1],
  ]);
  return `<path class="l${cls}" d="${D(ly, 1)}"/><path class="r${cls}" d="${D(rx, 1)}"/><path class="t${cls}" d="${D(top, 1)}"/>`;
}
/** arestas de uma caixa (12) para linhas tracejadas/ocultas */
function isoBoxEdges(P, b) {
  const { x0, x1, y0, y1, z0, z1 } = b;
  const c = [
    [x0, y0], [x1, y0], [x1, y1], [x0, y1],
  ];
  let d = '';
  for (const z of [z0, z1]) d += D(c.map(([x, y]) => P(x, y, z)), 1);
  for (const [x, y] of c) d += D([P(x, y, z0), P(x, y, z1)]);
  return d;
}
const bx = (x0, x1, y0, y1, z0, z1, k = '') => ({ x0, x1, y0, y1, z0, z1, k });

/**
 * Gera a estrutura reticulada (pilares, vigas, lajes) de um edifício.
 * Retorna uma lista de "andares", cada um com os elementos em ordem de pintura.
 */
function estrutura({ xs, ys, zs, col = [0.3, 0.3], bw = 0.16, bh = 0.5, lj = 0.12, lajes = null, pilares = null, vigas = null, skip = () => false }) {
  const X0 = xs[0];
  const X1 = xs[xs.length - 1];
  const Y0 = ys[0];
  const Y1 = ys[ys.length - 1];
  const ox = col[0] / 2;
  const oy = col[1] / 2;
  const out = [];
  for (let k = 1; k < zs.length; k++) {
    const zb = zs[k - 1];
    const zt = zs[k];
    const temLaje = lajes ? lajes(k) : true;
    const temViga = vigas ? vigas(k) : temLaje;
    const zc = temViga ? zt - lj : pilares ? pilares(k) : zt - lj;
    const itens = [];
    for (const x of xs)
      for (const y of ys) {
        if (skip('p', k, x, y)) continue;
        itens.push({ ...bx(x - ox, x + ox, y - oy, y + oy, zb, zc, 'p'), cx: x, cy: y });
      }
    if (temViga) {
      for (const y of ys)
        for (let i = 0; i < xs.length - 1; i++) {
          if (skip('vx', k, xs[i], y)) continue;
          itens.push({ ...bx(xs[i] + ox, xs[i + 1] - ox, y - bw / 2, y + bw / 2, zt - bh, zt - lj, 'v'), cx: (xs[i] + xs[i + 1]) / 2, cy: y });
        }
      for (const x of xs)
        for (let j = 0; j < ys.length - 1; j++) {
          if (skip('vy', k, x, ys[j])) continue;
          itens.push({ ...bx(x - bw / 2, x + bw / 2, ys[j] + oy, ys[j + 1] - oy, zt - bh, zt - lj, 'v'), cx: x, cy: (ys[j] + ys[j + 1]) / 2 });
        }
    }
    itens.sort((a, b) => a.cx + a.cy - (b.cx + b.cy) || a.z0 - b.z0);
    const laje = temLaje ? bx(X0 - ox, X1 + ox, Y0 - oy, Y1 + oy, zt - lj, zt, 'l') : null;
    out.push({ k, zb, zt, itens, laje });
  }
  return out;
}

/** vergalhões de espera saindo do topo de um pilar */
function esperas(P, x, y, z, { a = 0.3, b = 0.3, h = 0.9, estribos = 2 } = {}) {
  const i = 0.05;
  const cs = [
    [x - a / 2 + i, y - b / 2 + i],
    [x + a / 2 - i, y - b / 2 + i],
    [x + a / 2 - i, y + b / 2 - i],
    [x - a / 2 + i, y + b / 2 - i],
  ];
  let d = '';
  for (const [px, py] of cs) {
    const p0 = P(px, py, z);
    const p1 = P(px, py, z + h);
    d += `M${N(p0[0])} ${N(p0[1])}L${N(p1[0])} ${N(p1[1])}l${N(-2)} ${N(2.5)}`;
  }
  for (let e = 1; e <= estribos; e++) {
    const ze = z + (h * e) / (estribos + 1.3);
    d += D(cs.map(([px, py]) => P(px, py, ze)), 1);
  }
  return d;
}

/** encaixa pontos 3D num retângulo de tela escolhendo a escala automaticamente */
function isoFitAuto(points, box, sMax = 60) {
  const P0 = isoP(0, 0, 1);
  const sc = points.map((p) => P0(...p));
  const w = Math.max(...sc.map((p) => p[0])) - Math.min(...sc.map((p) => p[0]));
  const h = Math.max(...sc.map((p) => p[1])) - Math.min(...sc.map((p) => p[1]));
  const s = Math.min((box[2] - box[0]) / w, (box[3] - box[1]) / h, sMax);
  return isoFit(points, box, s);
}

/* anotações sobre o plano do chão (isométrico) */
function bolhaIso(P, th, x, y, z, r, lab, plano, fs) {
  const [px, py] = P(x, y, z);
  return (
    el(px, py, r * P.s * 1.2247, r * P.s * 0.7071, { fill: th.bg, stroke: th.axis, 'stroke-width': 1 }) +
    T(0, fs * 0.36, lab, { m: P.m(plano, x, y, z), fs, anchor: 'middle', fill: th.ink, fw: 600 })
  );
}
function isoEixos(P, th, xs, ys, o = {}) {
  const { ext = 3.2, back = 1.2, r = 0.55, fs = 12, labX = null, labY = null, z = 0 } = o;
  const X1 = xs[xs.length - 1];
  const Y1 = ys[ys.length - 1];
  let d = '';
  let b = '';
  xs.forEach((x, i) => {
    d += D([P(x, ys[0] - back, z), P(x, Y1 + ext, z)]);
    b += bolhaIso(P, th, x, Y1 + ext + r, z, r, labX ? labX[i] : String(i + 1), 'gx', fs);
  });
  ys.forEach((y, j) => {
    d += D([P(xs[0] - back, y, z), P(X1 + ext, y, z)]);
    b += bolhaIso(P, th, X1 + ext + r, y, z, r, labY ? labY[j] : 'ABCDEFGH'[j], 'gy', fs);
  });
  return pa(d, { class: 'ax' }) + b;
}
function isoCotaX(P, th, xs, y, o = {}) {
  const { from = null, fs = 11, labels = null, z = 0 } = o;
  let d = D([P(xs[0] - 0.3, y, z), P(xs[xs.length - 1] + 0.3, y, z)]);
  let t = '';
  let tx = '';
  for (const x of xs) {
    t += D([P(x - 0.18, y + 0.18, z), P(x + 0.18, y - 0.18, z)]);
    if (from !== null) d += D([P(x, from, z), P(x, y + 0.3, z)]);
  }
  for (let i = 0; i < xs.length - 1; i++) {
    const lab = labels ? labels[i] : br(xs[i + 1] - xs[i]);
    tx += T(0, 0, lab, { m: P.m('gx', (xs[i] + xs[i + 1]) / 2, y - 0.2, z), fs, anchor: 'middle', fill: th.dim });
  }
  return pa(d, { class: 'dm' }) + pa(t, { class: 'tk' }) + tx;
}
function isoCotaY(P, th, ys, x, o = {}) {
  const { from = null, fs = 11, labels = null, z = 0 } = o;
  let d = D([P(x, ys[0] - 0.3, z), P(x, ys[ys.length - 1] + 0.3, z)]);
  let t = '';
  let tx = '';
  for (const y of ys) {
    t += D([P(x - 0.18, y + 0.18, z), P(x + 0.18, y - 0.18, z)]);
    if (from !== null) d += D([P(from, y, z), P(x + 0.3, y, z)]);
  }
  for (let i = 0; i < ys.length - 1; i++) {
    const lab = labels ? labels[i] : br(ys[i + 1] - ys[i]);
    tx += T(0, 0, lab, { m: P.m('gy', x - 0.2, (ys[i] + ys[i + 1]) / 2, z), fs, anchor: 'middle', fill: th.dim });
  }
  return pa(d, { class: 'dm' }) + pa(t, { class: 'tk' }) + tx;
}
/** níveis alinhados à tela, à esquerda de um ponto de referência (x,y) do modelo */
function isoNiveis(P, th, x, y, niveis, o = {}) {
  const { gap = 16, len = 104 } = o;
  return niveis
    .map(([z, lab, sub]) => {
      const [sx, sy] = P(x, y, z);
      return (
        ln(sx - 4, sy, sx - gap + 2, sy, { stroke: th.ink2, 'stroke-width': 0.6, 'stroke-dasharray': '2 2' }) +
        nivel(th, sx - gap, sy, lab, { dir: -1, len, sub, col: th.ink, fs: 11 })
      );
    })
    .join('');
}
/** texto de chamada com linha de chamada (leader) */
function chamada(th, x1, y1, x2, y2, texto, o = {}) {
  const { fs = 11, fw = 600, col = th.ink, sub = null, anchor = x2 >= x1 ? 'start' : 'end', dot = true } = o;
  const dir = anchor === 'start' ? 1 : -1;
  const w = Math.max(tw(texto, fs, fw >= 600), sub ? tw(sub, fs - 2) : 0);
  return (
    G(
      { stroke: col, 'stroke-width': 0.7, fill: 'none' },
      pl([
        [x1, y1],
        [x2, y2],
        [x2 + dir * (w + 6), y2],
      ]),
    ) +
    (dot ? ci(x1, y1, 2.2, { fill: col }) : '') +
    T(x2 + dir * 3, y2 - 5, texto, { fs, fw, fill: col, anchor, ls: 0.3 }) +
    (sub ? T(x2 + dir * 3, y2 + fs + 1, sub, { fs: fs - 2, fill: th.ink2, anchor, ls: 0.3 }) : '')
  );
}

const CSS_ISO =
  `.t{fill:#30435F}.l{fill:#223554}.r{fill:#182C4C}.tL{fill:#2B3E5B}.lL{fill:#253857}.rL{fill:#1C3050}` +
  `.t,.l,.r,.tL,.lL,.rL{stroke:#fff;stroke-opacity:.85;stroke-width:1;stroke-linejoin:round}` +
  `.rb{fill:none;stroke:#fff;stroke-opacity:.9;stroke-width:1.1;stroke-linecap:round}` +
  `.gh{fill:none;stroke:${NV4};stroke-opacity:.55;stroke-width:.8;stroke-dasharray:5 4}` +
  `.ax{fill:none;stroke:${NV4};stroke-opacity:.6;stroke-width:.7;stroke-dasharray:16 4 3 4}` +
  `.dm{fill:none;stroke:${NV4};stroke-width:.7}.tk{fill:none;stroke:${NV4};stroke-width:1.4}` +
  `.fd{fill:none;stroke:${NV4};stroke-opacity:.45;stroke-width:.8;stroke-dasharray:4 3}` +
  `.ex{fill:none;stroke:#fff;stroke-opacity:.7;stroke-width:1;stroke-dasharray:7 4}` +
  `.exh{fill:none;stroke:#fff;stroke-opacity:.3;stroke-width:.8;stroke-dasharray:3 4}` +
  `.eF{fill:#fff;fill-opacity:.035}.sc{fill:none;stroke:${NV4};stroke-opacity:.6;stroke-width:.75}`;

/** desenha os andares (lista de estrutura()) na ordem de pintura correta */
function desenhaAndares(P, andares, extra = {}) {
  let s = '';
  for (const a of andares) {
    for (const it of a.itens) {
      s += isoBox(P, it);
      if (extra.pos) s += extra.pos(a, it);
    }
    if (a.laje) s += isoBox(P, a.laje, 'L');
    if (extra.aposLaje) s += extra.aposLaje(a);
  }
  return s;
}

/** fundações tracejadas (blocos + estacas) sob cada pilar */
function fundacoesIso(P, xs, ys, { prof = 3.2 } = {}) {
  let d = '';
  for (const x of xs)
    for (const y of ys) {
      d += isoBoxEdges(P, bx(x - 0.45, x + 0.45, y - 0.45, y + 0.45, -1.0, -0.2));
      for (const dx of [-0.22, 0.22]) d += D([P(x + dx, y, -1.0), P(x + dx, y, -1.0 - prof)]);
    }
  return pa(d, { class: 'fd' });
}

const SVGS = {};

/* ------------------------------------------------------------------ */
/* HERO — estrutura isométrica em execução                             */
/* ------------------------------------------------------------------ */
SVGS['hero-estrutura'] = () => {
  const W = 1200;
  const H = 1000;
  const th = TH_AZUL;
  const xs = [0, 4.4, 9.2, 14, 18.4];
  const ys = [0, 5, 10];
  const X1 = 18.4;
  const Y1 = 10;
  const col = [0.3, 0.3];
  const P = isoFitAuto(
    [
      [-1.2, -1.2, 0],
      [X1 + 4.4, -1.2, 0],
      [X1 + 4.4, Y1, 0],
      [0, Y1 + 4.4, 0],
      [-1.2, Y1 + 4.4, 0],
      [0, 0, 16.2],
      [-6, Y1, 0],
    ],
    [70, 70, 1150, 905],
  );
  const andares = estrutura({ xs, ys, zs: [0, 3, 6, 9, 12], col });
  // 5º pavimento em execução: pilares concretados até +14,40 com esperas; à direita, só arranques
  const exec = [];
  for (const x of xs)
    for (const y of ys) exec.push({ x, y, feito: x <= 9.2 });
  exec.sort((a, b) => a.x + a.y - (b.x + b.y));
  let s5 = '';
  let rb = '';
  for (const c of exec) {
    if (c.feito) {
      s5 += isoBox(P, bx(c.x - 0.15, c.x + 0.15, c.y - 0.15, c.y + 0.15, 12, 14.4));
      s5 += pa(esperas(P, c.x, c.y, 14.4, { h: 1.0, estribos: 2 }), { class: 'rb' });
    } else {
      rb += pa(esperas(P, c.x, c.y, 12, { h: 0.75, estribos: 1 }), { class: 'rb' });
    }
  }
  // fantasma do que falta executar
  let gh = '';
  for (const c of exec) if (!c.feito) gh += isoBoxEdges(P, bx(c.x - 0.15, c.x + 0.15, c.y - 0.15, c.y + 0.15, 12, 14.88));
  gh += isoBoxEdges(P, bx(-0.15, X1 + 0.15, -0.15, Y1 + 0.15, 14.88, 15));

  const body = [
    isoEixos(P, th, xs, ys, { ext: 3.4, r: 0.55, fs: 12 }),
    isoCotaX(P, th, xs, Y1 + 1.5, { from: Y1 + 0.4 }),
    isoCotaX(P, th, [0, X1], Y1 + 2.5, { from: null }),
    isoCotaY(P, th, ys, X1 + 1.5, { from: X1 + 0.4 }),
    isoCotaY(P, th, [0, Y1], X1 + 2.5, { from: null }),
    desenhaAndares(P, andares),
    rb,
    s5,
    pa(gh, { class: 'gh' }),
    T(0, 0, 'LAJE L401 · h = 12 cm', { m: P.m('gx', 11.6, 6.3, 12), fs: 11, fill: NV4, ls: 0.8 }),
    isoNiveis(P, th, -0.15, Y1 + 0.15, [
      [0, '+0,00', 'TÉRREO'],
      [3, '+3,00', '1º PAV.'],
      [6, '+6,00', '2º PAV.'],
      [9, '+9,00', '3º PAV.'],
      [12, '+12,00', '4º PAV.'],
      [15, '+15,00', 'COBERTURA'],
    ]),
    prancha(th, W, H, 'ESTRUTURA — PERSPECTIVA ISOMÉTRICA', { escala: 'SEM ESCALA', moldura: false, folha: '01/12' }),
  ];
  return svgDoc({ w: W, h: H, th, grid: true, css: CSS_ISO, body: body.join('') });
};

/* ------------------------------------------------------------------ */
/* Isométricos (azul)                                                  */
/* ------------------------------------------------------------------ */
SVGS['isometrico-multifamiliar'] = () => {
  const W = 1200;
  const H = 900;
  const th = TH_AZUL;
  const xs = [0, 4.2, 8.6, 12.8];
  const ys = [0, 4.6, 9.2];
  const X1 = 12.8;
  const Y1 = 9.2;
  const P = isoFitAuto(
    [
      [-1.2, -1.2, 0],
      [X1 + 4.4, -1.2, 0],
      [X1 + 4.4, Y1, 0],
      [0, Y1 + 4.4, 0],
      [-1.2, Y1 + 4.4, 0],
      [0, 0, 15],
      [X1, Y1, -4.4],
      [-6.5, Y1, 0],
    ],
    [60, 60, 1150, 790],
  );
  const andares = estrutura({ xs, ys, zs: [0, 3, 6, 9, 12] });
  const cx = bx(4.2 - 0.15, 8.6 + 0.15, -0.15, 4.6 + 0.15, 12, 14.6);
  const body = [
    fundacoesIso(P, xs, ys),
    isoEixos(P, th, xs, ys, { ext: 3.4 }),
    isoCotaX(P, th, xs, Y1 + 1.5, { from: Y1 + 0.4 }),
    isoCotaY(P, th, ys, X1 + 1.5, { from: X1 + 0.4 }),
    desenhaAndares(P, andares),
    isoBox(P, cx),
    pa(D([P(4.05, 4.45, 14.45), P(8.75, 4.45, 14.45), P(8.75, -0.15, 14.45)]), { class: 'gh' }),
    T(0, 0, 'RESERVATÓRIO', { m: P.m('gx', 4.9, 2.9, 14.6), fs: 10, fill: NV4, ls: 0.8 }),
    T(0, 0, 'L401 · h = 12', { m: P.m('gx', 9.3, 6.6, 12), fs: 10.5, fill: NV4, ls: 0.6 }),
    (() => {
      const [ax, ay] = P(0, Y1, -2.6);
      return chamada(th, ax, ay, ax - 60, ay + 70, 'BLOCOS SOBRE ESTACAS', { anchor: 'end', sub: 'HÉLICE CONTÍNUA Ø 30 cm', fs: 10 });
    })(),
    isoNiveis(P, th, -0.15, Y1 + 0.15, [
      [0, '+0,00', 'TÉRREO'],
      [3, '+3,00', '1º PAV.'],
      [6, '+6,00', '2º PAV.'],
      [9, '+9,00', '3º PAV.'],
      [12, '+12,00', 'COBERTURA'],
    ]),
    legenda(th, 60, 70, 'ISOMÉTRICA ESTRUTURAL', 'SEM ESCALA'),
    prancha(th, W, H, 'ISOMÉTRICA — EDIFÍCIO MULTIFAMILIAR', { escala: 'SEM ESCALA', folha: '03/08' }),
  ];
  return svgDoc({ w: W, h: H, th, grid: true, css: CSS_ISO, body: body.join('') });
};

SVGS['isometrico-edificio6'] = () => {
  const W = 1200;
  const H = 900;
  const th = TH_AZUL;
  const xs = [0, 4.5, 9, 13.5];
  const ys = [0, 5, 10];
  const X1 = 13.5;
  const Y1 = 10;
  const P = isoFitAuto(
    [
      [-1.2, -1.2, 0],
      [X1 + 4.4, -1.2, 0],
      [X1 + 4.4, Y1, 0],
      [0, Y1 + 5.4, 0],
      [-1.2, Y1 + 5.4, 0],
      [0, 0, 18.4],
      [-7.2, Y1, 0],
    ],
    [60, 50, 1150, 800],
  );
  const andares = estrutura({ xs, ys, zs: [0, 3, 6, 9, 12] });
  // 5º pavimento: pilares com esperas
  let s5 = '';
  const cols = [];
  for (const x of xs) for (const y of ys) cols.push([x, y]);
  cols.sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
  for (const [x, y] of cols) {
    s5 += isoBox(P, bx(x - 0.15, x + 0.15, y - 0.15, y + 0.15, 12, 14.4));
    s5 += pa(esperas(P, x, y, 14.4, { h: 0.9 }), { class: 'rb' });
  }
  // fantasma: laje do 5º e 6º pavimento
  let gh = '';
  gh += isoBoxEdges(P, bx(-0.15, X1 + 0.15, -0.15, Y1 + 0.15, 14.88, 15));
  for (const [x, y] of cols) gh += isoBoxEdges(P, bx(x - 0.15, x + 0.15, y - 0.15, y + 0.15, 15, 17.88));
  gh += isoBoxEdges(P, bx(-0.15, X1 + 0.15, -0.15, Y1 + 0.15, 17.88, 18));
  // andaime fachadeiro na face +y
  const ya = Y1 + 1.0;
  const yb = Y1 + 2.0;
  let sc = '';
  const xa = [-0.6, 1.6, 3.8, 6.0, 8.2, 10.4, 12.6, 14.1];
  const za = [0, 2, 4, 6, 8, 10, 12, 13.4];
  for (const x of xa) for (const y of [ya, yb]) sc += D([P(x, y, 0), P(x, y, 13.4)]);
  for (const z of za) {
    for (const y of [ya, yb]) sc += D([P(xa[0], y, z), P(xa[xa.length - 1], y, z)]);
    for (const x of xa) sc += D([P(x, Y1 + 0.3, z), P(x, yb, z)]);
  }
  for (let i = 0; i < xa.length - 1; i += 2)
    for (let k = 0; k < za.length - 1; k++) sc += D([P(xa[i], yb, za[k]), P(xa[i + 1], yb, za[k + 1])]);
  const body = [
    isoEixos(P, th, xs, ys, { ext: 4.4 }),
    isoCotaX(P, th, xs, Y1 + 3.3, { from: yb + 0.3 }),
    isoCotaY(P, th, ys, X1 + 1.5, { from: X1 + 0.4 }),
    desenhaAndares(P, andares),
    s5,
    pa(gh, { class: 'gh' }),
    pa(sc, { class: 'sc' }),
    isoNiveis(P, th, -0.15, Y1 + 0.15, [
      [0, '+0,00', 'TÉRREO'],
      [3, '+3,00', '1º PAV.'],
      [6, '+6,00', '2º PAV.'],
      [9, '+9,00', '3º PAV.'],
      [12, '+12,00', '4º PAV.'],
      [15, '+15,00', '5º PAV.'],
      [18, '+18,00', 'COBERTURA'],
    ], { len: 110 }),
    legenda(th, 60, 70, 'ISOMÉTRICA — ESTRUTURA EM EXECUÇÃO', 'SEM ESCALA'),
    prancha(th, W, H, 'ISOMÉTRICA — EDIFÍCIO 6 PAVIMENTOS', { escala: 'SEM ESCALA', folha: '02/14' }),
  ];
  return svgDoc({ w: W, h: H, th, grid: true, css: CSS_ISO, body: body.join('') });
};

SVGS['isometrico-ampliacao'] = () => {
  const W = 1200;
  const H = 900;
  const th = TH_AZUL;
  const xs = [0, 3.8, 7.4, 11];
  const ys = [0, 4.25, 8.5];
  const X1 = 11;
  const Y1 = 8.5;
  const P = isoFitAuto(
    [
      [-1.2, -1.2, 0],
      [X1 + 4.4, -1.2, 0],
      [X1 + 4.4, Y1, 0],
      [0, Y1 + 4.4, 0],
      [-1.2, Y1 + 4.4, 0],
      [0, 0, 7.4],
      [-6.2, Y1, 0],
    ],
    [60, 90, 1150, 790],
  );
  const casa = bx(-0.15, X1 + 0.15, -0.15, Y1 + 0.15, 0, 3.0);
  // existente: faces transparentes + arestas tracejadas (ocultas mais fracas)
  const f = (q) => D(q.map((p) => P(...p)), 1);
  const { x0, x1, y0, y1, z0, z1 } = casa;
  let ex = '';
  let exh = '';
  ex += D([P(x1, y0, z0), P(x1, y1, z0), P(x0, y1, z0)]);
  ex += D([P(x1, y0, z0), P(x1, y0, z1)]) + D([P(x1, y1, z0), P(x1, y1, z1)]) + D([P(x0, y1, z0), P(x0, y1, z1)]);
  ex += D([P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1)], 1);
  exh += D([P(x0, y0, z0), P(x1, y0, z0)]) + D([P(x0, y0, z0), P(x0, y1, z0)]) + D([P(x0, y0, z0), P(x0, y0, z1)]);
  // aberturas existentes (tracejadas) nas faces +y e +x
  const jan = (u0, u1, v0, v1, face) =>
    face === 'y'
      ? D([P(u0, y1, v0), P(u1, y1, v0), P(u1, y1, v1), P(u0, y1, v1)], 1)
      : D([P(x1, u0, v0), P(x1, u1, v0), P(x1, u1, v1), P(x1, u0, v1)], 1);
  ex += jan(1.0, 2.6, 1.0, 2.2, 'y') + jan(4.4, 5.4, 0, 2.1, 'y') + jan(6.4, 9.6, 1.0, 2.2, 'y');
  ex += jan(1.2, 3.0, 1.0, 2.2, 'x') + jan(5.0, 7.0, 1.0, 2.2, 'x');
  const faces =
    pa(f([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]), { class: 'eF' }) +
    pa(f([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]]), { class: 'eF' });
  const novo = estrutura({ xs, ys, zs: [3.0, 6.0] });
  // vigas de apoio (transição) sobre a laje existente
  const vt = [];
  for (const y of ys) vt.push({ ...bx(-0.1, X1 + 0.1, y - 0.1, y + 0.1, 3.0, 3.25), cx: X1 / 2, cy: y });
  const [ax, ay] = P(X1 + 0.15, 2.0, 1.5);
  const [bx1, by1] = P(X1 * 0.5, 0, 6.0);
  const body = [
    isoEixos(P, th, xs, ys, { ext: 3.4 }),
    isoCotaX(P, th, xs, Y1 + 1.5, { from: Y1 + 0.4 }),
    isoCotaY(P, th, ys, X1 + 1.5, { from: X1 + 0.4 }),
    faces,
    pa(exh, { class: 'exh' }),
    pa(ex, { class: 'ex' }),
    vt.map((b) => isoBox(P, b)).join(''),
    desenhaAndares(P, novo),
    chamada(th, ax, ay, ax + 110, ay - 90, 'EXISTENTE', { sub: 'TÉRREO EM ALVENARIA' }),
    chamada(th, bx1, by1 - 4, bx1 + 170, by1 - 70, 'AMPLIAÇÃO', { sub: 'NOVO PAVIMENTO EM CONCRETO ARMADO' }),
    isoNiveis(P, th, -0.15, Y1 + 0.15, [
      [0, '+0,00', 'TÉRREO'],
      [3.0, '+3,00', 'PAV. SUPERIOR'],
      [6.0, '+6,00', 'COBERTURA'],
    ]),
    legenda(th, 60, 70, 'ISOMÉTRICA — AMPLIAÇÃO', 'SEM ESCALA'),
    prancha(th, W, H, 'ISOMÉTRICA — AMPLIAÇÃO RESIDENCIAL', { escala: 'SEM ESCALA', folha: '02/05' }),
  ];
  return svgDoc({ w: W, h: H, th, grid: true, css: CSS_ISO, body: body.join('') });
};

/* ------------------------------------------------------------------ */
/* PNGs de marca                                                       */
/* ------------------------------------------------------------------ */
function ogSVG() {
  const W = 1200;
  const H = 630;
  const th = TH_AZUL;
  const xs = [0, 4.2, 8.4, 12.6];
  const ys = [0, 4.5, 9];
  const P = isoFitAuto(
    [
      [-1, -1, 0],
      [12.6 + 3.6, -1, 0],
      [0, 9 + 3.6, 0],
      [0, 0, 12.5],
      [12.6 + 3.6, 9, 0],
    ],
    [735, 40, 1170, 600],
  );
  const andares = estrutura({ xs, ys, zs: [0, 3, 6, 9] });
  let rb = '';
  const cols = [];
  for (const x of xs) for (const y of ys) cols.push([x, y]);
  cols.sort((a, b) => a[0] + a[1] - (b[0] + b[1]));
  let s4 = '';
  for (const [x, y] of cols) {
    if (x <= 4.2) {
      s4 += isoBox(P, bx(x - 0.15, x + 0.15, y - 0.15, y + 0.15, 9, 11.2));
      s4 += pa(esperas(P, x, y, 11.2, { h: 0.9 }), { class: 'rb' });
    } else rb += pa(esperas(P, x, y, 9, { h: 0.7, estribos: 1 }), { class: 'rb' });
  }
  const ff = "Georgia, 'Times New Roman', serif";
  const sf = 'Arial, Helvetica, sans-serif';
  const body = [
    G({ opacity: 0.62 }, isoEixos(P, th, xs, ys, { ext: 2.6, r: 0.5, fs: 10 }), desenhaAndares(P, andares), rb, s4),
    `<rect width="720" height="${H}" fill="url(#fade)"/>`,
    marca(LOGO, 80, 66, 450, '#fff'),
    ln(80, 268, 150, 268, { stroke: NV4, 'stroke-width': 2 }),
    T(80, 330, 'Cálculo estrutural seguro', { ff, fs: 38, fill: '#fff' }),
    T(80, 378, 'e econômico para arquitetos', { ff, fs: 38, fill: '#fff' }),
    T(80, 426, 'e construtoras', { ff, fs: 38, fill: '#fff' }),
    T(80, 500, '+7 anos · +700 projetos entregues', { ff: sf, fs: 21, fill: NV4, ls: 0.6 }),
    T(80, 566, 'albanoluz.com', { ff: sf, fs: 15, fill: '#fff', op: 0.55, ls: 2.5 }),
  ];
  const fade = `<linearGradient id="fade" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="${NAVY}" stop-opacity=".9"/><stop offset=".72" stop-color="${NAVY}" stop-opacity=".6"/><stop offset="1" stop-color="${NAVY}" stop-opacity="0"/></linearGradient>`;
  return svgDoc({ w: W, h: H, th, grid: true, css: CSS_ISO, defs: [fade], body: body.join('') });
}

/* ------------------------------------------------------------------ */
/* Fachadas (elevações em papel)                                       */
/* ------------------------------------------------------------------ */
const CSS_EL =
  `.o{fill:none;stroke:${NAVY};stroke-width:1.5;stroke-linejoin:round}` +
  `.w{fill:#FBFBF9;stroke:${NAVY};stroke-width:1.2;stroke-linejoin:round}` +
  `.w2{fill:#E7E7E3;stroke:${NAVY};stroke-width:1.1;stroke-linejoin:round}` +
  `.w3{fill:#D6D6D2;stroke:${NAVY};stroke-width:1}` +
  `.fr{fill:#fff;stroke:${NAVY};stroke-width:.9}` +
  `.gl{fill:#CFD8E4;stroke:${NAVY};stroke-width:.6}` +
  `.gl2{fill:#DCE3EC;fill-opacity:.55;stroke:${NAVY};stroke-width:.8}` +
  `.mu{fill:none;stroke:${NAVY};stroke-width:.8}` +
  `.rf{fill:none;stroke:#fff;stroke-width:1.4;stroke-linecap:round}` +
  `.pt{fill:#fff;stroke:${NAVY};stroke-width:.7}` +
  `.th{fill:none;stroke:${GRAF};stroke-width:.5}` +
  `.tn{fill:none;stroke:${NAVY};stroke-width:.8}` +
  `.sh{fill:${NAVY};fill-opacity:.1}` +
  `.dk{fill:#3A4150;stroke:${NAVY};stroke-width:.9}` +
  `.md{fill:url(#mad);stroke:${NAVY};stroke-width:.9}` +
  `.mt{fill:url(#met);stroke:${NAVY};stroke-width:1}` +
  `.tl{fill:url(#telha);stroke:${NAVY};stroke-width:1.1;stroke-linejoin:round}` +
  `.trs{fill:none;stroke:#8C929C;stroke-width:1.6}.trf{fill:${PAPEL}}.trk{fill:none;stroke:#8C929C;stroke-width:.9}` +
  `.nw{fill:url(#hn);stroke:${NAVY};stroke-width:1.4;stroke-dasharray:8 4}` +
  `.nd{fill:none;stroke:${NAVY};stroke-width:1;stroke-dasharray:6 3}` +
  `.gx{fill:#FAFAF8;stroke:${GRAF};stroke-width:1.2}`;

/** ferramentas de elevação: u (m) na horizontal, h (m) na vertical */
function elev(s, OX, GY) {
  const X = (u) => OX + u * s;
  const Y = (h) => GY - h * s;
  const R = (u0, h0, u1, h1, cls, a = {}) => rc(X(u0), Y(h1), (u1 - u0) * s, (h1 - h0) * s, { class: cls, ...a });
  const L = (u0, h0, u1, h1, cls = 'th') => ln(X(u0), Y(h0), X(u1), Y(h1), { class: cls });
  const Pg = (arr, cls) => pg(arr.map(([u, h]) => [X(u), Y(h)]), { class: cls });
  /** linhas horizontais repetidas (frisos, réguas de portão) */
  const hLines = (u0, u1, h0, h1, step, cls = 'th') => {
    let d = '';
    for (let h = h0 + step; h < h1 - 1e-6; h += step) d += `M${N(X(u0))} ${N(Y(h))}H${N(X(u1))}`;
    return d ? pa(d, { class: cls }) : '';
  };
  const vLines = (u0, u1, h0, h1, step, cls = 'th') => {
    let d = '';
    for (let u = u0 + step; u < u1 - 1e-6; u += step) d += `M${N(X(u))} ${N(Y(h0))}V${N(Y(h1))}`;
    return d ? pa(d, { class: cls }) : '';
  };
  function jan(u0, h0, u1, h1, o = {}) {
    const { cols = 2, rows = 1, peit = true, ref = true, f = 0.06, frame = 'fr', glass = 'gl' } = o;
    let r = R(u0, h0, u1, h1, frame) + R(u0 + f, h0 + f, u1 - f, h1 - f, glass);
    const cw = (u1 - u0) / cols;
    const rh = (h1 - h0) / rows;
    let d = '';
    for (let i = 1; i < cols; i++) d += `M${N(X(u0 + i * cw))} ${N(Y(h1 - f))}V${N(Y(h0 + f))}`;
    for (let j = 1; j < rows; j++) d += `M${N(X(u0 + f))} ${N(Y(h0 + j * rh))}H${N(X(u1 - f))}`;
    if (d) r += pa(d, { class: 'mu' });
    if (ref) {
      let rf = '';
      for (let i = 0; i < cols; i++)
        for (let j = 0; j < rows; j++) {
          const pw = cw * s;
          const ph = rh * s;
          if (pw < 16 || ph < 16) continue;
          const x0 = X(u0 + i * cw);
          const y0 = Y(h0 + (j + 1) * rh);
          const k = Math.min(pw, ph);
          rf += `M${N(x0 + pw * 0.58)} ${N(y0 + ph * 0.1)}l${N(-k * 0.3)} ${N(k * 0.3)}`;
          rf += `M${N(x0 + pw * 0.58 + 6)} ${N(y0 + ph * 0.1)}l${N(-k * 0.18)} ${N(k * 0.18)}`;
        }
      if (rf) r += pa(rf, { class: 'rf' });
    }
    if (peit) r += R(u0 - 0.06, h0 - 0.07, u1 + 0.06, h0, 'pt');
    return r;
  }
  function porta(u0, u1, h1, tipo = 'madeira') {
    if (tipo === 'madeira')
      return R(u0, 0, u1, h1, 'fr') + R(u0 + 0.06, 0, u1 - 0.06, h1 - 0.06, 'md') + L(u1 - 0.22, h1 * 0.38, u1 - 0.22, h1 * 0.58, 'tn');
    if (tipo === 'garagem') return R(u0, 0, u1, h1, 'fr') + R(u0 + 0.06, 0, u1 - 0.06, h1 - 0.06, 'w2') + hLines(u0 + 0.06, u1 - 0.06, 0, h1 - 0.06, 0.22, 'th');
    if (tipo === 'metal') return R(u0, 0, u1, h1, 'fr') + R(u0 + 0.06, 0, u1 - 0.06, h1 - 0.06, 'w3') + L(u0 + 0.2, h1 * 0.45, u0 + 0.2, h1 * 0.55, 'tn');
    return '';
  }
  function arvore(u, hc, r, seed = 3, tronco = true) {
    const rnd = rng(seed);
    const cs = [[u, hc, r]];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * 6.283 + rnd() * 0.6;
      const d = r * (0.5 + rnd() * 0.12);
      cs.push([u + Math.cos(a) * d, hc + Math.sin(a) * d * 0.85, r * (0.42 + rnd() * 0.16)]);
    }
    const c = cs.map(([cu, ch, cr]) => ci(X(cu), Y(ch), cr * s)).join('');
    let tr = '';
    if (tronco) {
      const hb = hc - r * 0.35;
      tr = pa(
        `M${N(X(u - 0.1))} ${N(Y(0))}L${N(X(u - 0.05))} ${N(Y(hb))}M${N(X(u + 0.1))} ${N(Y(0))}L${N(X(u + 0.05))} ${N(Y(hb))}`,
        { class: 'trk' },
      );
    }
    return tr + G({ class: 'trs' }, c) + G({ class: 'trf' }, c);
  }
  function arbusto(u0, u1, h, seed = 5) {
    const rnd = rng(seed);
    const cs = [];
    for (let u = u0; u <= u1; u += h * 0.9) cs.push([u + rnd() * 0.1, h * (0.28 + rnd() * 0.08), h * (0.62 + rnd() * 0.12)]);
    const c = cs.map(([cu, ch, cr]) => ci(X(cu), Y(ch), cr * s)).join('');
    return G({ class: 'trs' }, c) + G({ class: 'trf' }, c) + rc(X(u0 - h), Y(0), (u1 - u0 + 2 * h) * s, 20, { fill: PAPEL });
  }
  const niv = (u, h, lab, o = {}) => nivel(TH_PAPEL, X(u), Y(h), lab, { len: 70, ...o });
  return { X, Y, R, L, Pg, hLines, vLines, jan, porta, arvore, arbusto, niv, s };
}

function folhaFachada({ titulo = 'FACHADA FRONTAL', carimbo, folha = '04/08', s, OX, GY, defs = [], leg = [60, 822], desenho }) {
  const E = elev(s, OX, GY);
  const body = desenho(E) + legenda(TH_PAPEL, leg[0], leg[1], titulo, 'ESC. 1:100') + prancha(TH_PAPEL, 1200, 900, carimbo, { folha });
  return svgDoc({ th: TH_PAPEL, css: CSS_EL, defs: ['terra', ...defs], body });
}

SVGS['fachada-residencia'] = () =>
  folhaFachada({
    carimbo: 'FACHADA FRONTAL — RESIDÊNCIA',
    s: 46,
    OX: 290,
    GY: 610,
    defs: ['mad'],
    desenho: (E) => {
      const { X, Y, R, L, jan, porta, arvore, arbusto, niv, hLines, vLines } = E;
      const th = TH_PAPEL;
      return [
        arvore(8.2, 7.1, 1.9, 11),
        // garagem sob o balanço (parede de fundo recuada)
        R(10.5, 0, 16, 3.2, 'w3'),
        hLines(10.5, 16, 0, 3.2, 0.55),
        R(10.5, 2.55, 16, 3.2, 'sh'),
        // térreo
        R(0, 0, 10.5, 3.2, 'w'),
        porta(0.55, 1.75, 2.85, 'madeira'),
        jan(2.3, 0, 10.1, 2.9, { cols: 4, peit: false }),
        R(3.0, 2.62, 10.5, 3.2, 'sh'),
        // laje e guarda-corpo do terraço
        R(0, 3.2, 3.0, 3.45, 'w'),
        R(0.05, 3.45, 2.95, 4.5, 'gl2'),
        L(0, 4.5, 3.0, 4.5, 'o'),
        // volume superior em balanço
        R(3.0, 3.2, 16, 6.6, 'w'),
        L(3.0, 3.45, 16, 3.45, 'tn'),
        L(3.0, 6.3, 16, 6.3, 'tn'),
        jan(4.0, 4.1, 11.8, 5.9, { cols: 5 }),
        R(12.3, 3.75, 15.5, 6.1, 'md'),
        vLines(12.3, 15.5, 3.75, 6.1, 0.32, 'tn'),
        // torre da escada em concreto aparente
        R(-2.2, 0, 0, 7.2, 'w2'),
        hLines(-2.2, 0, 0, 7.2, 0.6),
        vLines(-2.2, 0, 0, 7.2, 1.1),
        jan(-1.35, 1.0, -0.85, 6.4, { cols: 1, rows: 4, peit: false, ref: false }),
        arbusto(-2.0, -0.4, 0.8, 7),
        arbusto(12.6, 15.6, 0.7, 9),
        arvore(-3.9, 3.5, 1.35, 5),
        terreno(th, X(-5.6), X(16.2), Y(0)),
        niv(16.3, 0, '+0,00', { sub: 'TÉRREO' }),
        niv(16.3, 3.2, '+3,20', { sub: 'PAV. SUPERIOR' }),
        niv(16.3, 6.6, '+6,60', { sub: 'PLATIBANDA' }),
        niv(16.3, 7.2, '+7,20'),
        cotaH(th, [-2.2, 0, 3.0, 10.5, 16].map(X), Y(0) + 42, { s: E.s, from: Y(0) + 18 }),
        cotaH(th, [-2.2, 16].map(X), Y(0) + 70, { s: E.s }),
      ].join('');
    },
  });

SVGS['fachada-multifamiliar'] = () =>
  folhaFachada({
    carimbo: 'FACHADA FRONTAL — MULTIFAMILIAR',
    s: 40,
    OX: 250,
    GY: 680,
    defs: [],
    desenho: (E) => {
      const { X, Y, R, L, jan, arvore, arbusto, niv, vLines } = E;
      const th = TH_PAPEL;
      const out = [];
      out.push(R(5.4, 13.2, 10.6, 15.2, 'w2'), L(5.4, 14.9, 10.6, 14.9, 'tn'), R(7.55, 13.2, 8.45, 14.6, 'w3'));
      out.push(R(0, 0, 16, 13.2, 'w'));
      out.push(R(7.2, 3.0, 8.8, 13.2, 'w2'));
      out.push(L(0, 12.9, 16, 12.9, 'tn'));
      // térreo
      out.push(R(0.5, 0, 5.1, 2.6, 'fr'), vLines(0.5, 5.1, 0, 2.6, 0.18, 'tn'));
      out.push(R(5.6, 0, 10.4, 2.8, 'w3'), jan(5.8, 0, 10.2, 2.7, { cols: 4, peit: false }));
      out.push(jan(11.2, 0.9, 15.3, 2.5, { cols: 4 }));
      out.push(R(0, 2.8, 16, 3.0, 'w2'));
      for (let f = 1; f <= 3; f++) {
        const h = 3 * f;
        out.push(jan(0.7, h + 1.0, 3.7, h + 2.3, { cols: 2 }));
        out.push(jan(12.3, h + 1.0, 15.3, h + 2.3, { cols: 2 }));
        out.push(jan(7.6, h + 1.2, 8.4, h + 2.3, { cols: 1, ref: false }));
        for (const [a, b] of [
          [4.2, 7.0],
          [9.0, 11.8],
        ]) {
          out.push(jan(a + 0.3, h + 0.05, b - 0.3, h + 2.4, { cols: 2, peit: false }));
          out.push(R(a, h + 0.12, b, h + 1.2, 'gl2'), L(a, h + 1.2, b, h + 1.2, 'o'));
          out.push(R(a - 0.1, h - 0.1, b + 0.1, h + 0.12, 'w'), R(a - 0.1, h - 0.4, b + 0.1, h - 0.1, 'sh'));
        }
        out.push(L(0, h, 4.1, h, 'tn'), L(11.9, h, 16, h, 'tn'));
      }
      out.push(arbusto(11.2, 15.4, 0.6, 3), arvore(-1.6, 3.8, 1.3, 21));
      out.push(terreno(th, X(-3.4), X(19.4), Y(0)));
      const ax = [0, 5.3, 10.7, 16];
      out.push(cotaH(th, ax.map(X), Y(0) + 42, { s: E.s, from: Y(0) + 18 }));
      ax.forEach((u, i) => out.push(eixo(th, X(u), Y(0) + 50, X(u), Y(0) + 62, 'ABCD'[i], { at: 'end', r: 11, fs: 11 })));
      [
        [0, '+0,00', 'TÉRREO'],
        [3, '+3,00', '1º PAV.'],
        [6, '+6,00', '2º PAV.'],
        [9, '+9,00', '3º PAV.'],
        [12, '+12,00', 'COBERTURA'],
        [15.2, '+15,20', 'RESERVATÓRIO'],
      ].forEach(([h, l, sub]) => out.push(niv(16.4, h, l, { sub })));
      return out.join('');
    },
  });

SVGS['fachada-edificio6'] = () =>
  folhaFachada({
    carimbo: 'FACHADA FRONTAL — EDIFÍCIO 6 PAV.',
    s: 29,
    OX: 330,
    GY: 700,
    leg: [60, 70],
    desenho: (E) => {
      const { X, Y, R, L, jan, arbusto, arvore, niv, hLines } = E;
      const th = TH_PAPEL;
      const out = [];
      out.push(R(6, 19.4, 12, 22, 'w2'), L(6, 21.7, 12, 21.7, 'tn'), hLines(6.6, 11.4, 19.9, 21.2, 0.26, 'th'));
      out.push(R(0, 0, 18, 19.4, 'w'));
      out.push(L(0, 19.1, 18, 19.1, 'tn'));
      // pilares salientes nas extremidades
      out.push(R(-0.2, 0, 0.35, 19.4, 'w2'), R(17.65, 0, 18.2, 19.4, 'w2'));
      // térreo
      out.push(R(0.8, 0, 5.2, 2.7, 'dk'));
      out.push(jan(6.4, 0, 11.6, 2.9, { cols: 4, peit: false }));
      out.push(jan(12.8, 0.9, 16.9, 2.6, { cols: 3 }));
      out.push(R(0.35, 3.0, 17.65, 3.2, 'w2'));
      for (let f = 0; f < 5; f++) {
        const h = 3.2 + 3 * f;
        out.push(jan(1.1, h + 1.0, 4.9, h + 2.3, { cols: 3 }));
        out.push(jan(13.1, h + 1.0, 16.9, h + 2.3, { cols: 3 }));
        out.push(jan(7.0, h + 0.05, 11.0, h + 2.4, { cols: 4, peit: false }));
        out.push(R(6.3, h + 0.12, 11.7, h + 1.15, 'gl2'), L(6.3, h + 1.15, 11.7, h + 1.15, 'o'));
        out.push(R(6.2, h - 0.08, 11.8, h + 0.12, 'w'), R(6.2, h - 0.38, 11.8, h - 0.08, 'sh'));
        if (f > 0) out.push(L(0.35, h, 6.2, h, 'tn'), L(11.8, h, 17.65, h, 'tn'));
      }
      out.push(arbusto(12.6, 17.2, 0.6, 13), arvore(-2.2, 3.9, 1.5, 17));
      out.push(terreno(th, X(-4.2), X(21.2), Y(0)));
      const ax = [0, 6, 12, 18];
      out.push(cotaH(th, ax.map(X), Y(0) + 40, { s: E.s, from: Y(0) + 18 }));
      ax.forEach((u, i) => out.push(eixo(th, X(u), Y(0) + 48, X(u), Y(0) + 58, String(i + 1), { at: 'end', r: 11, fs: 11 })));
      [
        [0, '+0,00', 'TÉRREO'],
        [3.2, '+3,20', '1º PAV.'],
        [6.2, '+6,20', '2º PAV.'],
        [9.2, '+9,20', '3º PAV.'],
        [12.2, '+12,20', '4º PAV.'],
        [15.2, '+15,20', '5º PAV.'],
        [18.2, '+18,20', 'COBERTURA'],
        [22, '+22,00', 'RESERVATÓRIO'],
      ].forEach(([h, l, sub]) => out.push(niv(18.5, h, l, { sub })));
      return out.join('');
    },
  });

SVGS['fachada-galpao'] = () =>
  folhaFachada({
    carimbo: 'FACHADA FRONTAL — GALPÃO',
    s: 31,
    OX: 75,
    GY: 640,
    defs: ['met'],
    desenho: (E) => {
      const { X, Y, R, jan, porta, niv, hLines, vLines, arbusto } = E;
      const th = TH_PAPEL;
      const out = [];
      const he = 8.5;
      const sag = 3.0;
      const Rr = (15.4 * 15.4 + sag * sag) / (2 * sag);
      const Ri = (15 * 15 + (sag - 0.1) ** 2) / (2 * (sag - 0.1));
      // oitão com revestimento metálico até o arco
      out.push(
        pa(`M${N(X(0))} ${N(Y(4.5))}V${N(Y(he))}A${N(Ri * E.s)} ${N(Ri * E.s)} 0 0 1 ${N(X(30))} ${N(Y(he))}V${N(Y(4.5))}Z`, {
          class: 'mt',
        }),
      );
      // faixa de policarbonato
      out.push(jan(0.6, 6.4, 29.4, 7.4, { cols: 16, peit: false, ref: false, glass: 'gl' }));
      // cobertura em arco (beiral)
      out.push(
        pa(
          `M${N(X(-0.4))} ${N(Y(he))}A${N(Rr * E.s)} ${N(Rr * E.s)} 0 0 1 ${N(X(30.4))} ${N(Y(he))}L${N(X(30.4))} ${N(Y(he - 0.3))}` +
            `A${N(Rr * E.s)} ${N(Rr * E.s)} 0 0 0 ${N(X(-0.4))} ${N(Y(he - 0.3))}Z`,
          { class: 'w2' },
        ),
      );
      // alvenaria inferior
      out.push(R(0, 0, 30, 4.5, 'w'), hLines(0, 30, 0, 4.5, 0.9, 'th'));
      // pilares pré-moldados
      for (const u of [0, 7.5, 15, 22.5, 30]) out.push(R(Math.max(0, u - 0.25) - (u === 30 ? 0.25 : 0), 0, Math.min(30, u + 0.25) + (u === 0 ? 0.25 : 0), he - 0.2, 'w2'));
      // portões seccionados
      for (const [a, b] of [
        [1.6, 5.9],
        [9.1, 13.4],
      ]) {
        out.push(R(a - 0.15, 0, b + 0.15, 5.15, 'w3'), R(a, 0, b, 5.0, 'fr'), hLines(a, b, 0, 5.0, 0.5, 'tn'));
        out.push(jan(a + 0.3, 3.55, b - 0.3, 3.95, { cols: 6, peit: false, ref: false }));
      }
      // escritório
      out.push(porta(16.2, 17.2, 2.2, 'metal'), jan(18.0, 1.0, 21.6, 2.3, { cols: 3 }));
      out.push(jan(23.6, 1.2, 29.0, 2.5, { cols: 4 }));
      // tubos de queda
      out.push(vLines(7.05, 7.35, 0.1, he - 0.3, 0.1, 'tn'), vLines(22.05, 22.35, 0.1, he - 0.3, 0.1, 'tn'));
      out.push(arbusto(16.0, 21.8, 0.55, 31));
      out.push(terreno(th, X(-1.2), X(31.2), Y(0)));
      const ax = [0, 7.5, 15, 22.5, 30];
      out.push(cotaH(th, ax.map(X), Y(0) + 40, { s: E.s, from: Y(0) + 18 }));
      out.push(cotaH(th, [0, 30].map(X), Y(0) + 66, { s: E.s }));
      ax.forEach((u, i) => out.push(eixo(th, X(u), Y(0) + 72, X(u), Y(0) + 86, String(i + 1), { at: 'end', r: 11, fs: 11 })));
      [
        [0, '+0,00', 'PISO'],
        [5.0, '+5,00', 'PORTÕES'],
        [he, '+8,50', 'BEIRAL'],
        [he + sag, '+11,50', 'CUMEEIRA'],
      ].forEach(([h, l, sub]) => out.push(niv(30.7, h, l, { sub })));
      return out.join('');
    },
  });

SVGS['fachada-sobrado'] = () =>
  folhaFachada({
    carimbo: 'FACHADA — SOBRADOS GEMINADOS',
    s: 50,
    OX: 230,
    GY: 640,
    defs: ['mad', 'telha'],
    desenho: (E) => {
      const { X, Y, R, L, jan, porta, arvore, niv } = E;
      const th = TH_PAPEL;
      const out = [];
      // telhado (água voltada para a rua) e platibandas corta-fogo
      out.push(R(-0.4, 5.9, 15.4, 7.3, 'tl'));
      out.push(R(-0.45, 5.7, 15.45, 5.95, 'w2'));
      out.push(R(0, 0, 15, 5.7, 'w'));
      for (let i = 0; i < 3; i++) {
        const u0 = i * 5;
        const m = i === 1;
        const U = (a) => (m ? u0 + 5 - a : u0 + a);
        const pr = (a, b) => [Math.min(U(a), U(b)), Math.max(U(a), U(b))];
        const [g0, g1] = pr(0.4, 3.0);
        out.push(porta(g0, g1, 2.35, 'garagem'));
        const [d0, d1] = pr(3.5, 4.5);
        out.push(porta(d0, d1, 2.2, 'madeira'));
        const [c0, c1] = pr(3.25, 4.75);
        out.push(R(c0, 2.42, c1, 2.58, 'w'), R(c0, 2.25, c1, 2.42, 'sh'));
        const [w0, w1] = pr(0.6, 2.8);
        out.push(jan(w0, 3.8, w1, 5.1, { cols: 2 }));
        out.push(R(w0 - 0.1, 3.75, w1 + 0.1, 3.85, 'w'), R(w0 - 0.05, 3.85, w1 + 0.05, 4.7, 'gl2'));
        const [b0, b1] = pr(3.5, 4.3);
        out.push(jan(b0, 4.5, b1, 5.1, { cols: 1, ref: false }));
        const [p0, p1] = pr(3.3, 4.7);
        out.push(R(p0, 3.3, p1, 4.2, 'md'));
      }
      out.push(L(0, 2.9, 15, 2.9, 'tn'));
      for (const u of [5, 10]) out.push(R(u - 0.1, 0, u + 0.1, 7.6, 'w2'));
      out.push(R(-0.12, 0, 0.12, 7.6, 'w2'), R(14.88, 0, 15.12, 7.6, 'w2'));
      out.push(arvore(-2.0, 3.3, 1.2, 41));
      out.push(terreno(th, X(-3.6), X(15.6), Y(0)));
      out.push(cotaH(th, [0, 5, 10, 15].map(X), Y(0) + 42, { s: E.s, from: Y(0) + 18 }));
      out.push(cotaH(th, [0, 15].map(X), Y(0) + 70, { s: E.s }));
      out.push(T(X(2.5), Y(0) + 96, 'CASA 01', { fs: 10, fill: GRAF, anchor: 'middle', ls: 1 }));
      out.push(T(X(7.5), Y(0) + 96, 'CASA 02', { fs: 10, fill: GRAF, anchor: 'middle', ls: 1 }));
      out.push(T(X(12.5), Y(0) + 96, 'CASA 03', { fs: 10, fill: GRAF, anchor: 'middle', ls: 1 }));
      [
        [0, '+0,00', 'TÉRREO'],
        [2.9, '+2,90', 'PAV. SUPERIOR'],
        [5.8, '+5,80', 'BEIRAL'],
        [7.6, '+7,60', 'PLATIBANDA'],
      ].forEach(([h, l, sub]) => out.push(niv(15.6, h, l, { sub })));
      return out.join('');
    },
  });

SVGS['fachada-clinica'] = () =>
  folhaFachada({
    carimbo: 'FACHADA FRONTAL — CLÍNICA',
    s: 46,
    OX: 210,
    GY: 620,
    desenho: (E) => {
      const { X, Y, R, L, jan, arvore, arbusto, niv } = E;
      const th = TH_PAPEL;
      const out = [];
      out.push(R(0, 0, 16, 7.8, 'w'));
      out.push(L(0, 7.2, 16, 7.2, 'tn'), L(0, 3.6, 16, 3.6, 'tn'));
      // térreo
      out.push(jan(0.8, 1.1, 4.2, 2.5, { cols: 3 }));
      out.push(jan(11.8, 1.1, 15.2, 2.5, { cols: 3 }));
      out.push(jan(5.3, 0, 10.7, 3.0, { cols: 4, peit: false }));
      out.push(L(8.0, 0, 8.0, 2.4, 'o'), L(7.8, 0.9, 7.8, 1.5, 'o'), L(8.2, 0.9, 8.2, 1.5, 'o'));
      // marquise
      out.push(R(4.9, 2.62, 11.1, 3.0, 'sh'));
      out.push(R(4.4, 3.0, 11.6, 3.35, 'w2'));
      out.push(T(X(8.0), Y(3.0) - 3.2, 'CLÍNICA', { fs: 10, fw: 700, fill: NAVY, anchor: 'middle', ls: 4 }));
      for (const u of [4.75, 11.25]) out.push(R(u - 0.1, 0, u + 0.1, 3.0, 'fr'));
      // pavimento superior com brises verticais
      out.push(jan(0.8, 4.3, 15.2, 6.3, { cols: 8 }));
      let d = '';
      for (let u = 1.05; u < 15.1; u += 0.48) d += rc(X(u), Y(6.5), 0.1 * E.s, 2.35 * E.s, { class: 'w2' });
      out.push(d);
      out.push(R(0.6, 6.5, 15.4, 6.62, 'w2'), R(0.6, 4.1, 15.4, 4.22, 'w2'));
      out.push(arbusto(0.4, 4.4, 0.6, 51), arbusto(11.6, 15.6, 0.6, 52));
      out.push(arvore(-2.2, 3.6, 1.4, 53));
      out.push(terreno(th, X(-3.9), X(16.4), Y(0)));
      out.push(cotaH(th, [0, 4.4, 11.6, 16].map(X), Y(0) + 42, { s: E.s, from: Y(0) + 18 }));
      out.push(cotaH(th, [0, 16].map(X), Y(0) + 70, { s: E.s }));
      [
        [0, '+0,00', 'TÉRREO'],
        [3.6, '+3,60', 'PAV. SUPERIOR'],
        [7.2, '+7,20', 'COBERTURA'],
        [7.8, '+7,80'],
      ].forEach(([h, l, sub]) => out.push(niv(16.3, h, l, { sub })));
      return out.join('');
    },
  });

SVGS['fachada-ampliacao'] = () =>
  folhaFachada({
    carimbo: 'FACHADA — AMPLIAÇÃO RESIDENCIAL',
    s: 50,
    OX: 250,
    GY: 630,
    defs: ['mad', 'hn'],
    desenho: (E) => {
      const { X, Y, R, L, jan, porta, arvore, arbusto, niv } = E;
      const th = TH_PAPEL;
      const out = [];
      // ampliação (a construir)
      out.push(R(0.5, 3.0, 11.5, 6.8, 'nw'));
      out.push(L(0.5, 6.2, 11.5, 6.2, 'nd'));
      for (const [a, b] of [
        [1.3, 3.5],
        [7.0, 10.6],
      ])
        out.push(rc(X(a), Y(5.3), (b - a) * E.s, 1.3 * E.s, { class: 'nd', fill: '#fff' }), L((a + b) / 2, 4.0, (a + b) / 2, 5.3, 'nd'));
      const lx = X(5.25);
      out.push(rc(lx - 78, Y(5.0) - 6, 156, 44, { fill: '#fff', stroke: NAVY, 'stroke-width': 0.8 }));
      out.push(T(lx, Y(5.0) + 14, 'AMPLIAÇÃO', { fs: 15, fw: 700, fill: NAVY, anchor: 'middle', ls: 3 }));
      out.push(T(lx, Y(5.0) + 30, 'PAVIMENTO SUPERIOR', { fs: 8.5, fill: GRAF, anchor: 'middle', ls: 1.4 }));
      // existente
      out.push(R(0, 0, 12, 3.0, 'gx'));
      out.push(R(-0.1, 2.75, 12.1, 3.0, 'gx'));
      out.push(jan(0.8, 1.0, 3.2, 2.2, { cols: 2 }), porta(4.2, 5.2, 2.2, 'madeira'), jan(6.2, 1.0, 8.2, 2.2, { cols: 2 }));
      out.push(porta(8.9, 11.4, 2.3, 'garagem'));
      out.push(arbusto(0.3, 3.6, 0.55, 61), arvore(-2.1, 3.2, 1.25, 62));
      out.push(terreno(th, X(-3.7), X(12.6), Y(0)));
      out.push(chamada(th, X(8.55), Y(1.4), X(13.6), Y(1.4) - 34, 'EXISTENTE', { sub: 'TÉRREO', fs: 10.5 }));
      // legenda de linhas
      const gx = X(-3.6);
      const gy = 118;
      out.push(T(gx, gy, 'LEGENDA', { fs: 10, fw: 700, fill: NAVY, ls: 1.2 }));
      out.push(rc(gx, gy + 12, 34, 16, { class: 'gx' }), T(gx + 44, gy + 24, 'EXISTENTE', { fs: 10, fill: GRAF, ls: 0.4 }));
      out.push(rc(gx, gy + 38, 34, 16, { class: 'nw' }), T(gx + 44, gy + 50, 'A CONSTRUIR (AMPLIAÇÃO)', { fs: 10, fill: GRAF, ls: 0.4 }));
      out.push(cotaH(th, [0, 0.5, 11.5, 12].map(X), Y(0) + 42, { s: E.s, from: Y(0) + 18, labels: ['', '11,00', ''] }));
      out.push(cotaH(th, [0, 12].map(X), Y(0) + 70, { s: E.s }));
      [
        [0, '+0,00', 'TÉRREO EXISTENTE'],
        [3.0, '+3,00', 'PAV. SUPERIOR (NOVO)'],
        [6.2, '+6,20', 'COBERTURA'],
        [6.8, '+6,80'],
      ].forEach(([h, l, sub]) => out.push(niv(12.4, h, l, { sub })));
      return out.join('');
    },
  });

SVGS['fachada-terrea'] = () =>
  folhaFachada({
    carimbo: 'FACHADA FRONTAL — RESIDÊNCIA TÉRREA',
    s: 56,
    OX: 262,
    GY: 600,
    defs: ['mad', 'telha'],
    desenho: (E) => {
      const { X, Y, R, Pg, jan, porta, arvore, arbusto, niv, hLines } = E;
      const th = TH_PAPEL;
      const out = [];
      // telhado em quatro águas
      out.push(Pg([[-0.6, 2.95], [12.6, 2.95], [8.6, 4.8], [3.4, 4.8]], 'tl'));
      out.push(R(-0.65, 2.75, 12.65, 2.95, 'w2'));
      out.push(R(0, 0, 12, 2.75, 'w'));
      out.push(R(7.6, 2.4, 12, 2.75, 'sh'));
      // janelas com veneziana
      for (const [a, b] of [
        [0.9, 2.9],
        [4.1, 6.5],
      ]) {
        out.push(R(a, 1.0, b, 2.2, 'fr'), R(a + 0.06, 1.06, (a + b) / 2, 2.14, 'w2'), hLines(a + 0.06, (a + b) / 2, 1.06, 2.14, 0.09, 'th'));
        out.push(R((a + b) / 2, 1.06, b - 0.06, 2.14, 'gl'), R(a - 0.06, 0.93, b + 0.06, 1.0, 'pt'));
      }
      // varanda
      out.push(R(7.4, 0, 12.4, 0.15, 'w2'));
      out.push(porta(8.4, 9.4, 2.2, 'madeira'), jan(10.1, 1.0, 11.4, 2.2, { cols: 2 }));
      for (const u of [7.75, 12.05]) out.push(R(u - 0.1, 0.15, u + 0.1, 2.75, 'md'));
      out.push(arbusto(0.3, 7.0, 0.55, 71));
      out.push(arvore(14.1, 3.8, 1.4, 72));
      out.push(terreno(th, X(-1.4), X(15.6), Y(0)));
      out.push(cotaH(th, [0, 7.6, 12].map(X), Y(0) + 42, { s: E.s, from: Y(0) + 18 }));
      out.push(cotaH(th, [0, 12].map(X), Y(0) + 70, { s: E.s }));
      [
        [0, '+0,00', 'PISO'],
        [2.75, '+2,75', 'BEIRAL'],
        [4.8, '+4,80', 'CUMEEIRA'],
      ].forEach(([h, l, sub]) => out.push(niv(-0.9, h, l, { sub, dir: -1 })));
      return out.join('');
    },
  });

/* ------------------------------------------------------------------ */
/* Plantas baixas                                                      */
/* ------------------------------------------------------------------ */
const CSS_PL =
  `.pw{fill:${NAVY}}.pwl{fill:#B9BEC8}` +
  `.jn{fill:#fff;stroke:${NAVY};stroke-width:.7}.jl{fill:none;stroke:${NAVY};stroke-width:.6}` +
  `.pf{fill:none;stroke:${NAVY};stroke-width:1.3}.ar{fill:none;stroke:${NAVY};stroke-width:.6;stroke-dasharray:3 2}` +
  `.vg{fill:none;stroke:${GRAF};stroke-width:.6;stroke-dasharray:5 3}` +
  `.mb{fill:none;stroke:#8C929C;stroke-width:.75}.mbf{fill:#E9E9E6;stroke:#8C929C;stroke-width:.75}` +
  `.pz{fill:none;stroke:${GRAF};stroke-width:.35;stroke-opacity:.35}` +
  `.pn{fill:none;stroke:#8C929C;stroke-width:.7;stroke-dasharray:4 3}`;

/** ferramentas de planta: x para a direita, y para baixo, em metros */
function plantaTools(s, OX, OY) {
  const X = (x) => OX + x * s;
  const Y = (y) => OY + y * s;
  const paredes = [];
  const abert = [];
  const amb = [];
  const mobs = [];
  const extra = [];
  function parede(x1, y1, x2, y2, t = 0.15, abs = []) {
    const hor = Math.abs(y1 - y2) < 1e-9;
    const a0 = hor ? Math.min(x1, x2) : Math.min(y1, y2);
    const a1 = hor ? Math.max(x1, x2) : Math.max(y1, y2);
    const c = hor ? y1 : x1;
    const M = (a, n) => (hor ? [X(a), Y(c + n)] : [X(c + n), Y(a)]);
    const piece = (p0, p1) => {
      if (p1 - p0 < 1e-6) return;
      paredes.push(hor ? [p0, c - t / 2, p1, c + t / 2] : [c - t / 2, p0, c + t / 2, p1]);
    };
    let cur = a0 - t / 2;
    const cuts = abs.map((o) => [a0 + o.o, a0 + o.o + o.w, o]).sort((p, q) => p[0] - q[0]);
    for (const [s0, s1, o] of cuts) {
      piece(cur, s0);
      cur = s1;
      const k = o.k || 'p';
      if (k === 'p') {
        const l = o.lado || 1;
        const ah = o.dob === 'e' ? s1 : s0;
        const ao = o.dob === 'e' ? s0 : s1;
        const sg = Math.sign(ao - ah);
        const w = s1 - s0;
        abert.push(pa(D([M(ah, (l * t) / 2), M(ah, l * (t / 2 + w))]), { class: 'pf' }));
        const arc = [];
        for (let i = 0; i <= 12; i++) {
          const th = (i / 12) * (Math.PI / 2);
          arc.push(M(ah + sg * w * Math.sin(th), l * (t / 2 + w * Math.cos(th))));
        }
        abert.push(pa(D(arc), { class: 'ar' }));
      } else if (k === 'p2') {
        // porta de duas folhas
        const l = o.lado || 1;
        const w = (s1 - s0) / 2;
        for (const [ah, sg] of [
          [s0, 1],
          [s1, -1],
        ]) {
          abert.push(pa(D([M(ah, (l * t) / 2), M(ah, l * (t / 2 + w))]), { class: 'pf' }));
          const arc = [];
          for (let i = 0; i <= 10; i++) {
            const th = (i / 10) * (Math.PI / 2);
            arc.push(M(ah + sg * w * Math.sin(th), l * (t / 2 + w * Math.cos(th))));
          }
          abert.push(pa(D(arc), { class: 'ar' }));
        }
      } else if (k === 'j') {
        abert.push(pa(D([M(s0, -t / 2), M(s1, -t / 2), M(s1, t / 2), M(s0, t / 2)], 1), { class: 'jn' }));
        abert.push(pa(D([M(s0, 0), M(s1, 0)]) + D([M(s0, -t / 6), M(s1, -t / 6)]), { class: 'jl' }));
      } else if (k === 'pc') {
        const m = (s0 + s1) / 2;
        abert.push(pa(D([M(s0, -t / 2), M(s1, -t / 2), M(s1, t / 2), M(s0, t / 2)], 1), { class: 'jn' }));
        abert.push(pa(D([M(s0, -t / 5), M(m + 0.08, -t / 5)]) + D([M(m - 0.08, t / 5), M(s1, t / 5)]), { class: 'pf' }));
      } else if (k === 'v') {
        abert.push(pa(D([M(s0, -t / 2), M(s1, -t / 2)]) + D([M(s0, t / 2), M(s1, t / 2)]), { class: 'vg' }));
      } else if (k === 'pg') {
        abert.push(pa(D([M(s0, 0), M(s1, 0)]), { class: 'pf' }) + pa(D([M(s0, -t / 2), M(s1, -t / 2)]), { class: 'vg' }));
      }
    }
    piece(cur, a1 + t / 2);
  }
  /** ambiente: nome + área calculada do retângulo de eixos */
  function ambiente(nome, r, o = {}) {
    const { at = null, area = null, fs = 11, t = 0.17, sub = null } = o;
    const [x0, y0, x1, y1] = r;
    const a = area ?? (x1 - x0 - t) * (y1 - y0 - t);
    const [cx, cy] = at ?? [(x0 + x1) / 2, (y0 + y1) / 2];
    amb.push([nome, cx, cy, a, fs, sub]);
  }
  /** mobiliário em coordenadas locais (metros), com rotação em graus */
  function mob(x, y, rot, fn) {
    const k = (v) => N(v * s);
    const r = (a, b, w, h, cls = '') => `<rect x="${k(a)}" y="${k(b)}" width="${k(w)}" height="${k(h)}"${cls ? ` class="${cls}"` : ''}/>`;
    const rr = (a, b, w, h, q) => `<rect x="${k(a)}" y="${k(b)}" width="${k(w)}" height="${k(h)}" rx="${k(q)}"/>`;
    const l = (a, b, c, d) => `<path d="M${k(a)} ${k(b)}L${k(c)} ${k(d)}"/>`;
    const c = (a, b, q) => `<circle cx="${k(a)}" cy="${k(b)}" r="${k(q)}"/>`;
    const e = (a, b, p, q) => `<ellipse cx="${k(a)}" cy="${k(b)}" rx="${k(p)}" ry="${k(q)}"/>`;
    mobs.push(`<g transform="translate(${N(X(x))} ${N(Y(y))})${rot ? ` rotate(${rot})` : ''}">${fn({ r, rr, l, c, e })}</g>`);
  }
  return { X, Y, s, parede, ambiente, mob, paredes, abert, amb, mobs, extra };
}

/* biblioteca de mobiliário (origem no canto superior esquerdo da peça) */
const MOB = {
  cama: (w, l) => (g) =>
    g.r(0, 0, w, l) +
    (w > 1.2 ? g.rr(0.1, 0.1, w / 2 - 0.15, 0.38, 0.06) + g.rr(w / 2 + 0.05, 0.1, w / 2 - 0.15, 0.38, 0.06) : g.rr(0.12, 0.1, w - 0.24, 0.38, 0.06)) +
    g.l(0, l * 0.36, w, l * 0.36) +
    g.l(0, l * 0.36 + 0.12, w, l * 0.36 + 0.12),
  criado: () => (g) => g.r(0, 0, 0.45, 0.4),
  roupeiro: (w) => (g) => {
    let d = g.r(0, 0, w, 0.6) + g.l(0, 0.3, w, 0.3);
    for (let x = 0.5; x < w - 0.1; x += 0.5) d += g.l(x, 0, x, 0.6);
    return d;
  },
  sofa: (w, d = 0.9) => (g) =>
    g.r(0, 0, w, d) + g.r(0, 0, w, 0.22) + g.r(0, 0, 0.2, d) + g.r(w - 0.2, 0, 0.2, d) + g.l(w / 2, 0.22, w / 2, d),
  poltrona: () => (g) => g.r(0, 0, 0.8, 0.8) + g.r(0, 0, 0.8, 0.2),
  mesa: (w, d, nx = 2, ny = 0) => (g) => {
    let o = g.r(0, 0, w, d);
    const cw = 0.42;
    for (let i = 0; i < nx; i++) {
      const x = (w / nx) * (i + 0.5) - cw / 2;
      o += g.rr(x, -0.5, cw, 0.4, 0.05) + g.rr(x, d + 0.1, cw, 0.4, 0.05);
    }
    for (let j = 0; j < ny; j++) {
      const y = (d / ny) * (j + 0.5) - cw / 2;
      o += g.rr(-0.5, y, 0.4, cw, 0.05) + g.rr(w + 0.1, y, 0.4, cw, 0.05);
    }
    return o;
  },
  mesaRedonda: (r = 0.5) => (g) => g.c(0, 0, r) + [0, 90, 180, 270].map((a) => g.c(Math.cos((a * Math.PI) / 180) * (r + 0.28), Math.sin((a * Math.PI) / 180) * (r + 0.28), 0.2)).join(''),
  bancada: (w, pia = null, cook = null) => (g) => {
    let o = g.r(0, 0, w, 0.6);
    if (pia !== null) o += g.rr(pia, 0.1, 0.75, 0.4, 0.06) + g.c(pia + 0.375, 0.08, 0.03);
    if (cook !== null) for (const [a, b] of [[0.18, 0.17], [0.48, 0.17], [0.18, 0.43], [0.48, 0.43]]) o += g.c(cook + a, b, 0.09);
    return o;
  },
  vaso: () => (g) => g.r(0, 0, 0.4, 0.18) + g.e(0.2, 0.44, 0.17, 0.25),
  lav: () => (g) => g.r(0, 0, 0.55, 0.45) + g.e(0.275, 0.24, 0.18, 0.13),
  box: (w, d) => (g) => g.r(0, 0, w, d) + g.c(w / 2, d / 2, 0.05) + g.l(0.05, d - 0.06, w - 0.05, d - 0.06),
  carro: () => (g) => g.rr(0, 0, 1.8, 4.4, 0.35) + g.l(0.12, 1.3, 1.68, 1.3) + g.l(0.18, 1.3, 0.3, 2.9) + g.l(1.62, 1.3, 1.5, 2.9) + g.l(0.3, 2.9, 1.5, 2.9) + g.l(0.3, 3.5, 1.5, 3.5),
  tanque: () => (g) => g.r(0, 0, 0.6, 0.55) + g.rr(0.08, 0.1, 0.44, 0.36, 0.05) + g.r(0.8, 0, 0.6, 0.6) + g.c(1.1, 0.3, 0.22),
  rack: (w) => (g) => g.r(0, 0, w, 0.42) + g.r(w * 0.15, 0.42, w * 0.7, 0.06),
  maca: () => (g) => g.r(0, 0, 0.65, 1.9) + g.rr(0.08, 0.06, 0.49, 0.3, 0.05),
  escritorio: () => (g) => g.r(0, 0, 1.3, 0.65) + g.rr(0.4, 0.75, 0.5, 0.45, 0.08) + g.rr(0.12, -0.6, 0.45, 0.42, 0.06) + g.rr(0.72, -0.6, 0.45, 0.42, 0.06),
  cadeiras: (n) => (g) => Array.from({ length: n }, (_, i) => g.rr(i * 0.55, 0, 0.48, 0.48, 0.06)).join(''),
  balcao: (w, d) => (g) => g.r(0, 0, w, 0.6) + g.r(w - 0.6, 0.6, 0.6, d - 0.6) + g.rr(w * 0.35, 0.8, 0.5, 0.45, 0.08),
};

/** escada em planta: degraus paralelos a x ao longo de y */
function escadaPlanta(P, x0, y0, w, n, piso, sobe = 'SOBE') {
  let d = '';
  for (let i = 0; i <= n; i++) d += `M${N(P.X(x0))} ${N(P.Y(y0 + i * piso))}H${N(P.X(x0 + w))}`;
  const L = n * piso;
  d += `M${N(P.X(x0))} ${N(P.Y(y0))}V${N(P.Y(y0 + L))}M${N(P.X(x0 + w))} ${N(P.Y(y0))}V${N(P.Y(y0 + L))}`;
  const xm = P.X(x0 + w / 2);
  const seta = `M${N(xm)} ${N(P.Y(y0 + L - 0.15))}V${N(P.Y(y0 + 0.25))}M${N(xm - 4)} ${N(P.Y(y0 + 0.25) + 7)}L${N(xm)} ${N(P.Y(y0 + 0.25))}L${N(xm + 4)} ${N(P.Y(y0 + 0.25) + 7)}`;
  return (
    pa(d, { fill: 'none', stroke: GRAF, 'stroke-width': 0.6 }) +
    ci(xm, P.Y(y0 + L - 0.15), 2.2, { fill: GRAF }) +
    pa(seta, { fill: 'none', stroke: GRAF, 'stroke-width': 0.8 }) +
    T(xm + 5, P.Y(y0 + L * 0.55), sobe, { fs: 8, fill: GRAF, rot: -90, anchor: 'middle', ls: 0.8 })
  );
}

/** símbolo de nível em planta (círculo com quadrantes) */
function nivelPlanta(x, y, lab, col = NAVY) {
  const r = 6;
  return (
    ci(x, y, r, { fill: '#fff', stroke: col, 'stroke-width': 0.8 }) +
    pa(`M${N(x)} ${N(y)}L${N(x + r)} ${N(y)}A${r} ${r} 0 0 0 ${N(x)} ${N(y - r)}ZM${N(x)} ${N(y)}L${N(x - r)} ${N(y)}A${r} ${r} 0 0 0 ${N(x)} ${N(y + r)}Z`, { fill: col }) +
    T(x + r + 4, y + 3.5, lab, { fs: 9, fill: col, fw: 600 })
  );
}

/** compila a planta em camadas */
function renderPlanta(P, o = {}) {
  const { parede = 'pw', mobilia = true, rotulos = true, areas = true, corNome = NAVY, fsMul = 1 } = o;
  const d = P.paredes.map(([x0, y0, x1, y1]) => `M${N(P.X(x0))} ${N(P.Y(y0))}H${N(P.X(x1))}V${N(P.Y(y1))}H${N(P.X(x0))}Z`).join('');
  let lab = '';
  if (rotulos)
    for (const [nome, cx, cy, a, fs, sub] of P.amb) {
      const f = fs * fsMul;
      lab += T(P.X(cx), P.Y(cy), nome, { fs: f, fw: 700, fill: corNome, anchor: 'middle', ls: 0.4 });
      if (areas) lab += T(P.X(cx), P.Y(cy) + f + 2, `A = ${br(a)} m²`, { fs: f - 2, fill: GRAF, anchor: 'middle' });
      if (sub) lab += T(P.X(cx), P.Y(cy) + 2 * f + 2, sub, { fs: f - 2.5, fill: GRAF, anchor: 'middle' });
    }
  return (mobilia ? G({ class: 'mb' }, P.mobs) : '') + pa(d, { class: parede }) + P.abert.join('') + P.extra.join('') + lab;
}

/** cotas externas encadeadas (topo e esquerda) */
function cotasPlanta(P, xs, ys, o = {}) {
  const th = TH_PAPEL;
  const { top = true, left = true, gap = 34 } = o;
  const X0 = xs[0];
  const Y0 = ys[0];
  let s = '';
  if (top) {
    s += cotaH(th, xs.map(P.X), P.Y(Y0) - gap, { s: P.s, from: P.Y(Y0) - 10 });
    s += cotaH(th, [xs[0], xs[xs.length - 1]].map(P.X), P.Y(Y0) - gap - 26, { s: P.s });
  }
  if (left) {
    s += cotaV(th, ys.map(P.Y), P.X(X0) - gap, { s: P.s, from: P.X(X0) - 10 });
    s += cotaV(th, [ys[0], ys[ys.length - 1]].map(P.Y), P.X(X0) - gap - 26, { s: P.s });
  }
  return s;
}

/* ---- definições das plantas (reutilizadas por elétrico e incêndio) ---- */
function defResidencia(P, mob = true) {
  const E = 0.2;
  const { parede: w, ambiente: a, mob: m } = P;
  // contorno
  w(0, 0, 16, 0, E, [
    { k: 'j', o: 0.9, w: 1.8 },
    { k: 'j', o: 4.25, w: 0.7 },
    { k: 'j', o: 6.5, w: 1.8 },
    { k: 'j', o: 10.2, w: 2.2 },
    { k: 'j', o: 14.3, w: 0.8 },
  ]);
  w(0, 11, 16, 11, E, [
    { k: 'pg', o: 0.5, w: 4.6 },
    { k: 'j', o: 6.8, w: 1.2 },
    { k: 'pc', o: 9.9, w: 3.6 },
    { k: 'p', o: 14.3, w: 1.0, lado: -1, dob: 'e' },
  ]);
  w(0, 0, 0, 11, E, [{ k: 'j', o: 1.1, w: 1.6 }]);
  w(16, 0, 16, 11, E, [{ k: 'j', o: 6.0, w: 3.0 }]);
  // internas
  w(0, 4.0, 16, 4.0, 0.15, [
    { o: 2.5, w: 0.8, lado: -1 },
    { o: 4.3, w: 0.7, lado: -1 },
    { o: 6.0, w: 0.8, lado: -1 },
    { o: 9.6, w: 0.8, lado: -1 },
  ]);
  w(3.6, 0, 3.6, 4.0);
  w(5.6, 0, 5.6, 4.0);
  w(9.2, 0, 9.2, 4.0);
  w(13.4, 0, 13.4, 4.0, 0.15, [
    { o: 0.9, w: 0.7, lado: 1 },
    { k: 'v', o: 2.9, w: 0.8 },
  ]);
  w(13.4, 2.6, 16, 2.6);
  w(0, 5.2, 9.2, 5.2, 0.15, [{ o: 4.6, w: 0.8, lado: 1, dob: 'e' }]);
  w(5.6, 5.2, 5.6, 11, 0.15, [{ o: 4.3, w: 0.8, lado: 1 }]);
  w(5.6, 8.6, 9.2, 8.6, 0.15, [{ o: 0.6, w: 0.8, lado: 1 }]);
  w(9.2, 8.6, 9.2, 11);
  a('DORMITÓRIO 1', [0, 0, 3.6, 4.0], { at: [1.8, 2.7] });
  a('BANHO', [3.6, 0, 5.6, 4.0], { at: [4.6, 2.9], fs: 10 });
  a('DORMITÓRIO 2', [5.6, 0, 9.2, 4.0], { at: [7.4, 2.7] });
  a('SUÍTE', [9.2, 0, 13.4, 4.0], { at: [11.3, 3.0] });
  a('BANHO', [13.4, 0, 16, 2.6], { at: [14.7, 1.55], fs: 10 });
  a('CLOSET', [13.4, 2.6, 16, 4.0], { at: [14.9, 3.35], fs: 9.5, area: 2.6 * 1.4 - 0.4 });
  a('CIRCULAÇÃO', [0, 4.0, 9.2, 5.2], { at: [2.4, 4.72], fs: 9.5, area: 9.0 * 1.05 });
  a('GARAGEM', [0, 5.2, 5.6, 11], { at: [2.8, 6.3] });
  a('COZINHA', [5.6, 5.2, 9.2, 8.6], { at: [7.1, 6.6] });
  a('ÁREA DE SERVIÇO', [5.6, 8.6, 9.2, 11], { at: [7.4, 10.1], fs: 9.5 });
  a('ESTAR / JANTAR', [9.2, 4.0, 16, 11], { at: [11.0, 6.55], area: 6.6 * 6.8 });
  if (!mob) return;
  m(0.6, 0.35, 0, MOB.cama(1.4, 1.9));
  m(0.25, 3.25, 0, MOB.roupeiro(2.2));
  m(6.1, 0.35, 0, MOB.cama(0.9, 1.9));
  m(7.4, 3.25, 0, MOB.roupeiro(1.6));
  m(10.5, 0.35, 0, MOB.cama(1.6, 2.0));
  m(9.95, 0.35, 0, MOB.criado());
  m(12.2, 0.35, 0, MOB.criado());
  m(3.8, 0.3, 0, MOB.box(1.6, 1.1));
  m(4.1, 2.0, 0, MOB.lav());
  m(5.35, 1.8, 90, MOB.vaso());
  m(13.6, 0.25, 0, MOB.box(1.1, 1.1));
  m(15.75, 1.5, 90, MOB.vaso());
  m(14.9, 0.35, 0, MOB.lav());
  m(0.9, 5.9, 0, MOB.carro());
  m(3.4, 6.2, 0, MOB.carro());
  m(5.8, 5.45, 0, MOB.bancada(3.2, 0.5, 2.2));
  m(8.5, 6.4, 90, MOB.bancada(1.8));
  m(7.65, 8.8, 0, MOB.tanque());
  m(10.4, 9.8, 0, MOB.sofa(2.6));
  m(10.9, 7.5, 0, MOB.rack(2.0));
  m(13.9, 5.2, 90, MOB.mesa(1.8, 1.0, 3, 1));
}

function defTerrea(P, mob = true) {
  const E = 0.2;
  const { parede: w, ambiente: a, mob: m } = P;
  w(0, 0, 10, 0, E, [
    { k: 'j', o: 0.8, w: 1.6 },
    { k: 'j', o: 3.85, w: 0.6 },
    { k: 'j', o: 6.0, w: 1.6 },
    { k: 'j', o: 8.8, w: 0.8 },
  ]);
  w(0, 8.5, 10, 8.5, E, [
    { k: 'j', o: 1.0, w: 2.4 },
    { o: 6.3, w: 0.9, lado: -1 },
    { k: 'j', o: 7.9, w: 1.4 },
  ]);
  w(0, 0, 0, 8.5, E, [{ k: 'j', o: 5.2, w: 1.6 }]);
  w(10, 0, 10, 8.5, E, [{ k: 'j', o: 4.6, w: 1.2 }]);
  w(0, 3.5, 10, 3.5, 0.15, [
    { o: 2.3, w: 0.8, lado: 1, dob: 'e' },
    { o: 3.7, w: 0.7, lado: 1 },
    { o: 5.4, w: 0.8, lado: 1 },
    { o: 8.8, w: 0.8, lado: 1, dob: 'e' },
  ]);
  w(3.3, 0, 3.3, 3.5);
  w(5.1, 0, 5.1, 3.5);
  w(8.4, 0, 8.4, 3.5);
  w(5.6, 3.5, 5.6, 8.5, 0.15, [{ k: 'v', o: 0.7, w: 1.6 }]);
  a('DORMITÓRIO 1', [0, 0, 3.3, 3.5], { at: [1.65, 2.6] });
  a('BANHO', [3.3, 0, 5.1, 3.5], { at: [4.2, 2.75], fs: 10 });
  a('DORMITÓRIO 2', [5.1, 0, 8.4, 3.5], { at: [6.75, 2.6] });
  a('Á. SERVIÇO', [8.4, 0, 10, 3.5], { at: [9.2, 2.75], fs: 9.5 });
  a('SALA', [0, 3.5, 5.6, 8.5], { at: [2.3, 5.4] });
  a('COZINHA', [5.6, 3.5, 10, 8.5], { at: [7.35, 4.45] });
  // varanda
  P.extra.push(
    pa(D([[P.X(5.6), P.Y(8.6)], [P.X(5.6), P.Y(10)], [P.X(10.2), P.Y(10)], [P.X(10.2), P.Y(8.6)]]), { class: 'pn' }),
    rc(P.X(5.75), P.Y(9.7), 0.2 * P.s, 0.2 * P.s, { fill: NAVY }),
    rc(P.X(9.85), P.Y(9.7), 0.2 * P.s, 0.2 * P.s, { fill: NAVY }),
  );
  a('VARANDA', [5.6, 8.5, 10, 10], { at: [7.85, 9.35], fs: 9.5, area: 4.4 * 1.4 });
  if (!mob) return;
  m(0.95, 0.3, 0, MOB.cama(1.4, 1.9));
  m(3.15, 0.95, 90, MOB.roupeiro(1.6));
  m(6.9, 0.3, 0, MOB.cama(0.9, 1.9));
  m(5.3, 0.3, 0, MOB.cama(0.9, 1.9));
  m(3.5, 0.2, 0, MOB.box(1.4, 0.95));
  m(3.5, 1.35, 0, MOB.lav());
  m(4.85, 1.45, 90, MOB.vaso());
  m(9.95, 0.3, 90, MOB.tanque());
  m(0.25, 7.3, 0, MOB.sofa(2.4));
  m(0.3, 4.0, 0, MOB.rack(1.8));
  m(9.75, 4.2, 90, MOB.bancada(3.6, 1.2, 2.6));
  m(7.7, 6.5, 0, MOB.mesaRedonda(0.5));
}

function defSobrados(P, mob = true) {
  const { parede: w, ambiente: a, mob: m } = P;
  for (let u = 0; u < 2; u++) {
    const M = (x) => (u === 0 ? x : 10 - x);
    const x0 = u === 0 ? 0 : 5;
    const H = (x1, x2, y, t, abs = []) => {
      const A1 = Math.min(M(x1), M(x2));
      const A2 = Math.max(M(x1), M(x2));
      const len = A2 - A1;
      w(A1, y, A2, y, t, u === 0 ? abs : abs.map((q) => ({ ...q, o: len - q.o - q.w, dob: q.dob === 'e' ? 's' : 'e' })));
    };
    const V = (x, y1, y2, t, abs = []) => w(M(x), y1, M(x), y2, t, abs.map((q) => ({ ...q, lado: u === 0 ? q.lado : -(q.lado || 1) })));
    H(0, 5, 0, 0.2, [{ k: 'j', o: 0.8, w: 1.6 }]);
    H(0, 5, 12, 0.2, [{ k: 'pg', o: 0.4, w: 4.2 }]);
    V(0, 0, 12, 0.2, [{ k: 'j', o: 5.0, w: 1.6 }]);
    H(0, 5, 7.4, 0.15, [{ o: 2.3, w: 0.9, lado: -1, dob: 'e' }]);
    H(0, 3.4, 3.6, 0.15, [{ k: 'v', o: 0.6, w: 2.0 }]);
    V(3.4, 0, 3.6, 0.15, [
      { o: 1.0, w: 0.75, lado: 1 },
      { o: 2.5, w: 0.7, lado: 1 },
    ]);
    H(3.4, 5, 1.9, 0.15);
    const rx = (a1, a2) => [Math.min(M(a1), M(a2)), Math.max(M(a1), M(a2))];
    const [k0, k1] = rx(0, 3.4);
    const [s0, s1] = rx(3.4, 5);
    a('COZINHA', [k0, 0, k1, 3.6], { at: [(k0 + k1) / 2, 2.5] });
    a('Á. SERV.', [s0, 0, s1, 1.9], { at: [M(4.42), 1.6], fs: 7.5 });
    a('LAVABO', [s0, 1.9, s1, 3.6], { at: [M(4.42), 3.2], fs: 7.5 });
    a('SALA', [x0, 3.6, x0 + 5, 7.4], { at: [(M(0) + M(3.5)) / 2, 5.2], area: 5 * 3.8 - 0.9 });
    a('GARAGEM', [x0, 7.4, x0 + 5, 12], { at: [(M(0) + M(5)) / 2, 11.35] });
    P.extra.push(escadaPlanta(P, Math.min(M(3.85), M(4.85)), 3.72, 1.0, 13, 0.27));
    if (mob) {
      m(M(u === 0 ? 0.25 : 3.35), 0.2, 0, MOB.bancada(3.1, 0.6, 2.0));
      m(Math.min(M(3.6), M(4.15)), 1.98, 0, MOB.lav());
      if (u === 0) m(4.95, 2.35, 90, MOB.vaso());
      else m(5.05, 3.05, -90, MOB.vaso());
      m(Math.min(M(3.5), M(4.9)), 0.12, 0, MOB.tanque());
      m(Math.min(M(0.2), M(2.2)), 6.35, 0, MOB.sofa(2.0));
      m(Math.min(M(0.2), M(2.2)), 3.85, 0, MOB.rack(2.0));
      m((M(0) + M(5)) / 2 - 0.9, 7.55, 0, MOB.carro());
    }
  }
  P.parede(5, 0, 5, 12, 0.2);
}

function defClinica(P, mob = true) {
  const E = 0.2;
  const { parede: w, ambiente: a, mob: m } = P;
  w(0, 0, 16, 0, E, [
    { k: 'j', o: 1.2, w: 1.6 },
    { k: 'j', o: 5.2, w: 1.6 },
    { k: 'j', o: 9.2, w: 1.6 },
    { k: 'j', o: 13.2, w: 1.6 },
  ]);
  w(0, 11, 16, 11, E, [
    { k: 'j', o: 1.0, w: 2.0 },
    { k: 'j', o: 5.0, w: 1.6 },
    { k: 'p2', o: 7.2, w: 1.6, lado: -1 },
    { k: 'j', o: 9.4, w: 1.6 },
    { k: 'j', o: 12.6, w: 1.2 },
  ]);
  w(0, 0, 0, 11, E, [{ k: 'j', o: 7.4, w: 1.6 }]);
  w(16, 0, 16, 11, E, [{ k: 'j', o: 9.2, w: 1.0 }]);
  w(0, 4, 16, 4, 0.15, [
    { o: 2.8, w: 0.9, lado: -1, dob: 'e' },
    { o: 6.8, w: 0.9, lado: -1, dob: 'e' },
    { o: 8.3, w: 0.9, lado: -1 },
    { o: 12.3, w: 0.9, lado: -1 },
  ]);
  for (const x of [4, 8, 12]) w(x, 0, x, 4);
  w(0, 5.5, 4, 5.5, 0.15, [{ o: 1.0, w: 1.0, lado: 1 }]);
  w(4, 5.5, 5.0, 5.5);
  w(11.0, 5.5, 16, 5.5, 0.15, [
    { o: 1.5, w: 0.9, lado: 1 },
    { o: 3.55, w: 0.9, lado: 1, dob: 'e' },
  ]);
  w(4, 5.5, 4, 11);
  w(12, 5.5, 12, 11, 0.15, [{ o: 3.6, w: 0.8, lado: 1 }]);
  w(14, 5.5, 14, 8.3);
  w(12, 8.3, 16, 8.3);
  w(14.4, 8.3, 14.4, 11, 0.15, [{ o: 0.9, w: 0.7, lado: 1 }]);
  for (let i = 0; i < 4; i++) a(`CONSULTÓRIO ${i + 1}`, [4 * i, 0, 4 * i + 4, 4], { at: [4 * i + 2, 2.35], fs: 10.5 });
  a('CIRCULAÇÃO', [0, 4, 16, 5.5], { at: [10.0, 4.95], fs: 9.5 });
  a('PROCEDIMENTOS', [0, 5.5, 4, 11], { at: [2, 8.1], fs: 10.5 });
  a('RECEPÇÃO / ESPERA', [4, 5.5, 12, 11], { at: [6.6, 8.3], fs: 11 });
  a('SANIT. PNE', [12, 5.5, 14, 8.3], { at: [13, 7.7], fs: 9 });
  a('SANIT. PNE', [14, 5.5, 16, 8.3], { at: [15, 7.7], fs: 9 });
  a('COPA', [12, 8.3, 14.4, 11], { at: [13.2, 10.2], fs: 9.5 });
  a('DML', [14.4, 8.3, 16, 11], { at: [15.2, 10.2], fs: 9.5 });
  if (!mob) return;
  for (let i = 0; i < 4; i++) {
    const x = 4 * i;
    m(x + 0.5, 1.0, 0, MOB.escritorio());
    m(x + 3.1, 0.3, 0, MOB.maca());
    m(x + (i < 2 ? 0.25 : 3.2), 3.2, 0, MOB.lav());
  }
  m(0.4, 8.8, 0, MOB.maca());
  m(3.9, 6.9, 90, MOB.bancada(2.0, 0.6));
  m(9.6, 6.0, 0, MOB.balcao(2.2, 1.6));
  m(4.5, 9.9, 0, MOB.cadeiras(4));
  m(4.8, 6.3, 90, MOB.cadeiras(4));
  m(12.2, 5.8, 0, MOB.lav());
  m(13.8, 7.0, 90, MOB.vaso());
  m(14.2, 5.8, 0, MOB.lav());
  m(15.8, 7.0, 90, MOB.vaso());
  m(12.25, 8.55, 0, MOB.bancada(1.9, 0.6));
  P.extra.push(ci(P.X(13), P.Y(6.9), 0.75 * P.s, { class: 'pn' }), ci(P.X(15), P.Y(6.9), 0.75 * P.s, { class: 'pn' }));
}

function folhaPlanta({ def, s, OX, OY, cx, cy, titulo, carimbo, folha = '02/08', norteXY = [1110, 110], opts = {}, extra = () => '' }) {
  const P = plantaTools(s, OX, OY);
  def(P, opts.mobilia !== false);
  const body =
    renderPlanta(P, opts) +
    cotasPlanta(P, cx, cy) +
    extra(P) +
    norte(TH_PAPEL, norteXY[0], norteXY[1]) +
    legenda(TH_PAPEL, 60, 822, titulo, 'ESC. 1:100') +
    prancha(TH_PAPEL, 1200, 900, carimbo, { folha });
  return svgDoc({ th: TH_PAPEL, css: CSS_PL, body });
}

SVGS['planta-residencia'] = () =>
  folhaPlanta({
    def: defResidencia,
    s: 50,
    OX: 250,
    OY: 150,
    cx: [0, 3.6, 5.6, 9.2, 13.4, 16],
    cy: [0, 4.0, 5.2, 8.6, 11],
    titulo: 'PLANTA BAIXA — TÉRREO',
    carimbo: 'PLANTA BAIXA — RESIDÊNCIA',
    extra: (P) => nivelPlanta(P.X(12.0), P.Y(9.3), '+0,05') + nivelPlanta(P.X(1.2), P.Y(10.3), '±0,00'),
  });

SVGS['planta-terrea'] = () =>
  folhaPlanta({
    def: defTerrea,
    s: 60,
    OX: 330,
    OY: 140,
    cx: [0, 3.3, 5.1, 8.4, 10],
    cy: [0, 3.5, 8.5],
    titulo: 'PLANTA BAIXA',
    carimbo: 'PLANTA BAIXA — RESIDÊNCIA TÉRREA',
    extra: (P) => nivelPlanta(P.X(3.2), P.Y(6.6), '+0,10') + nivelPlanta(P.X(8.6), P.Y(9.75), '+0,05'),
  });

SVGS['planta-sobrado'] = () =>
  folhaPlanta({
    def: defSobrados,
    s: 50,
    OX: 350,
    OY: 120,
    cx: [0, 3.4, 5, 6.6, 10],
    cy: [0, 1.9, 3.6, 7.4, 12],
    titulo: 'PLANTA BAIXA — PAV. TÉRREO',
    carimbo: 'PLANTA TÉRREO — SOBRADOS GEMINADOS',
    extra: (P) =>
      T(P.X(2.5), P.Y(12) + 34, 'CASA 01', { fs: 10.5, fw: 700, fill: NAVY, anchor: 'middle', ls: 1.5 }) +
      T(P.X(7.5), P.Y(12) + 34, 'CASA 02', { fs: 10.5, fw: 700, fill: NAVY, anchor: 'middle', ls: 1.5 }),
  });

SVGS['planta-clinica'] = () =>
  folhaPlanta({
    def: defClinica,
    s: 50,
    OX: 250,
    OY: 150,
    cx: [0, 4, 8, 12, 14, 16],
    cy: [0, 4, 5.5, 8.3, 11],
    titulo: 'PLANTA BAIXA — TÉRREO',
    carimbo: 'PLANTA BAIXA — CLÍNICA',
    extra: (P) => nivelPlanta(P.X(8.9), P.Y(9.6), '+0,15'),
  });

/* ------------------------------------------------------------------ */
/* Formas e fundações                                                  */
/* ------------------------------------------------------------------ */
const CSS_FO =
  `.vg1{fill:none;stroke:${NAVY};stroke-width:.95}.pi{fill:${NAVY}}` +
  `.vz{fill:none;stroke:${GRAF};stroke-width:.6}.bl{fill:#fff;stroke:${NAVY};stroke-width:1.1}` +
  `.es{fill:#fff;stroke:${NAVY};stroke-width:.8;stroke-dasharray:3 2}.ec{fill:none;stroke:${NAVY};stroke-width:.5}` +
  `.hl{fill:url(#hn)}.tb{fill:none;stroke:${NAVY};stroke-width:.7}.lj{fill:#FBFBFA}` +
  `.sp{fill:#fff;stroke:${NAVY};stroke-width:1.1}.sl{fill:none;stroke:${NAVY};stroke-width:.55}`;

/** eixos com bolhas no topo e à esquerda */
function gradeEixos(P, xs, ys, o = {}) {
  const { labX = null, labY = null, ext = 1.5, r = 12 } = o;
  const X0 = xs[0];
  const X1 = xs[xs.length - 1];
  const Y0 = ys[0];
  const Y1 = ys[ys.length - 1];
  let s = '';
  xs.forEach((x, i) => (s += eixo(TH_PAPEL, P.X(x), P.Y(Y0) - ext * 40, P.X(x), P.Y(Y1) + 22, labX ? labX[i] : String(i + 1), { at: 'start', r })));
  ys.forEach((y, j) => (s += eixo(TH_PAPEL, P.X(X0) - ext * 40, P.Y(y), P.X(X1) + 22, P.Y(y), labY ? labY[j] : 'ABCDEFGH'[j], { at: 'start', r })));
  return s;
}
function cotasEixos(P, xs, ys) {
  const th = TH_PAPEL;
  return (
    cotaH(th, xs.map(P.X), P.Y(ys[0]) - 24, { s: P.s, from: null }) +
    cotaH(th, [xs[0], xs[xs.length - 1]].map(P.X), P.Y(ys[0]) - 46, { s: P.s }) +
    cotaV(th, ys.map(P.Y), P.X(xs[0]) - 24, { s: P.s }) +
    cotaV(th, [ys[0], ys[ys.length - 1]].map(P.Y), P.X(xs[0]) - 46, { s: P.s })
  );
}

/** planta de formas: pilares, vigas (linhas duplas), lajes e vazios */
function formas(P, o) {
  const {
    xs,
    ys,
    col = () => [0.2, 0.4],
    skip = () => false,
    vazios = {},
    laje = () => true,
    h = () => 12,
    bw = 0.15,
    bh = () => 50,
    vigaX = () => [[xs[0], xs[xs.length - 1]]],
    vigaY = () => [[ys[0], ys[ys.length - 1]]],
    extras = [],
    rebaixo = () => false,
  } = o;
  const k = P.s;
  const cols = [];
  let n = 0;
  ys.forEach((y, j) =>
    xs.forEach((x, i) => {
      if (skip(i, j)) return;
      const [bx, by] = col(i, j);
      cols.push({ i, j, x, y, bx, by, nome: `P${++n}` });
    }),
  );
  let fundo = '';
  let d = '';
  let lab = '';
  // lajes e vazios
  let nl = 0;
  for (let j = 0; j < ys.length - 1; j++)
    for (let i = 0; i < xs.length - 1; i++) {
      const cx = (xs[i] + xs[i + 1]) / 2;
      const cy = (ys[j] + ys[j + 1]) / 2;
      const vz = vazios[`${i},${j}`];
      if (vz) {
        const a = bw / 2;
        d += D([[P.X(xs[i] + a), P.Y(ys[j] + a)], [P.X(xs[i + 1] - a), P.Y(ys[j + 1] - a)]]);
        d += D([[P.X(xs[i + 1] - a), P.Y(ys[j] + a)], [P.X(xs[i] + a), P.Y(ys[j + 1] - a)]]);
        lab += rc(P.X(cx) - tw(vz, 9.5, true) / 2 - 5, P.Y(cy) - 11, tw(vz, 9.5, true) + 10, 16, { fill: PAPEL });
        lab += T(P.X(cx), P.Y(cy) + 1, vz, { fs: 9.5, fw: 700, fill: GRAF, anchor: 'middle', ls: 0.6 });
        continue;
      }
      if (!laje(i, j)) continue;
      fundo += rc(P.X(xs[i]), P.Y(ys[j]), (xs[i + 1] - xs[i]) * k, (ys[j + 1] - ys[j]) * k, { class: rebaixo(i, j) ? 'hl' : 'lj' });
      lab += T(P.X(cx), P.Y(cy) - 2, `L${++nl}`, { fs: 12, fw: 700, fill: NAVY, anchor: 'middle' });
      lab += T(P.X(cx), P.Y(cy) + 11, `h = ${h(i, j)}`, { fs: 9.5, fill: GRAF, anchor: 'middle' });
    }
  for (const ex of extras) {
    fundo += rc(P.X(ex.r[0]), P.Y(ex.r[1]), (ex.r[2] - ex.r[0]) * k, (ex.r[3] - ex.r[1]) * k, { class: ex.reb ? 'hl' : 'lj' });
    const cx = (ex.r[0] + ex.r[2]) / 2;
    const cy = (ex.r[1] + ex.r[3]) / 2;
    lab += T(P.X(cx), P.Y(cy) - 1, `L${++nl}`, { fs: 11, fw: 700, fill: NAVY, anchor: 'middle' });
    lab += T(P.X(cx), P.Y(cy) + 10, ex.t || 'h = 10', { fs: 8.5, fill: GRAF, anchor: 'middle' });
    const [x0, y0, x1, y1] = ex.r;
    d += `M${N(P.X(x0))} ${N(P.Y(y0))}V${N(P.Y(y1))}H${N(P.X(x1))}V${N(P.Y(y0))}`;
    d += `M${N(P.X(x0 + bw))} ${N(P.Y(y0))}V${N(P.Y(y1 - bw))}H${N(P.X(x1 - bw))}V${N(P.Y(y0))}`;
  }
  // vigas
  let nv = 0;
  const labV = [];
  ys.forEach((y, j) => {
    for (const [a, b] of vigaX(j)) {
      d += `M${N(P.X(a))} ${N(P.Y(y - bw / 2))}H${N(P.X(b))}M${N(P.X(a))} ${N(P.Y(y + bw / 2))}H${N(P.X(b))}`;
      const sup = cols.filter((c) => c.j === j && c.x >= a - 1e-6 && c.x <= b + 1e-6).map((c) => c.x);
      const pts2 = [...new Set([a, ...sup, b])].sort((p, q) => p - q);
      let best = [a, b];
      for (let q = 0; q < pts2.length - 1; q++) if (pts2[q + 1] - pts2[q] > best[1] - best[0] || best[0] === a && best[1] === b) best = [pts2[q], pts2[q + 1]];
      labV.push(T(P.X((best[0] + best[1]) / 2), P.Y(y) + (bw / 2) * k + 11, `V${++nv} (${Math.round(bw * 100)}x${bh('x', j)})`, { fs: 9, fill: NAVY, anchor: 'middle' }));
    }
  });
  xs.forEach((x, i) => {
    for (const [a, b] of vigaY(i)) {
      d += `M${N(P.X(x - bw / 2))} ${N(P.Y(a))}V${N(P.Y(b))}M${N(P.X(x + bw / 2))} ${N(P.Y(a))}V${N(P.Y(b))}`;
      const sup = cols.filter((c) => c.i === i && c.y >= a - 1e-6 && c.y <= b + 1e-6).map((c) => c.y);
      const pts2 = [...new Set([a, ...sup, b])].sort((p, q) => p - q);
      let best = [pts2[0], pts2[1]];
      for (let q = 0; q < pts2.length - 1; q++) if (pts2[q + 1] - pts2[q] > best[1] - best[0]) best = [pts2[q], pts2[q + 1]];
      labV.push(T(P.X(x) + (bw / 2) * k + 11, P.Y((best[0] + best[1]) / 2), `V${++nv} (${Math.round(bw * 100)}x${bh('y', i)})`, { fs: 9, fill: NAVY, anchor: 'middle', rot: -90 }));
    }
  });
  // pilares
  let pil = '';
  for (const c of cols) {
    pil += rc(P.X(c.x - c.bx / 2), P.Y(c.y - c.by / 2), c.bx * k, c.by * k, { class: 'pi' });
    const tx = P.X(c.x + c.bx / 2) + 3;
    const ty = P.Y(c.y - c.by / 2) - 4;
    lab += T(tx, ty, `${c.nome} ${Math.round(c.bx * 100)}x${Math.round(c.by * 100)}`, { fs: 8.5, fw: 600, fill: NAVY });
  }
  return { svg: fundo + pa(d, { class: 'vg1' }) + pil + labV.join('') + lab, cols, nv, nl };
}

/** bloco de notas gerais */
function notas(x, y, w, titulo, linhas) {
  let s = rc(x, y, w, 26 + linhas.length * 15, { fill: '#fff', stroke: NAVY, 'stroke-width': 0.7 });
  s += T(x + 10, y + 17, titulo, { fs: 10, fw: 700, fill: NAVY, ls: 1 });
  linhas.forEach((l, i) => (s += T(x + 10, y + 34 + i * 15, l, { fs: 9, fill: GRAF })));
  return s;
}
/** quadro (tabela) simples */
function quadro(x, y, titulo, cab, linhas, larg) {
  const hL = 15;
  const W = larg.reduce((a, b) => a + b, 0);
  const H = 22 + hL * (linhas.length + 1);
  let s = rc(x, y, W, H, { fill: '#fff', stroke: NAVY, 'stroke-width': 0.8 });
  s += T(x + W / 2, y + 15, titulo, { fs: 9.5, fw: 700, fill: NAVY, anchor: 'middle', ls: 1 });
  let d = `M${N(x)} ${N(y + 22)}H${N(x + W)}M${N(x)} ${N(y + 22 + hL)}H${N(x + W)}`;
  let cx = x;
  larg.slice(0, -1).forEach((w) => {
    cx += w;
    d += `M${N(cx)} ${N(y + 22)}V${N(y + H)}`;
  });
  s += pa(d, { class: 'tb' });
  const row = (vals, yy, bold) => {
    let xx = x;
    vals.forEach((v, i) => {
      s += T(xx + larg[i] / 2, yy, v, { fs: 8.5, fw: bold ? 700 : 400, fill: bold ? NAVY : GRAF, anchor: 'middle' });
      xx += larg[i];
    });
  };
  row(cab, y + 33, true);
  linhas.forEach((l, i) => row(l, y + 33 + hL * (i + 1), false));
  return s;
}

function folhaEstrutural({ s, OX, OY, desenho, titulo, carimbo, folha, defs = [] }) {
  const P = plantaTools(s, OX, OY);
  const body = desenho(P) + legenda(TH_PAPEL, 60, 822, titulo, 'ESC. 1:100') + prancha(TH_PAPEL, 1200, 900, carimbo, { folha });
  return svgDoc({ th: TH_PAPEL, css: CSS_FO, defs, body });
}

SVGS['formas-residencia'] = () =>
  folhaEstrutural({
    s: 44,
    OX: 230,
    OY: 190,
    titulo: 'PLANTA DE FORMAS — COBERTURA',
    carimbo: 'FORMAS — LAJE DE COBERTURA',
    folha: '03/06',
    desenho: (P) => {
      const xs = [0, 3.6, 9.2, 13.4, 16];
      const ys = [0, 4.0, 8.6, 11];
      const F = formas(P, {
        xs,
        ys,
        col: (i, j) => (j === 0 || j === 3 ? [0.4, 0.2] : i === 0 || i === 4 ? [0.2, 0.4] : [0.2, 0.5]),
        skip: (i, j) => i === 1 && j === 2,
        h: () => 12,
        bh: (dir, k) => (dir === 'x' ? (k === 0 || k === 3 ? 50 : 40) : 50),
        vigaY: (i) => (i === 1 ? [[0, 8.6]] : [[0, 11]]),
        rebaixo: (i, j) => i === 3 && j === 0,
      });
      return gradeEixos(P, xs, ys) + cotasEixos(P, xs, ys) + F.svg + norte(TH_PAPEL, 1110, 110) +
        notas(997, 420, 173, 'NOTAS', ['Concreto: fck = 25 MPa', 'Cobrimento lajes: 2,5 cm', 'Cobrimento vigas: 3,0 cm', 'Lajes maciças h = 12 cm', 'Hachura: rebaixo −5 cm']);
    },
    defs: ['hn'],
  });

SVGS['formas-multifamiliar'] = () =>
  folhaEstrutural({
    s: 42,
    OX: 190,
    OY: 175,
    titulo: 'PLANTA DE FORMAS — PAV. TIPO',
    carimbo: 'FORMAS — PAV. TIPO (1º AO 3º)',
    folha: '05/12',
    defs: ['hn'],
    desenho: (P) => {
      const xs = [0, 4.0, 7.8, 10.2, 14.0, 18.0];
      const ys = [0, 4.5, 7.0, 11.5];
      const F = formas(P, {
        xs,
        ys,
        col: (i, j) => (j === 0 || j === 3 ? [0.5, 0.2] : i === 0 || i === 5 ? [0.2, 0.5] : [0.25, 0.6]),
        vazios: { '2,1': 'ESCADA / ELEV.' },
        h: (i, j) => (j === 1 ? 10 : 12),
        bh: (dir) => (dir === 'x' ? 55 : 50),
        extras: [
          { r: [0.6, 11.5, 4.0, 12.9], t: 'h = 10 (−5)', reb: true },
          { r: [14.0, 11.5, 17.4, 12.9], t: 'h = 10 (−5)', reb: true },
        ],
      });
      return (
        gradeEixos(P, xs, ys) +
        cotasEixos(P, xs, ys) +
        F.svg +
        norte(TH_PAPEL, 1110, 110) +
        notas(990, 250, 170, 'NOTAS', ['fck = 30 MPa', 'Nível: +3,00 / +6,00 / +9,00', 'Varandas: rebaixo −5 cm', 'Vigas de borda 15x40'])
      );
    },
  });

SVGS['formas-galpao'] = () =>
  folhaEstrutural({
    s: 27,
    OX: 160,
    OY: 190,
    titulo: 'PLANTA DE FORMAS — BALDRAME E MEZANINO',
    carimbo: 'FORMAS — GALPÃO',
    folha: '04/09',
    desenho: (P) => {
      const xs = [0, 7.5, 15, 22.5, 30];
      const ys = [0, 10, 20];
      const F = formas(P, {
        xs,
        ys,
        bw: 0.2,
        col: (i, j) => (j === 1 ? [0.4, 0.6] : [0.6, 0.4]),
        skip: (i, j) => j === 1 && (i === 1 || i === 2),
        laje: (i, j) => i === 3 && j === 0,
        h: () => '20 (ALVEOLAR)',
        bh: (dir) => (dir === 'x' ? 60 : 60),
        vigaX: (j) => (j === 1 ? [[22.5, 30]] : [[0, 30]]),
        vigaY: (i) => (i === 1 || i === 2 ? [] : i === 3 ? [[0, 10]] : [[0, 20]]),
      });
      const cx = P.X(11.25);
      const cy = P.Y(10);
      const piso =
        T(cx, cy - 4, 'PISO INDUSTRIAL', { fs: 11, fw: 700, fill: GRAF, anchor: 'middle', ls: 1.2 }) +
        T(cx, cy + 11, 'CONCRETO h = 15 cm · JUNTAS 5,0 x 5,0 m', { fs: 8.5, fill: GRAF, anchor: 'middle', ls: 0.4 });
      let jt = '';
      for (let x = 5; x < 30; x += 5) jt += `M${N(P.X(x))} ${N(P.Y(0.3))}V${N(P.Y(19.7))}`;
      for (let y = 5; y < 20; y += 5) jt += `M${N(P.X(0.3))} ${N(P.Y(y))}H${N(P.X(29.7))}`;
      return (
        pa(jt, { fill: 'none', stroke: GRAF, 'stroke-width': 0.4, 'stroke-dasharray': '2 3', 'stroke-opacity': 0.5 }) +
        gradeEixos(P, xs, ys) +
        cotasEixos(P, xs, ys) +
        F.svg +
        rc(cx - 120, cy - 18, 240, 36, { fill: PAPEL, 'fill-opacity': 0.9 }) +
        piso +
        T(P.X(26.25), P.Y(7.6), 'MEZANINO +3,50', { fs: 8.5, fill: GRAF, anchor: 'middle', ls: 0.6 }) +
        norte(TH_PAPEL, 1110, 110)
      );
    },
  });

SVGS['formas-edificio6'] = () =>
  folhaEstrutural({
    s: 38,
    OX: 150,
    OY: 175,
    titulo: 'PLANTA DE FORMAS — PAV. TIPO',
    carimbo: 'FORMAS — PAV. TIPO (1º AO 5º)',
    folha: '06/14',
    defs: ['hn'],
    desenho: (P) => {
      const xs = [0, 3.8, 7.6, 10.4, 14.2, 18.0];
      const ys = [0, 4.2, 6.6, 10.8];
      const F = formas(P, {
        xs,
        ys,
        col: (i, j) => (j === 0 || j === 3 ? [0.6, 0.2] : i === 0 || i === 5 ? [0.2, 0.6] : [0.3, 0.7]),
        vazios: { '2,1': 'ELEV. / ESCADA' },
        h: (i, j) => (j === 1 ? 10 : 12),
        bh: (dir) => (dir === 'x' ? 60 : 55),
        extras: [{ r: [7.6, 10.8, 10.4, 12.2], t: 'h = 10 (−5)', reb: true }],
      });
      const linhas = F.cols.slice(0, 9).map((c) => [c.nome, `${Math.round(c.bx * 100)}x${Math.round(c.by * 100)}`, c.bx * c.by > 0.15 ? '35' : '30', `${[64, 88, 71, 93, 58][c.i % 5] + c.j * 7}`]);
      return (
        gradeEixos(P, xs, ys) +
        cotasEixos(P, xs, ys) +
        F.svg +
        norte(TH_PAPEL, 1110, 110) +
        quadro(900, 175, 'QUADRO DE PILARES', ['PILAR', 'SEÇÃO', 'fck', 'CARGA (tf)'], [...linhas, ['...', '...', '...', '...']], [58, 62, 42, 88]) +
        notas(900, 530, 250, 'NOTAS', ['Concreto: fck = 30 MPa (lajes/vigas)', 'Aço CA-50 / CA-60', 'Cobrimento: 2,5 cm (lajes) · 3,0 cm (vigas)', 'Níveis: +3,20 a +15,20 (tipo)', 'Varanda: laje rebaixada −5 cm'])
      );
    },
  });

/* fundações */
function bloco(P, x, y, n, o = {}) {
  const { pil = [0.2, 0.5], nome = 'B1', carga = null, pn = 'P1', rot = false } = o;
  const k = P.s;
  const e = 0.9;
  let piles;
  let poly;
  const m = 0.3;
  if (n === 1) {
    piles = [[0, 0]];
    poly = [[-0.35, -0.35], [0.35, -0.35], [0.35, 0.35], [-0.35, 0.35]];
  } else if (n === 2) {
    piles = [[-e / 2, 0], [e / 2, 0]];
    poly = [[-e / 2 - m, -m], [e / 2 + m, -m], [e / 2 + m, m], [-e / 2 - m, m]];
  } else if (n === 3) {
    const h = (e * Math.sqrt(3)) / 2;
    piles = [[-e / 2, h / 3], [e / 2, h / 3], [0, (-2 * h) / 3]];
    const t = -2 * h / 3 - m;
    const b = h / 3 + m;
    poly = [[-0.2, t], [0.2, t], [e / 2 + m, h / 3 - 0.1], [e / 2 + m, b], [-e / 2 - m, b], [-e / 2 - m, h / 3 - 0.1]];
  } else {
    piles = [[-e / 2, -e / 2], [e / 2, -e / 2], [e / 2, e / 2], [-e / 2, e / 2]];
    poly = [[-e / 2 - m, -e / 2 - m], [e / 2 + m, -e / 2 - m], [e / 2 + m, e / 2 + m], [-e / 2 - m, e / 2 + m]];
  }
  const R = (p) => (rot ? [-p[1], p[0]] : p);
  const tp = (p) => [P.X(x + R(p)[0]), P.Y(y + R(p)[1])];
  let s = pg(poly.map(tp), { class: 'bl' });
  for (const p of piles) {
    const [cx, cy] = tp(p);
    s += ci(cx, cy, 0.15 * k, { class: 'es' }) + pa(`M${N(cx - 0.2 * k)} ${N(cy)}H${N(cx + 0.2 * k)}M${N(cx)} ${N(cy - 0.2 * k)}V${N(cy + 0.2 * k)}`, { class: 'ec' });
  }
  const [bx, by] = rot ? [pil[1], pil[0]] : pil;
  s += rc(P.X(x - bx / 2), P.Y(y - by / 2), bx * k, by * k, { class: 'pi' });
  const ys = poly.map((p) => tp(p)[1]);
  const xs2 = poly.map((p) => tp(p)[0]);
  const bot = Math.max(...ys);
  const right = Math.max(...xs2);
  s += T(right + 3, bot + 10, nome, { fs: 10, fw: 700, fill: NAVY });
  if (carga) s += T(right + 3, bot + 21, `${pn} — ${carga} tf`, { fs: 8, fill: GRAF });
  return s;
}

function sapata(P, x, y, a, b, o = {}) {
  const { pil = [0.4, 0.6], nome = 'S1', carga = null, pn = 'P1' } = o;
  const k = P.s;
  const [px, py] = pil;
  const c = [[-a / 2, -b / 2], [a / 2, -b / 2], [a / 2, b / 2], [-a / 2, b / 2]];
  const q = [[-px / 2 - 0.05, -py / 2 - 0.05], [px / 2 + 0.05, -py / 2 - 0.05], [px / 2 + 0.05, py / 2 + 0.05], [-px / 2 - 0.05, py / 2 + 0.05]];
  const tp = (p) => [P.X(x + p[0]), P.Y(y + p[1])];
  let s = pg(c.map(tp), { class: 'sp' });
  let d = '';
  for (let i = 0; i < 4; i++) d += D([tp(q[i]), tp(c[i])]);
  s += pa(d, { class: 'sl' }) + pg(q.map(tp), { fill: 'none', stroke: NAVY, 'stroke-width': 0.6 });
  s += rc(P.X(x - px / 2), P.Y(y - py / 2), px * k, py * k, { class: 'pi' });
  const [rx, by2] = tp([a / 2, b / 2]);
  s += T(rx + 3, by2 + 9, `${nome} ${Math.round(a * 100)}x${Math.round(b * 100)}`, { fs: 9, fw: 700, fill: NAVY });
  if (carga) s += T(rx + 3, by2 + 20, `${pn} — ${carga} tf`, { fs: 8, fill: GRAF });
  return s;
}

/** vigas baldrame entre apoios (linhas duplas) */
function baldrames(P, segs, bw = 0.2) {
  let d = '';
  for (const [x0, y0, x1, y1] of segs) {
    if (Math.abs(y0 - y1) < 1e-9) d += `M${N(P.X(x0))} ${N(P.Y(y0 - bw / 2))}H${N(P.X(x1))}M${N(P.X(x0))} ${N(P.Y(y0 + bw / 2))}H${N(P.X(x1))}`;
    else d += `M${N(P.X(x0 - bw / 2))} ${N(P.Y(y0))}V${N(P.Y(y1))}M${N(P.X(x0 + bw / 2))} ${N(P.Y(y0))}V${N(P.Y(y1))}`;
  }
  return pa(d, { fill: 'none', stroke: NAVY, 'stroke-width': 0.7 });
}

SVGS['fundacao-multifamiliar'] = () =>
  folhaEstrutural({
    s: 46,
    OX: 190,
    OY: 190,
    titulo: 'PLANTA DE LOCAÇÃO — FUNDAÇÃO',
    carimbo: 'LOCAÇÃO DE BLOCOS E ESTACAS',
    folha: '02/12',
    desenho: (P) => {
      const xs = [0, 4.2, 8.6, 12.8];
      const ys = [0, 4.6, 9.2];
      const cargas = [
        [28, 46, 44, 27],
        [49, 86, 82, 47],
        [30, 48, 45, 29],
      ];
      const nEst = (c) => (c < 32 ? 1 : c < 52 ? 2 : c < 70 ? 3 : 4);
      let segs = [];
      for (const y of ys) segs.push([xs[0], y, xs[3], y]);
      for (const x of xs) segs.push([x, ys[0], x, ys[2]]);
      let b = '';
      let nb = 0;
      const linhas = [];
      ys.forEach((y, j) =>
        xs.forEach((x, i) => {
          const c = cargas[j][i];
          const n = nEst(c);
          nb++;
          b += bloco(P, x, y, n, { nome: `B${nb}`, carga: c, pn: `P${nb}`, pil: j === 1 ? [0.25, 0.6] : [0.5, 0.2], rot: n === 2 && j === 1 });
          if (nb <= 8) linhas.push([`B${nb}`, String(n), '30', String(c)]);
        }),
      );
      return (
        gradeEixos(P, xs, ys) +
        cotasEixos(P, xs, ys) +
        baldrames(P, segs) +
        b +
        T(P.X(2.1), P.Y(4.6) - 7, 'VB1 (20x40)', { fs: 8.5, fill: NAVY, anchor: 'middle' }) +
        T(P.X(10.7), P.Y(0) - 7, 'VB2 (20x40)', { fs: 8.5, fill: NAVY, anchor: 'middle' }) +
        norte(TH_PAPEL, 1110, 110) +
        quadro(890, 180, 'QUADRO DE BLOCOS', ['BLOCO', 'ESTACAS', 'Ø (cm)', 'CARGA (tf)'], [...linhas, ['...', '...', '...', '...']], [58, 62, 50, 90]) +
        notas(890, 520, 260, 'NOTAS', ['Estacas tipo hélice contínua Ø 30 cm', 'Comprimento estimado: 12,0 m', 'Blocos: fck = 30 MPa · cobrimento 5 cm', 'Cotas em metros; cargas de serviço (tf)'])
      );
    },
  });

SVGS['fundacao-galpao'] = () =>
  folhaEstrutural({
    s: 25,
    OX: 150,
    OY: 200,
    titulo: 'PLANTA DE LOCAÇÃO — SAPATAS',
    carimbo: 'LOCAÇÃO DE SAPATAS — GALPÃO',
    folha: '02/09',
    desenho: (P) => {
      const xs = [0, 7.5, 15, 22.5, 30];
      const ys = [0, 10, 20];
      let s = '';
      let n = 0;
      const segs = [
        [0, 0, 30, 0],
        [0, 20, 30, 20],
        [0, 0, 0, 20],
        [30, 0, 30, 20],
        [22.5, 10, 30, 10],
        [22.5, 0, 22.5, 10],
      ];
      const linhas = [];
      ys.forEach((y, j) =>
        xs.forEach((x, i) => {
          if (j === 1 && (i === 1 || i === 2)) return;
          const canto = (i === 0 || i === 4) && j !== 1;
          const a = canto ? 1.6 : j === 1 ? 2.0 : 2.2;
          const c = canto ? 34 : j === 1 ? 46 : 58;
          n++;
          s += sapata(P, x, y, a, a, { nome: `S${n}`, carga: c, pn: `P${n}`, pil: j === 1 ? [0.4, 0.6] : [0.6, 0.4] });
          if (n <= 7) linhas.push([`S${n}`, `${Math.round(a * 100)}x${Math.round(a * 100)}`, '60', String(c)]);
        }),
      );
      return (
        gradeEixos(P, xs, ys) +
        cotasEixos(P, xs, ys) +
        baldrames(P, segs) +
        s +
        T(P.X(3.75), P.Y(20) + 16, 'VB1 (20x50)', { fs: 8.5, fill: NAVY, anchor: 'middle' }) +
        norte(TH_PAPEL, 1110, 110) +
        quadro(1000, 250, 'QUADRO DE SAPATAS', ['SAP.', 'DIM.', 'h', 'tf'], [...linhas, ['...', '...', '...', '...']], [36, 58, 30, 30]) +
        notas(930, 560, 240, 'NOTAS', ['Tensão admissível do solo: 2,5 kgf/cm²', 'Cota de assentamento: −1,50 m', 'Lastro de concreto magro e = 5 cm'])
      );
    },
  });

/* ------------------------------------------------------------------ */
/* Motor de perspectiva (renders, modelo 3D e interiores)              */
/* ------------------------------------------------------------------ */
const SOL = (() => {
  const v = [0.55, -0.62, 0.78];
  const l = Math.hypot(...v);
  return v.map((c) => c / l);
})();
const MAT = {
  branco: ['#F2F1ED', '#B7B6B1'],
  concreto: ['#C8C6C0', '#8A8984'],
  madeira: ['#B38660', '#6E4D34'],
  pedra: ['#BCB4A6', '#7F786C'],
  escuro: ['#4D535C', '#262A30'],
  grafite: ['#6B7079', '#3C4048'],
  tecido: ['#6F7F95', '#3F4B5E'],
  claro: ['#E9E6E0', '#B5B1A9'],
  pedraBranca: ['#F0EEEA', '#C4C1BA'],
  navy: ['#3A5078', '#16284A'],
};
let LUZ = { v: SOL, amb: 0.18 };
function sombreia(mat, n, luz = LUZ.v, amb = LUZ.amb) {
  const [l, d] = MAT[mat];
  let k = n[0] * luz[0] + n[1] * luz[1] + n[2] * luz[2];
  k = n[2] < -0.5 ? amb * 0.9 : Math.max(0, k) * (1 - amb) + amb;
  return mix(d, l, Math.min(1, k));
}

/** câmera em perspectiva de dois pontos (verticais permanecem verticais) */
function camera(eye, alvo, f = 1, cx = 0, cy = 0) {
  let fx = alvo[0] - eye[0];
  let fy = alvo[1] - eye[1];
  const L = Math.hypot(fx, fy);
  fx /= L;
  fy /= L;
  const C = (x, y, z) => {
    const dx = x - eye[0];
    const dy = y - eye[1];
    const Z = dx * fx + dy * fy;
    const X = dx * fy - dy * fx;
    return [cx + (f * X) / Z, cy - (f * (z - eye[2])) / Z, Z];
  };
  C.eye = eye;
  C.f = f;
  C.cx = cx;
  C.cy = cy;
  C.alvo = alvo;
  return C;
}
function camFit(eye, alvo, pontos, box) {
  const C1 = camera(eye, alvo, 1, 0, 0);
  const p = pontos.map((q) => C1(...q));
  const x0 = Math.min(...p.map((q) => q[0]));
  const x1 = Math.max(...p.map((q) => q[0]));
  const y0 = Math.min(...p.map((q) => q[1]));
  const y1 = Math.max(...p.map((q) => q[1]));
  const k = Math.min((box[2] - box[0]) / (x1 - x0), (box[3] - box[1]) / (y1 - y0));
  return camera(eye, alvo, k, (box[0] + box[2]) / 2 - (k * (x0 + x1)) / 2, (box[1] + box[3]) / 2 - (k * (y0 + y1)) / 2);
}
function faces3(b) {
  const [x0, x1, y0, y1, z0, z1] = b;
  return {
    '-y': { n: [0, -1, 0], w: x1 - x0, h: z1 - z0, uv: (u, v, e = 0) => [x0 + u, y0 - e, z0 + v] },
    '+y': { n: [0, 1, 0], w: x1 - x0, h: z1 - z0, uv: (u, v, e = 0) => [x1 - u, y1 + e, z0 + v] },
    '-x': { n: [-1, 0, 0], w: y1 - y0, h: z1 - z0, uv: (u, v, e = 0) => [x0 - e, y1 - u, z0 + v] },
    '+x': { n: [1, 0, 0], w: y1 - y0, h: z1 - z0, uv: (u, v, e = 0) => [x1 + e, y0 + u, z0 + v] },
    '+z': { n: [0, 0, 1], w: x1 - x0, h: y1 - y0, uv: (u, v, e = 0) => [x0 + u, y0 + v, z1 + e] },
    '-z': { n: [0, 0, -1], w: x1 - x0, h: y1 - y0, uv: (u, v, e = 0) => [x0 + u, y0 + v, z0 - e] },
  };
}
const visivel = (C, F) => {
  const c = F.uv(F.w / 2, F.h / 2);
  return F.n[0] * (C.eye[0] - c[0]) + F.n[1] * (C.eye[1] - c[1]) + F.n[2] * (C.eye[2] - c[2]) > 1e-6;
};
function casco(pts) {
  const p = [...pts].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [];
  for (const q of p) {
    while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop();
    lo.push(q);
  }
  const up = [];
  for (const q of p.reverse()) {
    while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop();
    up.push(q);
  }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
const noChao = ([x, y, z], luz = SOL) => [x - (luz[0] / luz[2]) * z, y - (luz[1] / luz[2]) * z];

const WIRE = { bg: '#F7F7F5', ink: NAVY, fino: '#8C95A6' };

/** caixa com faces, decorações e sombras */
function caixa(b, mat, o = {}) {
  return { tipo: 'caixa', b, mat, deco: o.deco || {}, sem: o.sem || [], sombra: o.sombra !== false, op: o.op };
}
function desenhaDeco(C, F, d, R) {
  const e = 0.015;
  const P3 = (u, v) => C(...F.uv(u, v, e));
  const Q = (u0, v0, u1, v1) => [P3(u0, v0), P3(u1, v0), P3(u1, v1), P3(u0, v1)];
  const seg = (a, b) => `M${N(a[0])} ${N(a[1])}L${N(b[0])} ${N(b[1])}`;
  let s = '';
  if (d.t === 'vidro') {
    const [u0, v0, u1, v1] = d.r;
    const cols = d.cols || 1;
    const rows = d.rows || 1;
    const cw = (u1 - u0) / cols;
    const rh = (v1 - v0) / rows;
    let m = '';
    for (let i = 1; i < cols; i++) m += seg(P3(u0 + i * cw, v0), P3(u0 + i * cw, v1));
    for (let j = 1; j < rows; j++) m += seg(P3(u0, v0 + j * rh), P3(u1, v0 + j * rh));
    if (R) {
      s += pg(Q(u0, v0, u1, v1), { fill: d.grad || 'url(#vid)' });
      let st = '';
      for (let i = 0; i < cols; i++)
        for (let j = 0; j < rows; j++) {
          const B = (a, b2) => P3(u0 + (i + a) * cw, v0 + (j + b2) * rh);
          st += D([B(0.36, 1), B(0.6, 1), B(0.3, 0), B(0.06, 0)], 1) + D([B(0.7, 1), B(0.77, 1), B(0.47, 0), B(0.4, 0)], 1);
        }
      s += pa(st, { fill: '#fff', 'fill-opacity': 0.09 });
      s += pa(m + D(Q(u0, v0, u1, v1), 1), { fill: 'none', stroke: '#2A2F37', 'stroke-width': d.sw || 1.4, 'stroke-linejoin': 'round' });
    } else {
      s += pg(Q(u0, v0, u1, v1), { fill: '#fff', stroke: WIRE.ink, 'stroke-width': 0.9 });
      let rf = '';
      for (let i = 0; i < cols; i++) {
        const B = (a, b2) => P3(u0 + (i + a) * cw, v0 + b2 * (v1 - v0));
        rf += seg(B(0.55, 0.92), B(0.3, 0.62)) + seg(B(0.68, 0.92), B(0.48, 0.68));
      }
      s += pa(m, { fill: 'none', stroke: WIRE.ink, 'stroke-width': 0.7 }) + pa(rf, { fill: 'none', stroke: WIRE.fino, 'stroke-width': 0.6 });
    }
  } else if (d.t === 'painel') {
    const [u0, v0, u1, v1] = d.r;
    let l = '';
    if (d.dir === 'h') for (let v = v0 + d.passo; v < v1 - 1e-6; v += d.passo) l += seg(P3(u0, v), P3(u1, v));
    else for (let u = u0 + d.passo; u < u1 - 1e-6; u += d.passo) l += seg(P3(u, v0), P3(u, v1));
    if (R) {
      s += pg(Q(u0, v0, u1, v1), { fill: sombreia(d.mat, F.n), stroke: '#000', 'stroke-opacity': 0.25, 'stroke-width': 0.6 });
      s += pa(l, { fill: 'none', stroke: '#000', 'stroke-opacity': d.opL || 0.22, 'stroke-width': 0.8 });
    } else {
      s += pg(Q(u0, v0, u1, v1), { fill: WIRE.bg, stroke: WIRE.ink, 'stroke-width': 0.9 });
      s += pa(l, { fill: 'none', stroke: WIRE.fino, 'stroke-width': 0.55 });
    }
  } else if (d.t === 'linhas') {
    const [u0, v0, u1, v1] = d.r;
    let l = '';
    if (d.dir === 'v') for (let u = u0 + d.passo; u < u1 - 1e-6; u += d.passo) l += seg(P3(u, v0), P3(u, v1));
    else for (let v = v0 + d.passo; v < v1 - 1e-6; v += d.passo) l += seg(P3(u0, v), P3(u1, v));
    s += pa(l, R ? { fill: 'none', stroke: '#000', 'stroke-opacity': d.op || 0.12, 'stroke-width': 0.7 } : { fill: 'none', stroke: WIRE.fino, 'stroke-width': 0.5, 'stroke-opacity': 0.8 });
  } else if (d.t === 'sombra' && R) {
    s += pg(d.p.map(([u, v]) => P3(u, v)), { fill: '#1C2430', 'fill-opacity': d.op || 0.24 });
  } else if (d.t === 'gradiente' && R) {
    s += pg(Q(...d.r), { fill: d.fill });
  }
  return s;
}
function desenhaCaixa(C, o, R, arestas) {
  const Fs = faces3(o.b);
  let s = '';
  for (const k of ['-z', '+z', '-y', '+y', '-x', '+x']) {
    if (o.sem.includes(k)) continue;
    const F = Fs[k];
    if (!visivel(C, F)) continue;
    const q = [F.uv(0, 0), F.uv(F.w, 0), F.uv(F.w, F.h), F.uv(0, F.h)].map((p) => C(...p));
    if (R) {
      const fill = o.mat === 'vidro' ? 'url(#vid)' : o.mat === 'guarda' ? '#DCE6F0' : sombreia(o.mat, F.n);
      s += pg(q, { fill, 'fill-opacity': o.mat === 'guarda' ? 0.35 : o.op, stroke: '#1A1F27', 'stroke-opacity': 0.28, 'stroke-width': 0.6, 'stroke-linejoin': 'round' });
    } else s += pg(q, { fill: o.mat === 'guarda' ? 'none' : WIRE.bg, stroke: WIRE.ink, 'stroke-width': 1.15, 'stroke-linejoin': 'round' });
    for (const d of o.deco[k] || []) s += desenhaDeco(C, F, d, R);
  }
  if (arestas) {
    const [x0, x1, y0, y1, z0, z1] = o.b;
    const c = [
      [x0, y0], [x1, y0], [x1, y1], [x0, y1],
    ];
    let d = '';
    for (const z of [z0, z1]) d += D(c.map(([x, y]) => C(x, y, z)), 1);
    for (const [x, y] of c) d += D([C(x, y, z0), C(x, y, z1)]);
    arestas.push(d);
  }
  return s;
}
/** árvore em perspectiva (copa em círculos) */
function arvore3(x, y, h, r, seed = 1) {
  return {
    tipo: 'arvore',
    x,
    y,
    h,
    r,
    fn: (C, R) => {
      const [bxp, byp, Z] = C(x, y, 0);
      const [tx, ty] = C(x, y, h - r * 0.85);
      const pr = (C.f * r) / Z;
      const rnd = rng(seed);
      const cs = [[tx, ty, pr * 0.78]];
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * 6.283 + rnd() * 0.5;
        const dd = pr * (0.42 + rnd() * 0.2);
        cs.push([tx + Math.cos(a) * dd, ty + Math.sin(a) * dd * 0.9, pr * (0.4 + rnd() * 0.18)]);
      }
      const tw2 = Math.max(1.2, (C.f * 0.09) / Z);
      const tronco = pg([[bxp - tw2, byp], [bxp + tw2, byp], [tx + tw2 * 0.6, ty + pr * 0.2], [tx - tw2 * 0.6, ty + pr * 0.2]]);
      if (R) {
        const cc = cs.map(([a, b2, q]) => ci(a, b2, q)).join('');
        const hl = cs
          .filter((_, i) => i % 2 === 0)
          .map(([a, b2, q]) => ci(a + q * 0.18, b2 - q * 0.2, q * 0.62))
          .join('');
        const hl2 = cs
          .filter((_, i) => i % 3 === 1)
          .map(([a, b2, q]) => ci(a + q * 0.3, b2 - q * 0.32, q * 0.34))
          .join('');
        return G({ fill: '#5B4A3A' }, tronco) + G({ fill: '#5E6D55' }, cc) + G({ fill: '#76866A' }, hl) + G({ fill: '#91A083', 'fill-opacity': 0.8 }, hl2);
      }
      const cc = cs.map(([a, b2, q]) => ci(a, b2, q)).join('');
      return G({ fill: WIRE.bg, stroke: WIRE.fino, 'stroke-width': 0.9 }, tronco) + G({ fill: 'none', stroke: WIRE.fino, 'stroke-width': 1.8 }, cc) + G({ fill: WIRE.bg }, cc);
    },
  };
}
function arbusto3(x0, x1, y, h, seed = 2) {
  return {
    tipo: 'fn',
    fn: (C, R) => {
      const rnd = rng(seed);
      const cs = [];
      for (let x = x0; x <= x1 + 1e-6; x += h * 0.8) {
        const [a, b2, Z] = C(x + rnd() * 0.1, y + rnd() * 0.2, h * 0.45);
        cs.push([a, b2, ((C.f * h) / Z) * (0.55 + rnd() * 0.15)]);
      }
      const cc = cs.map(([a, b2, q]) => ci(a, b2, q)).join('');
      if (R) return G({ fill: '#56654E' }, cc) + G({ fill: '#6F7F63' }, cs.map(([a, b2, q]) => ci(a + q * 0.2, b2 - q * 0.25, q * 0.6)).join(''));
      return G({ fill: 'none', stroke: WIRE.fino, 'stroke-width': 1.6 }, cc) + G({ fill: WIRE.bg }, cc);
    },
  };
}
/** sombras projetadas no chão (um único path, sem dupla escuridão) */
function sombras3(C, objs) {
  let d = '';
  for (const o of objs) {
    if (o.tipo === 'caixa' && o.sombra) {
      const [x0, x1, y0, y1, z0, z1] = o.b;
      const pts = [];
      for (const x of [x0, x1]) for (const y of [y0, y1]) for (const z of [z0, z1]) pts.push(noChao([x, y, z]));
      d += D(casco(pts).map(([x, y]) => C(x, y, 0)), 1);
    } else if (o.tipo === 'arvore') {
      const [sx, sy] = noChao([o.x, o.y, o.h - o.r]);
      const circ = [];
      for (let i = 0; i < 20; i++) circ.push([sx + o.r * 0.9 * Math.cos((i / 20) * 6.283), sy + o.r * 0.9 * Math.sin((i / 20) * 6.283)]);
      d += D(circ.map(([x, y]) => C(x, y, 0)), 1);
    }
  }
  return pa(d, { fill: '#1E2733', 'fill-opacity': 0.26 });
}
/** linha 3D com recorte no plano próximo */
function seg3(C, a, b, near = 0.6) {
  const za = C(...a)[2];
  const zb = C(...b)[2];
  if (za < near && zb < near) return '';
  let A1 = a;
  let B1 = b;
  if (za < near) {
    const t = (near - za) / (zb - za);
    A1 = a.map((v, i) => v + (b[i] - v) * t);
  }
  if (zb < near) {
    const t = (near - zb) / (za - zb);
    B1 = b.map((v, i) => v + (a[i] - v) * t);
  }
  return D([C(...A1), C(...B1)]);
}
function cena3(C, objs, R, o = {}) {
  let s = '';
  LUZ = { v: o.luz || SOL, amb: o.amb ?? 0.18 };
  const arestas = R ? null : [];
  if (R && o.sombras !== false) s += sombras3(C, objs);
  for (const ob of objs) {
    if (ob.tipo === 'caixa') s += desenhaCaixa(C, ob, R, arestas);
    else s += ob.fn(C, R);
  }
  if (!R && o.ocultas !== false) s += pa(arestas.join(''), { fill: 'none', stroke: NV3, 'stroke-width': 0.6, 'stroke-dasharray': '3 3', 'stroke-opacity': 0.45 });
  LUZ = { v: SOL, amb: 0.18 };
  return s;
}
const DEF_VIDRO = `<linearGradient id="vid" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6D82A3"/><stop offset=".45" stop-color="#3C5378"/><stop offset="1" stop-color="#22324F"/></linearGradient>`;

/* ---- residência (mesma geometria para render e modelo 3D) ---- */
function cenaResidencia() {
  const A = caixa([0, 11, 0, 9, 0, 3.1], 'branco', {
    deco: {
      '-y': [
        { t: 'painel', r: [0.45, 0, 1.75, 2.8], mat: 'madeira', passo: 0.13 },
        { t: 'vidro', r: [2.3, 0, 10.8, 2.85], cols: 4 },
        { t: 'sombra', p: [[2.5, 3.1], [11, 3.1], [11, 1.95], [1.65, 1.95]], op: 0.22 },
      ],
    },
  });
  const B = caixa([2.5, 16.5, -1.0, 8.0, 3.1, 6.3], 'branco', {
    deco: {
      '-y': [
        { t: 'vidro', r: [1.2, 0.8, 9.8, 2.5], cols: 5 },
        { t: 'painel', r: [10.3, 0.3, 13.5, 2.9], mat: 'madeira', passo: 0.16 },
      ],
      '-x': [{ t: 'vidro', r: [6.2, 0.8, 7.4, 2.5], cols: 1 }],
    },
  });
  const E = caixa([2.3, 16.7, -1.2, 8.2, 6.3, 6.45], 'branco');
  const Gw = caixa([11, 16.5, 7.6, 8.0, 0, 3.1], 'pedra', {
    deco: { '-y': [{ t: 'linhas', r: [0, 0, 5.5, 3.1], passo: 0.45, op: 0.16 }, { t: 'sombra', p: [[0, 0], [5.5, 0], [5.5, 3.1], [0, 3.1]], op: 0.32 }] },
  });
  const Dt = caixa([-2.6, 0, 0.5, 9.0, 0, 6.9], 'concreto', {
    deco: {
      '-y': [{ t: 'linhas', r: [0, 0, 2.6, 6.9], passo: 0.6 }, { t: 'vidro', r: [1.05, 0.8, 1.55, 6.2], cols: 1, rows: 4, sw: 1 }],
      '-x': [{ t: 'linhas', r: [0, 0, 8.5, 6.9], passo: 0.6 }, { t: 'linhas', r: [0, 0, 8.5, 6.9], passo: 1.2, dir: 'v' }],
    },
  });
  const deck = caixa([0.3, 11, -1.6, 0, 0, 0.06], 'madeira', { sombra: false, deco: { '+z': [{ t: 'linhas', r: [0, 0, 10.7, 1.6], passo: 0.14, dir: 'v', op: 0.18 }] } });
  return [
    arvore3(21.0, 7.5, 7.2, 2.5, 13),
    E,
    B,
    Gw,
    arbusto3(11.6, 16.0, 7.2, 0.7, 23),
    deck,
    A,
    Dt,
    arbusto3(-2.4, -0.3, -0.6, 0.9, 21),
    arvore3(-6.0, -2.2, 5.6, 2.0, 17),
    arbusto3(17.6, 21.0, -3.0, 1.0, 29),
    arbusto3(-13, -4.5, -4.1, 0.9, 31),
  ];
}
function camResidencia() {
  const pts = [];
  for (const b of [[-2.6, 16.7, -1.2, 9, 0, 6.9]]) for (const x of [b[0], b[1]]) for (const y of [b[2], b[3]]) for (const z of [b[4], b[5]]) pts.push([x, y, z]);
  return camFit([-4.5, -22, 1.6], [7.5, 4.5, 1.6], pts, [70, 135, 1130, 740]);
}
function fundoRender(C, W, H, seed = 3) {
  const hz = C.cy;
  const rnd = rng(seed);
  let d1 = `M0 ${N(hz)}`;
  let d2 = `M0 ${N(hz)}`;
  for (let x = 0; x <= W; x += 18) {
    d1 += `L${x} ${N(hz - 10 - rnd() * 22)}`;
    d2 += `L${x} ${N(hz - 4 - rnd() * 12)}`;
  }
  d1 += `L${W} ${N(hz)}Z`;
  d2 += `L${W} ${N(hz)}Z`;
  return (
    rc(0, 0, W, hz + 1, { fill: 'url(#ceu)' }) +
    pa(d1, { fill: '#AEB7AA', 'fill-opacity': 0.55 }) +
    pa(d2, { fill: '#96A293', 'fill-opacity': 0.6 }) +
    rc(0, hz, W, H - hz, { fill: 'url(#grama)' })
  );
}
const DEF_CEU = `<linearGradient id="ceu" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A9BBD1"/><stop offset=".7" stop-color="#D9E1E9"/><stop offset="1" stop-color="#EEF0F0"/></linearGradient>`;
const DEF_GRAMA = `<linearGradient id="grama" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#A9B29C"/><stop offset="1" stop-color="#7E8A6C"/></linearGradient>`;
function chao3(C, pts, attrs) {
  return pg(pts.map(([x, y]) => C(x, y, 0)), attrs);
}

SVGS['render-residencia'] = () => {
  const W = 1200;
  const H = 900;
  const C = camResidencia();
  const body =
    fundoRender(C, W, H) +
    chao3(C, [[11, -6.4], [16.5, -6.4], [16.5, 7.6], [11, 7.6]], { fill: '#D3D1CB' }) +
    chao3(C, [[0.45, -6.4], [1.75, -6.4], [1.75, -1.6], [0.45, -1.6]], { fill: '#CFCCC5' }) +
    chao3(C, [[-30, -6.4], [45, -6.4], [45, -4.6], [-30, -4.6]], { fill: '#D9D7D1' }) +
    chao3(C, [[-30, -6.4], [45, -6.4], [45, -6.6], [-30, -6.6]], { fill: '#B9B6AF' }) +
    chao3(C, [[-30, -6.6], [45, -6.6], [45, -9], [-30, -9]], { fill: '#6F7479' }) +
    cena3(C, cenaResidencia(), true);
  return svgDoc({ w: W, h: H, th: { bg: '#E9ECEE' }, defs: [DEF_VIDRO, DEF_CEU, DEF_GRAMA], body });
};

SVGS['wireframe-residencia'] = () => {
  const W = 1200;
  const H = 900;
  const C = camResidencia();
  let grid = '';
  for (let x = -24; x <= 40; x += 2) grid += seg3(C, [x, -16, 0], [x, 40, 0]);
  for (let y = -16; y <= 40; y += 2) grid += seg3(C, [-24, y, 0], [40, y, 0]);
  const hz = C.cy;
  // gizmo de eixos
  const g0 = [70, 830];
  const gz =
    G(
      { 'stroke-width': 1.6, fill: 'none' },
      ln(g0[0], g0[1], g0[0] + 34, g0[1] + 10, { stroke: VERM }),
      ln(g0[0], g0[1], g0[0] + 22, g0[1] - 16, { stroke: VERDE }),
      ln(g0[0], g0[1], g0[0], g0[1] - 36, { stroke: NV3 }),
    ) +
    T(g0[0] + 38, g0[1] + 16, 'X', { fs: 9, fill: VERM, fw: 700 }) +
    T(g0[0] + 25, g0[1] - 19, 'Y', { fs: 9, fill: VERDE, fw: 700 }) +
    T(g0[0] - 3, g0[1] - 41, 'Z', { fs: 9, fill: NV3, fw: 700 });
  const body =
    pa(grid, { fill: 'none', stroke: '#C9CED8', 'stroke-width': 0.6 }) +
    ln(0, hz, W, hz, { stroke: '#AEB6C4', 'stroke-width': 0.8 }) +
    chao3(C, [[11, -6.4], [16.5, -6.4], [16.5, 7.6], [11, 7.6]], { fill: 'none', stroke: WIRE.fino, 'stroke-width': 0.7 }) +
    chao3(C, [[0.45, -6.4], [1.75, -6.4], [1.75, -1.6], [0.45, -1.6]], { fill: 'none', stroke: WIRE.fino, 'stroke-width': 0.7 }) +
    chao3(C, [[-30, -6.4], [45, -6.4], [45, -4.6], [-30, -4.6]], { fill: 'none', stroke: WIRE.fino, 'stroke-width': 0.7 }) +
    cena3(C, cenaResidencia(), false) +
    gz +
    T(40, 52, 'MODELO 3D', { fs: 12, fw: 700, fill: NAVY, ls: 2 }) +
    T(40, 70, 'VISTA EM PERSPECTIVA · ARESTAS OCULTAS TRACEJADAS', { fs: 9, fill: GRAF, ls: 0.8 });
  return svgDoc({ w: W, h: H, th: { bg: WIRE.bg }, body });
};

/* ---- edifício multifamiliar (render) ---- */
SVGS['render-multifamiliar'] = () => {
  const W = 1200;
  const H = 900;
  const Mdeco = { '-y': [], '-x': [] };
  for (let f = 0; f < 4; f++) {
    const v = 3 * f;
    Mdeco['-y'].push(
      { t: 'vidro', r: [0.8, v + 0.9, 3.8, v + 2.3], cols: 2 },
      { t: 'vidro', r: [4.6, v + 0.05, 7.4, v + 2.5], cols: 2 },
      { t: 'vidro', r: [10.6, v + 0.05, 13.4, v + 2.5], cols: 2 },
      { t: 'vidro', r: [14.2, v + 0.9, 17.2, v + 2.3], cols: 2 },
    );
    Mdeco['-x'].push({ t: 'vidro', r: [1.6, v + 0.9, 4.2, v + 2.3], cols: 2 }, { t: 'vidro', r: [7.2, v + 0.9, 9.8, v + 2.3], cols: 2 });
  }
  Mdeco['-y'].push({ t: 'painel', r: [8.3, 0, 9.7, 12], mat: 'madeira', passo: 0.14 }, { t: 'linhas', r: [0, 0, 8.3, 12], passo: 3, op: 0.2 }, { t: 'linhas', r: [9.7, 0, 18, 12], passo: 3, op: 0.2 });
  Mdeco['-x'].push({ t: 'linhas', r: [0, 0, 12, 12], passo: 3, op: 0.2 });
  const objs = [
    arvore3(22, 15, 8, 2.8, 41),
    caixa([6, 12, 4, 10, 15.2, 17.2], 'concreto', { deco: { '-y': [{ t: 'linhas', r: [0, 0, 6, 2], passo: 0.5, op: 0.12 }] } }),
    caixa([0, 18, 0, 12, 3.2, 15.2], 'branco', { deco: Mdeco }),
    caixa([1.2, 16.8, 1.5, 11, 0, 3.2], 'escuro', {
      deco: { '-y': [{ t: 'vidro', r: [0, 0, 15.6, 3.2], cols: 8 }], '-x': [{ t: 'vidro', r: [0, 0, 9.5, 3.2], cols: 5 }] },
    }),
  ];
  for (const x of [0.3, 6.1, 11.9, 17.7]) objs.push(caixa([x - 0.2, x + 0.2, 0.1, 0.5, 0, 3.2], 'concreto'));
  for (const y of [6, 11.5]) objs.push(caixa([0.1, 0.5, y - 0.2, y + 0.2, 0, 3.2], 'concreto'));
  for (let f = 3; f >= 0; f--) {
    const z = 3.2 + 3 * f;
    for (const [a, b] of [
      [4.2, 7.8],
      [10.2, 13.8],
    ]) {
      objs.push(caixa([a, b, -1.6, 0, z - 0.14, z + 0.06], 'branco'));
      objs.push(caixa([a, b, -1.6, -1.52, z + 0.06, z + 1.1], 'guarda', { sombra: false }));
      objs.push(caixa([a, b, -1.62, -1.5, z + 1.08, z + 1.14], 'grafite', { sombra: false }));
    }
  }
  objs.push(arbusto3(-1.2, 5.5, -2.6, 0.9, 43), arvore3(-4.5, -4.0, 7.0, 2.4, 45), arvore3(22.5, -3.0, 6.4, 2.2, 47));
  const pts = [];
  for (const x of [0, 18]) for (const y of [-1.6, 12]) for (const z of [0, 17.2]) pts.push([x, y, z]);
  const C = camFit([-10, -30, 1.6], [9, 6, 1.6], pts, [190, 60, 1010, 760]);
  const body =
    fundoRender(C, W, H, 7) +
    chao3(C, [[-3, -6], [21, -6], [21, 0], [-3, 0]], { fill: '#D6D3CC' }) +
    chao3(C, [[-40, -7.6], [60, -7.6], [60, -6], [-40, -6]], { fill: '#DDDBD5' }) +
    chao3(C, [[-40, -7.6], [60, -7.6], [60, -7.8], [-40, -7.8]], { fill: '#B9B6AF' }) +
    chao3(C, [[-40, -7.8], [60, -7.8], [60, -12], [-40, -12]], { fill: '#6F7479' }) +
    cena3(C, objs, true);
  return svgDoc({ w: W, h: H, th: { bg: '#E9ECEE' }, defs: [DEF_VIDRO, DEF_CEU, DEF_GRAMA], body });
};

/* ---- interiores (perspectiva de um ponto) ---- */
const LUZ_INT = (() => {
  const v = [0.25, -0.5, 0.83];
  const l = Math.hypot(...v);
  return v.map((c) => c / l);
})();
const q3 = (C, pts, a) => pg(pts.map((p) => C(...p)), a);
const anel3 = (C, x, y, z, r, n = 18) => Array.from({ length: n }, (_, i) => C(x + r * Math.cos((i / n) * 6.283), y + r * Math.sin((i / n) * 6.283), z));
function fnObj(fn) {
  return { tipo: 'fn', fn };
}
/** janela no fundo com vista externa */
function janelaFundo(C, x0, x1, z0, z1, y, mont = []) {
  let s = q3(C, [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], { fill: 'url(#ext)' });
  const rnd = rng(5);
  let d = '';
  const zh = 1.05;
  const pts = [];
  for (let x = x0; x <= x1 + 1e-6; x += 0.12) pts.push([x, y, zh + 0.12 + rnd() * 0.35]);
  d = D([C(x0, y, z0), ...pts.map((p) => C(...p)), C(x1, y, z0)], 1);
  s += pa(d, { fill: '#8F9C83' });
  const pts2 = [];
  for (let x = x0; x <= x1 + 1e-6; x += 0.2) pts2.push([x, y, zh - 0.1 + rnd() * 0.18]);
  s += pa(D([C(x0, y, z0), ...pts2.map((p) => C(...p)), C(x1, y, z0)], 1), { fill: '#6F7E64' });
  s += q3(C, [[x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]], { fill: '#fff', 'fill-opacity': 0.12 });
  let m = D([C(x0, y, z0), C(x1, y, z0), C(x1, y, z1), C(x0, y, z1)], 1);
  for (const x of mont) m += D([C(x, y, z0), C(x, y, z1)]);
  s += pa(m, { fill: 'none', stroke: '#2B3038', 'stroke-width': 3, 'stroke-linejoin': 'round' });
  return s;
}
const DEF_EXT = `<linearGradient id="ext" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#B9C8DA"/><stop offset="1" stop-color="#EDF0F1"/></linearGradient>`;
const DEF_PISO = `<linearGradient id="piso" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#C39D76"/><stop offset="1" stop-color="#94694A"/></linearGradient>`;
const DEF_BRILHO = `<radialGradient id="brilho"><stop offset="0" stop-color="#FFE9B8" stop-opacity=".38"/><stop offset="1" stop-color="#FFE9B8" stop-opacity="0"/></radialGradient>`;
function pendente(C, x, y, zb, r, zTeto, cor = '#1F2B40') {
  const top = anel3(C, x, y, zb + r * 0.9, r * 0.35);
  const bot = anel3(C, x, y, zb, r);
  const hull = casco([...top, ...bot].map((p) => [p[0], p[1]]));
  const [gx, gy, Z] = C(x, y, zb);
  const R = (C.f * r) / Z;
  return (
    pa(D([C(x, y, zTeto), C(x, y, zb + r * 0.9)]), { stroke: '#2A2E35', 'stroke-width': 1 }) +
    ci(gx, gy + R * 0.3, R * 2.3, { fill: 'url(#brilho)' }) +
    pg(hull, { fill: cor }) +
    pg(bot, { fill: '#F7E7C4' })
  );
}

SVGS['interior-sala'] = () => {
  const W = 1200;
  const H = 900;
  const C = camera([0.25, -0.3, 1.25], [0.25, 10, 1.25], 700, 600, 470);
  const X0 = -2.8;
  const X1 = 2.8;
  const Y0 = 0.2;
  const Y1 = 7;
  const Z1 = 2.8;
  let s = '';
  s += q3(C, [[X0, Y1, 0], [X1, Y1, 0], [X1, Y1, Z1], [X0, Y1, Z1]], { fill: '#EFECE6' });
  s += q3(C, [[X0, Y0, Z1], [X1, Y0, Z1], [X1, Y1, Z1], [X0, Y1, Z1]], { fill: '#F1EFEA' });
  s += q3(C, [[X0, Y0, 0], [X1, Y0, 0], [X1, Y1, 0], [X0, Y1, 0]], { fill: 'url(#piso)' });
  s += q3(C, [[X0, Y0, 0], [X0, Y1, 0], [X0, Y1, Z1], [X0, Y0, Z1]], { fill: '#DCD7CF' });
  s += q3(C, [[X1, Y0, 0], [X1, Y1, 0], [X1, Y1, Z1], [X1, Y0, Z1]], { fill: '#E7E3DC' });
  // réguas do piso
  let pl = '';
  for (let x = X0 + 0.19; x < X1; x += 0.19) pl += seg3(C, [x, Y0, 0], [x, Y1, 0]);
  const rnd = rng(9);
  for (let x = X0; x < X1 - 0.1; x += 0.19) {
    const y = Y0 + rnd() * (Y1 - Y0);
    pl += seg3(C, [x, y, 0], [x + 0.19, y, 0]);
  }
  s += pa(pl, { fill: 'none', stroke: '#6E4D34', 'stroke-opacity': 0.28, 'stroke-width': 0.7 });
  // rodapés, sanca e spots
  s += pa(seg3(C, [X0, Y1, 0.08], [X1, Y1, 0.08]) + seg3(C, [X0, Y0, 0.08], [X0, Y1, 0.08]) + seg3(C, [X1, Y0, 0.08], [X1, Y1, 0.08]), { stroke: '#C9C3B9', 'stroke-width': 1.2, fill: 'none' });
  s += pa(seg3(C, [X0 + 0.4, Y0, Z1], [X0 + 0.4, Y1, Z1]) + seg3(C, [X1 - 0.4, Y0, Z1], [X1 - 0.4, Y1, Z1]), { stroke: '#D9D5CD', 'stroke-width': 1.4, fill: 'none' });
  for (const y of [1.5, 3.2, 4.9, 6.3]) for (const x of [X0 + 0.7, X1 - 0.7]) s += pg(anel3(C, x, y, Z1, 0.06, 10), { fill: '#FFF8E6', stroke: '#CFC9BF', 'stroke-width': 0.6 });
  // janela, luz no piso, cortinas
  s += janelaFundo(C, -2.0, 2.0, 0.25, 2.55, Y1, [-0.67, 0.67]);
  s += q3(C, [[-1.6, 6.9, 0.002], [2.0, 6.9, 0.002], [2.6, 4.2, 0.002], [-0.9, 4.2, 0.002]], { fill: '#FFF4DA', 'fill-opacity': 0.22 });
  for (const [a, b] of [
    [-2.55, -1.75],
    [1.75, 2.55],
  ]) {
    s += q3(C, [[a, 6.85, 0.02], [b, 6.85, 0.02], [b, 6.85, 2.72], [a, 6.85, 2.72]], { fill: '#EAE5DB', 'fill-opacity': 0.92 });
    let fold = '';
    for (let x = a + 0.1; x < b; x += 0.13) fold += seg3(C, [x, 6.84, 0.02], [x, 6.84, 2.72]);
    s += pa(fold, { stroke: '#BDB5A8', 'stroke-width': 0.8, fill: 'none', 'stroke-opacity': 0.6 });
  }
  // painel ripado + TV
  s += q3(C, [[X0 + 0.02, 2.0, 0], [X0 + 0.02, 5.4, 0], [X0 + 0.02, 5.4, Z1], [X0 + 0.02, 2.0, Z1]], { fill: '#9E7553' });
  let rip = '';
  for (let y = 2.09; y < 5.4; y += 0.09) rip += seg3(C, [X0 + 0.03, y, 0], [X0 + 0.03, y, Z1]);
  s += pa(rip, { stroke: '#5E412B', 'stroke-width': 0.8, 'stroke-opacity': 0.55, fill: 'none' });
  s += q3(C, [[X0 + 0.05, 2.95, 1.05], [X0 + 0.05, 4.45, 1.05], [X0 + 0.05, 4.45, 1.9], [X0 + 0.05, 2.95, 1.9]], { fill: '#15181E' });
  s += q3(C, [[X0 + 0.06, 3.1, 1.12], [X0 + 0.06, 3.55, 1.12], [X0 + 0.06, 3.35, 1.83], [X0 + 0.06, 3.0, 1.83]], { fill: '#fff', 'fill-opacity': 0.06 });
  // quadro na parede direita
  s += q3(C, [[X1 - 0.02, 3.0, 1.35], [X1 - 0.02, 4.4, 1.35], [X1 - 0.02, 4.4, 2.05], [X1 - 0.02, 3.0, 2.05]], { fill: '#F4F2EE', stroke: '#2B3038', 'stroke-width': 1.6 });
  s += q3(C, [[X1 - 0.03, 3.12, 1.45], [X1 - 0.03, 4.28, 1.45], [X1 - 0.03, 4.28, 1.95], [X1 - 0.03, 3.12, 1.95]], { fill: NV2 });
  s += q3(C, [[X1 - 0.035, 3.6, 1.45], [X1 - 0.035, 4.28, 1.45], [X1 - 0.035, 4.28, 1.7], [X1 - 0.035, 3.9, 1.95], [X1 - 0.035, 3.6, 1.95]], { fill: NV4 });
  // tapete
  s += q3(C, [[-1.7, 2.1, 0.004], [1.2, 2.1, 0.004], [1.2, 5.6, 0.004], [-1.7, 5.6, 0.004]], { fill: '#D4CCBF' });
  s += q3(C, [[-1.55, 2.25, 0.005], [1.05, 2.25, 0.005], [1.05, 5.45, 0.005], [-1.55, 5.45, 0.005]], { fill: 'none', stroke: '#B7AD9E', 'stroke-width': 1 });
  const objs = [
    caixa([X0, X0 + 0.45, 2.3, 5.1, 0.3, 0.62], 'madeira'),
    caixa([-2.1, -1.3, 6.3, 6.5, 0.42, 0.9], 'claro'),
    caixa([-2.1, -1.3, 5.7, 6.5, 0.12, 0.44], 'claro'),
    caixa([1.95, 2.45, 6.1, 6.6, 0, 0.5], 'concreto'),
    fnObj((Cc) => {
      const rnd2 = rng(12);
      let f = '';
      let st = '';
      const [bx0, by0] = Cc(2.2, 6.35, 0.5);
      for (let i = 0; i < 22; i++) {
        const a = rnd2() * 6.283;
        const z = 0.75 + rnd2() * 1.05;
        const [x, y] = Cc(2.2 + Math.cos(a) * 0.3 * (z - 0.4), 6.35 + Math.sin(a) * 0.2, z);
        st += `M${N(bx0)} ${N(by0)}Q${N((bx0 + x) / 2)} ${N(y + 20)} ${N(x)} ${N(y)}`;
        f += el(x, y, 10 + rnd2() * 9, 3.5 + rnd2() * 3.5, { transform: `rotate(${N(-60 + rnd2() * 120)} ${N(x)} ${N(y)})` });
      }
      return pa(st, { fill: 'none', stroke: '#4F5F48', 'stroke-width': 1.1 }) + G({ fill: '#5C6E55' }, f);
    }),
    caixa([-0.6, 0.3, 3.35, 4.15, 0, 0.3], 'grafite'),
    caixa([-0.75, 0.45, 3.2, 4.3, 0.3, 0.36], 'madeira'),
    caixa([2.15, 2.5, 2.5, 5.0, 0.42, 0.9], 'tecido'),
    caixa([1.35, 2.45, 2.5, 5.0, 0.1, 0.42], 'tecido'),
    caixa([1.35, 2.5, 4.78, 5.0, 0.42, 0.66], 'tecido'),
    caixa([1.4, 2.15, 3.77, 4.76, 0.42, 0.53], 'tecido'),
    caixa([1.4, 2.15, 2.74, 3.75, 0.42, 0.53], 'tecido'),
    caixa([2.0, 2.14, 4.15, 4.55, 0.53, 0.84], 'claro'),
    caixa([2.0, 2.14, 3.05, 3.45, 0.53, 0.84], 'pedra'),
    caixa([1.35, 2.5, 2.5, 2.72, 0.42, 0.66], 'tecido'),
    fnObj((Cc) => pendente(Cc, -0.15, 3.75, 1.9, 0.24, Z1)),
  ];
  s += cena3(C, objs, true, { luz: LUZ_INT, amb: 0.42, sombras: false });
  return svgDoc({ w: W, h: H, th: { bg: '#EFECE6' }, defs: [DEF_EXT, DEF_PISO, DEF_BRILHO], body: s });
};

SVGS['interior-cozinha'] = () => {
  const W = 1200;
  const H = 900;
  const C = camera([0.35, -0.3, 1.45], [0.35, 10, 1.45], 680, 600, 455);
  const X0 = -2.9;
  const X1 = 2.9;
  const Y0 = 0.2;
  const Y1 = 6.4;
  const Z1 = 2.8;
  let s = '';
  s += q3(C, [[X0, Y1, 0], [X1, Y1, 0], [X1, Y1, Z1], [X0, Y1, Z1]], { fill: '#EEEBE6' });
  s += q3(C, [[X0, Y0, Z1], [X1, Y0, Z1], [X1, Y1, Z1], [X0, Y1, Z1]], { fill: '#F2F0EB' });
  s += q3(C, [[X0, Y0, 0], [X1, Y0, 0], [X1, Y1, 0], [X0, Y1, 0]], { fill: '#D8D4CD' });
  s += q3(C, [[X0, Y0, 0], [X0, Y1, 0], [X0, Y1, Z1], [X0, Y0, Z1]], { fill: '#E0DCD5' });
  s += q3(C, [[X1, Y0, 0], [X1, Y1, 0], [X1, Y1, Z1], [X1, Y0, Z1]], { fill: '#E9E5DE' });
  let tl = '';
  for (let x = X0 + 0.6; x < X1; x += 0.6) tl += seg3(C, [x, Y0, 0], [x, Y1, 0]);
  for (let y = Y0 + 0.4; y < Y1; y += 0.6) tl += seg3(C, [X0, y, 0], [X1, y, 0]);
  s += pa(tl, { fill: 'none', stroke: '#B3ADA4', 'stroke-width': 0.7, 'stroke-opacity': 0.8 });
  for (const y of [1.4, 3.3, 5.0]) for (const x of [-1.6, 0.35, 2.2]) s += pg(anel3(C, x, y, Z1, 0.05, 10), { fill: '#FFF8E6', stroke: '#CFC9BF', 'stroke-width': 0.6 });
  // revestimento (metrô) + janela
  s += q3(C, [[X0, Y1 - 0.005, 0.92], [1.25, Y1 - 0.005, 0.92], [1.25, Y1 - 0.005, 1.55], [X0, Y1 - 0.005, 1.55]], { fill: '#F4F3F0' });
  let az = '';
  for (let z = 1.0; z < 1.55; z += 0.08) az += seg3(C, [X0, Y1 - 0.01, z], [1.25, Y1 - 0.01, z]);
  s += pa(az, { stroke: '#CFCAC2', 'stroke-width': 0.6, fill: 'none' });
  s += janelaFundo(C, -0.7, 0.85, 1.1, 2.2, Y1 - 0.01, [0.075]);
  // prateleiras na parede esquerda
  const objs = [
    caixa([1.25, 2.9, 5.75, 6.4, 0, 2.45], 'madeira', { deco: { '-y': [{ t: 'linhas', r: [0, 0, 1.65, 2.45], passo: 0.55, dir: 'v', op: 0.35 }], '-x': [] } }),
    caixa([X0, 1.25, 5.8, 6.4, 0, 0.1], 'escuro'),
    caixa([X0, 1.25, 5.82, 6.4, 0.1, 0.87], 'navy', { deco: { '-y': [{ t: 'linhas', r: [0, 0, 4.15, 0.77], passo: 0.6, dir: 'v', op: 0.4 }, { t: 'linhas', r: [0, 0, 4.15, 0.77], passo: 0.6, op: 0.2 }] } }),
    caixa([X0, 1.25, 5.75, 6.4, 0.87, 0.92], 'pedraBranca'),
    caixa([X0, -0.95, 6.05, 6.4, 1.55, 2.35], 'claro', { deco: { '-y': [{ t: 'linhas', r: [0, 0, 1.95, 0.8], passo: 0.49, dir: 'v', op: 0.25 }] } }),
    fnObj((Cc) => {
      let f = q3(Cc, [[-0.35, 5.85, 0.922], [0.45, 5.85, 0.922], [0.45, 6.2, 0.922], [-0.35, 6.2, 0.922]], { fill: '#8E949C' });
      f += q3(Cc, [[-2.35, 5.85, 0.922], [-1.55, 5.85, 0.922], [-1.55, 6.3, 0.922], [-2.35, 6.3, 0.922]], { fill: '#1A1D22' });
      for (const [x, y] of [[-2.15, 5.97], [-1.75, 5.97], [-2.15, 6.18], [-1.75, 6.18]]) f += pg(anel3(Cc, x, y, 0.925, 0.08, 12), { fill: 'none', stroke: '#6B7078', 'stroke-width': 0.8 });
      f += pa(D([Cc(0.05, 6.3, 0.92), Cc(0.05, 6.3, 1.22), Cc(0.05, 6.08, 1.22), Cc(0.05, 6.08, 1.12)]), { fill: 'none', stroke: '#6B7078', 'stroke-width': 2 });
      return f;
    }),
    caixa([X0 + 0.05, X0 + 0.18, 4.95, 5.1, 1.44, 1.64], 'claro'),
    caixa([X0 + 0.05, X0 + 0.17, 4.6, 4.75, 1.44, 1.58], 'pedra'),
    caixa([X0 + 0.05, X0 + 0.2, 4.1, 4.45, 1.89, 2.03], 'concreto'),
    caixa([X0 + 0.04, X0 + 0.22, 3.75, 3.9, 1.89, 2.1], 'navy'),
    caixa([X0, X0 + 0.25, 3.6, 5.4, 1.4, 1.44], 'madeira'),
    caixa([X0, X0 + 0.25, 3.6, 5.4, 1.85, 1.89], 'madeira'),
    caixa([0.95, 1.15, 5.95, 6.15, 0.92, 1.1], 'concreto'),
    fnObj((Cc) => {
      const r3 = rng(4);
      let f = '';
      for (let i = 0; i < 9; i++) {
        const [x, y] = Cc(1.05 + (r3() - 0.5) * 0.25, 6.05, 1.12 + r3() * 0.3);
        f += el(x, y, 7 + r3() * 5, 3 + r3() * 2, { transform: `rotate(${N(-50 + r3() * 100)} ${N(x)} ${N(y)})` });
      }
      return G({ fill: '#5C6E55' }, f);
    }),
    caixa([-1.25, 1.15, 2.9, 3.75, 0, 0.88], 'madeira', { deco: { '-y': [{ t: 'linhas', r: [0, 0, 2.4, 0.88], passo: 0.12, dir: 'v', op: 0.3 }] } }),
    caixa([-1.4, 1.3, 2.7, 3.9, 0.88, 0.94], 'pedraBranca'),
  ];
  for (const x of [-0.8, 0.05, 0.9]) {
    objs.push(
      fnObj((Cc) => {
        let d = '';
        for (const [dx, dy] of [[-0.15, -0.15], [0.15, -0.15], [0.15, 0.15], [-0.15, 0.15]]) d += D([Cc(x + dx * 0.8, 2.35 + dy * 0.8, 0.62), Cc(x + dx, 2.35 + dy, 0)]);
        return pa(d, { stroke: '#2E3238', 'stroke-width': 1.6, fill: 'none' });
      }),
      caixa([x - 0.19, x + 0.19, 2.16, 2.54, 0.62, 0.68], 'grafite'),
    );
  }
  for (const x of [-0.75, 0.05, 0.85]) objs.push(fnObj((Cc) => pendente(Cc, x, 3.3, 1.75, 0.2, Z1)));
  s += cena3(C, objs, true, { luz: LUZ_INT, amb: 0.42, sombras: false });
  return svgDoc({ w: W, h: H, th: { bg: '#EEEBE6' }, defs: [DEF_EXT, DEF_BRILHO], body: s });
};

/* ------------------------------------------------------------------ */
/* Projetos complementares: elétrico e incêndio                         */
/* ------------------------------------------------------------------ */
const CSS_PL_CLARO = CSS_PL + `.jn{stroke:#9AA1AD}.jl{stroke:#9AA1AD}.pf{stroke:#9AA1AD}.ar{stroke:#AEB4BE}.vg{stroke:#AEB4BE}`;

/** caixa de legenda com símbolos */
function caixaLegenda(x, y, w, titulo, itens, hL = 22) {
  let s = rc(x, y, w, 30 + itens.length * hL, { fill: '#fff', stroke: NAVY, 'stroke-width': 0.8 });
  s += T(x + 12, y + 19, titulo, { fs: 10, fw: 700, fill: NAVY, ls: 1.2 });
  s += ln(x, y + 27, x + w, y + 27, { stroke: NAVY, 'stroke-width': 0.5 });
  itens.forEach(([sim, txt], i) => {
    const cy = y + 27 + hL * i + hL / 2 + 2;
    s += sim(x + 26, cy) + T(x + 50, cy + 3.5, txt, { fs: 9, fill: GRAF });
  });
  return s;
}

const SIM = {
  luz: (x, y, c = '', k = '') =>
    ci(x, y, 9, { fill: '#fff', stroke: NAVY, 'stroke-width': 1.1 }) +
    ln(x - 9, y, x + 9, y, { stroke: NAVY, 'stroke-width': 0.7 }) +
    (c ? T(x, y - 2, c, { fs: 7, anchor: 'middle', fill: NAVY, fw: 700 }) : '') +
    (k ? T(x, y + 7.5, k, { fs: 7, anchor: 'middle', fill: NAVY }) : ''),
  inter: (x, y, k = '') => ci(x, y, 3.6, { fill: NAVY }) + (k ? T(x + 6, y - 4, k, { fs: 8, fill: NAVY, fw: 600 }) : ''),
  tomada: (x, y, dir = 'u', tipo = 'b', c = '') => {
    const V = { u: [0, -1], d: [0, 1], l: [-1, 0], r: [1, 0] }[dir];
    const t = [-V[1], V[0]];
    const a = [x + V[0] * 10, y + V[1] * 10];
    const b1 = [x + t[0] * 6, y + t[1] * 6];
    const b2 = [x - t[0] * 6, y - t[1] * 6];
    let s = pg([a, b1, b2], { fill: tipo === 'a' ? NAVY : '#fff', stroke: NAVY, 'stroke-width': 1 });
    if (tipo === 'm') s += pg([a, b1, [x, y]], { fill: NAVY });
    if (c) s += T(a[0] + V[0] * 6 + t[0] * 8, a[1] + V[1] * 6 + t[1] * 8 + 3, c, { fs: 7.5, fill: NAVY, anchor: 'middle' });
    return s;
  },
  tue: (x, y, lab = 'CH') => rc(x - 8, y - 8, 16, 16, { fill: '#fff', stroke: NAVY, 'stroke-width': 1.1 }) + T(x, y + 3, lab, { fs: 7, fw: 700, fill: NAVY, anchor: 'middle' }),
  qdc: (x, y) => rc(x - 16, y - 8, 32, 16, { fill: '#fff', stroke: NAVY, 'stroke-width': 1.2 }) + pg([[x - 16, y + 8], [x + 16, y - 8], [x + 16, y + 8]], { fill: NAVY }),
  duto: (x, y) => pa(`M${x - 14} ${y + 4}Q${x} ${y - 8} ${x + 14} ${y + 4}`, { fill: 'none', stroke: NV3, 'stroke-width': 1.3 }),
  dutoPiso: (x, y) => pa(`M${x - 14} ${y + 4}Q${x} ${y - 8} ${x + 14} ${y + 4}`, { fill: 'none', stroke: NV3, 'stroke-width': 1.3, 'stroke-dasharray': '5 3' }),
  // incêndio
  ext: (x, y) =>
    rc(x - 9, y - 9, 18, 18, { fill: VERM, rx: 1.5 }) +
    rc(x - 3, y - 4, 6, 10, { fill: '#fff', rx: 1.5 }) +
    pa(`M${x - 1} ${y - 4}V${y - 6.5}H${x + 4}`, { fill: 'none', stroke: '#fff', 'stroke-width': 1.3 }),
  hid: (x, y) =>
    rc(x - 10, y - 10, 20, 20, { fill: '#fff', stroke: VERM, 'stroke-width': 1.6 }) + ci(x, y, 5.5, { fill: 'none', stroke: VERM, 'stroke-width': 1.3 }) + T(x, y + 3, 'H', { fs: 7, fw: 700, fill: VERM, anchor: 'middle' }),
  lum: (x, y) => rc(x - 8, y - 5, 16, 10, { fill: '#fff', stroke: NAVY, 'stroke-width': 1 }) + rc(x - 4, y - 2, 8, 4, { fill: NAVY }),
  saida: (x, y, dir = 1) =>
    rc(x - 15, y - 7, 30, 14, { fill: VERDE, rx: 1.5 }) + pa(`M${x - 8 * dir} ${y}H${x + 7 * dir}M${x + 3 * dir} ${y - 4}L${x + 7 * dir} ${y}L${x + 3 * dir} ${y + 4}`, { fill: 'none', stroke: '#fff', 'stroke-width': 1.5 }),
  alarme: (x, y) => ci(x, y, 7, { fill: VERM }) + T(x, y + 3, 'A', { fs: 7.5, fw: 700, fill: '#fff', anchor: 'middle' }),
  rota: (x, y) => pa(`M${x - 16} ${y}H${x + 12}`, { fill: 'none', stroke: VERDE, 'stroke-width': 1.8, 'stroke-dasharray': '6 3' }) + pg([[x + 16, y], [x + 9, y - 4], [x + 9, y + 4]], { fill: VERDE }),
};
/** eletroduto curvo entre dois pontos (px) */
function duto(p1, p2, k = 0.18, piso = false) {
  const mx = (p1[0] + p2[0]) / 2;
  const my = (p1[1] + p2[1]) / 2;
  const dx = p2[0] - p1[0];
  const dy = p2[1] - p1[1];
  const c = [mx - dy * k, my + dx * k];
  return pa(`M${N(p1[0])} ${N(p1[1])}Q${N(c[0])} ${N(c[1])} ${N(p2[0])} ${N(p2[1])}`, {
    fill: 'none',
    stroke: NV3,
    'stroke-width': 1.1,
    'stroke-dasharray': piso ? '5 3' : null,
  });
}

SVGS['eletrico-planta'] = () => {
  const P = plantaTools(56, 130, 150);
  defTerrea(P, false);
  const X = P.X;
  const Y = P.Y;
  const q = (x, y) => [X(x), Y(y)];
  const luzes = {
    d1: q(1.65, 1.5),
    bn: q(4.2, 1.3),
    d2: q(6.75, 1.5),
    as: q(9.2, 1.4),
    sl: q(2.8, 5.9),
    cz: q(7.8, 5.9),
    vr: q(6.5, 9.2),
  };
  const qd = q(5.6, 7.3);
  let d = '';
  // circuito de iluminação (teto)
  d += duto(qd, luzes.sl, 0.12) + duto(luzes.sl, luzes.d1, 0.15) + duto(luzes.d1, luzes.bn, -0.2) + duto(luzes.bn, luzes.d2, -0.2) + duto(luzes.d2, luzes.as, -0.2);
  d += duto(qd, luzes.cz, -0.15) + duto(luzes.cz, luzes.vr, 0.2);
  // interruptores
  const inter = [
    [q(2.1, 3.3), luzes.d1, 'a'],
    [q(4.55, 3.3), luzes.bn, 'b'],
    [q(6.35, 3.3), luzes.d2, 'c'],
    [q(8.65, 3.3), luzes.as, 'd'],
    [q(0.25, 3.75), luzes.sl, 'e'],
    [q(7.35, 8.3), luzes.cz, 'f'],
    [q(7.1, 8.72), luzes.vr, 'g'],
  ];
  for (const [p, l] of inter) d += duto(p, l, 0.1);
  // tomadas (piso/parede)
  const tom = [
    [q(0.12, 1.0), 'r', 'b', '2'],
    [q(3.18, 0.9), 'l', 'b', '2'],
    [q(1.2, 0.12), 'd', 'b', '2'],
    [q(5.22, 1.0), 'r', 'b', '2'],
    [q(8.28, 1.2), 'l', 'b', '2'],
    [q(7.5, 0.12), 'd', 'b', '2'],
    [q(9.88, 0.9), 'l', 'm', '4'],
    [q(4.98, 1.9), 'l', 'm', '3'],
    [q(0.12, 4.4), 'r', 'b', '2'],
    [q(0.12, 7.6), 'r', 'b', '2'],
    [q(1.2, 3.62), 'd', 'm', '2'],
    [q(2.0, 8.38), 'u', 'b', '2'],
    [q(9.88, 4.35), 'l', 'm', '4'],
    [q(9.88, 5.2), 'l', 'm', '4'],
    [q(9.88, 6.9), 'l', 'm', '4'],
    [q(5.72, 4.4), 'r', 'b', '4'],
  ];
  const cadeia = [[0, 2, 1], [3, 5, 4], [8, 9, 11], [12, 13, 14]];
  for (const c of cadeia) for (let i = 0; i < c.length - 1; i++) d += duto(tom[c[i]][0], tom[c[i + 1]][0], 0.12, true);
  d += duto(qd, tom[10][0], 0.2, true) + duto(qd, tom[8][0], -0.15, true) + duto(qd, tom[15][0], 0.18, true) + duto(tom[15][0], tom[12][0], -0.1, true) + duto(tom[10][0], tom[1][0], 0.1, true);
  d += duto(tom[1][0], tom[3][0], -0.15, true) + duto(tom[4][0], tom[6][0], -0.2, true) + duto(tom[3][0], tom[7][0], 0.2, true);
  const ch = q(4.2, 0.45);
  d += duto(luzes.bn, ch, 0.25);
  let sim = '';
  const circ = { d1: '1', bn: '1', d2: '1', as: '1', sl: '1', cz: '1', vr: '1' };
  const cmd = { d1: 'a', bn: 'b', d2: 'c', as: 'd', sl: 'e', cz: 'f', vr: 'g' };
  for (const k in luzes) sim += SIM.luz(...luzes[k], circ[k], cmd[k]);
  for (const [p, , k] of inter) sim += SIM.inter(...p, k);
  for (const [p, dir, t, c] of tom) sim += SIM.tomada(...p, dir, t, c);
  sim += SIM.tue(...ch, 'CH') + T(ch[0] + 12, ch[1] + 3, '5', { fs: 7.5, fill: NAVY });
  sim += SIM.qdc(...qd) + T(qd[0] + 20, qd[1] + 4, 'QDC', { fs: 9, fw: 700, fill: NAVY });
  // marcas de fiação
  let fi = '';
  for (const [a, b] of [[qd, luzes.sl], [luzes.sl, luzes.d1], [qd, luzes.cz]]) {
    const mx = (a[0] + b[0]) / 2;
    const my = (a[1] + b[1]) / 2;
    for (let i = -1; i <= 1; i++) fi += `M${N(mx + i * 4 - 3)} ${N(my + 4)}L${N(mx + i * 4 + 3)} ${N(my - 4)}`;
  }
  sim += pa(fi, { stroke: NAVY, 'stroke-width': 1, fill: 'none' });
  const leg = caixaLegenda(
    790,
    150,
    370,
    'LEGENDA',
    [
      [(x, y) => SIM.luz(x, y, '1', 'a'), 'Ponto de luz no teto (circuito / comando)'],
      [(x, y) => SIM.inter(x, y), 'Interruptor simples (h = 1,10 m)'],
      [(x, y) => SIM.tomada(x, y + 4, 'u', 'b'), 'Tomada baixa (h = 0,30 m)'],
      [(x, y) => SIM.tomada(x, y + 4, 'u', 'm'), 'Tomada média (h = 1,10 m)'],
      [(x, y) => SIM.tue(x, y), 'Chuveiro elétrico (TUE)'],
      [(x, y) => SIM.qdc(x, y), 'Quadro de distribuição (QDC)'],
      [(x, y) => SIM.duto(x, y), 'Eletroduto embutido no teto / parede'],
      [(x, y) => SIM.dutoPiso(x, y), 'Eletroduto embutido no piso'],
    ],
  );
  const cargas = quadro(790, 380, 'QUADRO DE CARGAS — QDC', ['CIRC.', 'DESCRIÇÃO', 'POT. (W)', 'DISJ.'], [
    ['1', 'Iluminação', '620', '10 A'],
    ['2', 'TUG — quartos e sala', '1.800', '20 A'],
    ['3', 'TUG — banho', '600', '20 A'],
    ['4', 'TUG — cozinha / serviço', '2.400', '20 A'],
    ['5', 'Chuveiro (TUE)', '5.500', '32 A'],
    ['—', 'DR geral 40 A / 30 mA', '—', '—'],
  ], [48, 170, 82, 70]);
  const body =
    renderPlanta(P, { parede: 'pwl', mobilia: false, areas: false, fsMul: 0.82, corNome: '#6C7380' }) +
    d +
    sim +
    leg +
    cargas +
    norte(TH_PAPEL, 745, 700) +
    legenda(TH_PAPEL, 60, 822, 'PLANTA DE INSTALAÇÕES ELÉTRICAS', 'ESC. 1:75') +
    prancha(TH_PAPEL, 1200, 900, 'PROJETO ELÉTRICO — PLANTA BAIXA', { folha: '01/03', escala: 'ESC. 1:75' });
  return svgDoc({ th: TH_PAPEL, css: CSS_PL_CLARO, body });
};

SVGS['incendio-planta'] = () => {
  const P = plantaTools(45, 110, 175);
  defClinica(P, false);
  const q = (x, y) => [P.X(x), P.Y(y)];
  let s = '';
  // rotas de fuga
  const rota = (pts) => {
    const pp = pts.map(([x, y]) => q(x, y));
    const [a, b] = [pp[pp.length - 2], pp[pp.length - 1]];
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const tip = [b[0], b[1]];
    const h = [
      tip,
      [tip[0] - 9 * Math.cos(ang) + 4.5 * Math.sin(ang), tip[1] - 9 * Math.sin(ang) - 4.5 * Math.cos(ang)],
      [tip[0] - 9 * Math.cos(ang) - 4.5 * Math.sin(ang), tip[1] - 9 * Math.sin(ang) + 4.5 * Math.cos(ang)],
    ];
    return pl(pp, { stroke: VERDE, 'stroke-width': 2, 'stroke-dasharray': '7 4', 'stroke-linejoin': 'round' }) + pg(h, { fill: VERDE });
  };
  for (const [x, dx] of [[2.0, 1.25], [6.0, 1.25], [10.0, -1.25], [14.0, -1.25]]) s += rota([[x, 2.4], [x + dx, 3.6], [x + dx, 4.75], [x + dx < 8 ? 7.9 : 8.35, 4.75], [x + dx < 8 ? 7.9 : 8.35, 10.3]]);
  s += rota([[2.0, 7.5], [2.0, 6.0], [1.5, 5.2], [3.8, 4.75], [7.75, 4.75], [7.75, 10.3]]);
  s += rota([[13.0, 9.6], [11.2, 9.4], [9.2, 10.3]]);
  // símbolos
  const ext = [[3.6, 4.35, 'PQS 4 kg'], [12.4, 4.35, 'CO₂ 6 kg'], [4.35, 10.4, 'PQS 4 kg'], [11.6, 6.0, 'AP 10 L']];
  for (const [x, y, t] of ext) s += SIM.ext(...q(x, y)) + T(P.X(x) + 13, P.Y(y) + 4, t, { fs: 8, fill: VERM, fw: 600 });
  s += SIM.hid(...q(15.55, 4.75)) + T(P.X(15.55) - 14, P.Y(4.75) - 14, 'HIDRANTE', { fs: 7.5, fill: VERM, fw: 600, anchor: 'middle' });
  s += SIM.alarme(...q(0.45, 4.75));
  for (const [x, y] of [[2, 4.75], [6, 4.75], [10, 4.75], [14, 4.75], [6.5, 7.0], [9.8, 7.8], [2.0, 6.2], [13.2, 8.8]]) s += SIM.lum(...q(x, y));
  s += SIM.saida(...q(8.0, 10.55)) + SIM.saida(P.X(8.0), P.Y(4.4), 1);
  s += T(P.X(8.0), P.Y(11) + 26, 'SAÍDA', { fs: 11, fw: 700, fill: VERDE, anchor: 'middle', ls: 2 });
  const leg = caixaLegenda(880, 175, 285, 'LEGENDA', [
    [(x, y) => SIM.ext(x, y), 'Extintor portátil (tipo / capacidade)'],
    [(x, y) => SIM.hid(x, y), 'Hidrante / abrigo de mangueira'],
    [(x, y) => SIM.alarme(x, y), 'Acionador manual de alarme'],
    [(x, y) => SIM.lum(x, y), 'Iluminação de emergência'],
    [(x, y) => SIM.saida(x, y), 'Sinalização de saída'],
    [(x, y) => SIM.rota(x, y), 'Rota de fuga'],
  ], 26);
  const nt = notas(880, 380, 285, 'NOTAS', ['Ocupação: H-6 — serviços de saúde', 'Área construída: 176,00 m²', 'Extintores a no máx. 20 m de caminhamento', 'Iluminação de emergência: autonomia 1 h', 'Sinalização fotoluminescente']);
  const body =
    renderPlanta(P, { parede: 'pwl', mobilia: false, areas: false, fsMul: 0.8, corNome: '#6C7380' }) +
    s +
    leg +
    nt +
    norte(TH_PAPEL, 1110, 600) +
    legenda(TH_PAPEL, 60, 822, 'PLANTA DE PREVENÇÃO E COMBATE A INCÊNDIO', 'ESC. 1:100') +
    prancha(TH_PAPEL, 1200, 900, 'PPCI — PLANTA BAIXA TÉRREO', { folha: '01/02' });
  return svgDoc({ th: TH_PAPEL, css: CSS_PL_CLARO, body });
};

/* ------------------------------------------------------------------ */
/* Hidráulico — isométrico de área molhada                             */
/* ------------------------------------------------------------------ */
SVGS['hidraulico-isometrico'] = () => {
  const th = TH_PAPEL;
  const P = isoFitAuto(
    [
      [-0.2, -0.2, 3.0],
      [4.8, -0.2, 3.0],
      [-0.2, 3.6, 3.0],
      [4.8, 3.6, -0.6],
      [-0.2, 3.6, -0.6],
      [4.8, -0.2, -0.6],
    ],
    [70, 70, 900, 780],
    140,
  );
  const cAF = NAVY;
  const cAQ = VERM;
  const cES = GRAF;
  const tubo = (pts, cor, w) =>
    pa(D(pts.map((p) => P(...p))), { fill: 'none', stroke: cor, 'stroke-width': w, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' });
  const no = (p, cor) => ci(...P(...p), 2.8, { fill: cor });
  // registro (gravata) ao longo do eixo do tubo
  const registro = (p, eixo, cor, pressao = false) => {
    const a = P(...p);
    const e = eixo === 'x' ? [1, 0, 0] : eixo === 'y' ? [0, 1, 0] : [0, 0, 1];
    const b = P(p[0] + e[0], p[1] + e[1], p[2] + e[2]);
    let u = [b[0] - a[0], b[1] - a[1]];
    const L = Math.hypot(...u);
    u = [u[0] / L, u[1] / L];
    const v = [-u[1], u[0]];
    const k = 7;
    const w = 6;
    let s = pg([a, [a[0] + u[0] * k + v[0] * w, a[1] + u[1] * k + v[1] * w], [a[0] + u[0] * k - v[0] * w, a[1] + u[1] * k - v[1] * w]], { fill: '#fff', stroke: cor, 'stroke-width': 1.2 });
    s += pg([a, [a[0] - u[0] * k + v[0] * w, a[1] - u[1] * k + v[1] * w], [a[0] - u[0] * k - v[0] * w, a[1] - u[1] * k - v[1] * w]], { fill: '#fff', stroke: cor, 'stroke-width': 1.2 });
    if (pressao) s += ln(a[0], a[1], a[0] + v[0] * 11, a[1] + v[1] * 11, { stroke: cor, 'stroke-width': 1.2 }) + ci(a[0] + v[0] * 13, a[1] + v[1] * 13, 2.5, { fill: cor });
    return s;
  };
  const rot = (p, txt, dx = 8, dy = -6, cor = NAVY, o = {}) => {
    const [x, y] = P(...p);
    return T(x + dx, y + dy, txt, { fs: o.fs || 9.5, fill: cor, fw: o.fw || 600, anchor: o.anchor, halo: PAPEL });
  };
  // contexto: paredes e laje
  const f = (q) => q.map((p) => P(...p));
  let ctx = '';
  ctx += pg(f([[0, 0, 0], [4.6, 0, 0], [4.6, 0, 2.9], [0, 0, 2.9]]), { fill: '#ECEBE7', stroke: '#C4C8CF', 'stroke-width': 0.8 });
  ctx += pg(f([[0, 0, 0], [0, 3.4, 0], [0, 3.4, 2.9], [0, 0, 2.9]]), { fill: '#E6E5E1', stroke: '#C4C8CF', 'stroke-width': 0.8 });
  ctx += pg(f([[0, 0, 0], [4.6, 0, 0], [4.6, 3.4, 0], [0, 3.4, 0]]), { fill: '#F9F8F6', 'fill-opacity': 0.7, stroke: '#C4C8CF', 'stroke-width': 0.8 });
  ctx += pa(D(f([[4.6, 0, -0.12], [4.6, 3.4, -0.12], [0, 3.4, -0.12]])), { fill: 'none', stroke: '#C4C8CF', 'stroke-width': 0.8, 'stroke-dasharray': '4 3' });
  // aparelhos (esboço)
  const box = (b, cls = '#fff') => {
    const [x0, x1, y0, y1, z0, z1] = b;
    return pg(f([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]]), { fill: cls, stroke: '#9AA1AD', 'stroke-width': 0.8 }) +
      pg(f([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]]), { fill: cls, stroke: '#9AA1AD', 'stroke-width': 0.8 }) +
      pg(f([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]), { fill: cls, stroke: '#9AA1AD', 'stroke-width': 0.8 });
  };
  ctx += box([0, 0.32, 0.75, 1.15, 1.55, 2.3], '#F4F4F2');
  ctx += box([1.85, 2.35, 0, 0.45, 0.72, 0.85]);
  ctx += box([2.9, 3.3, 0, 0.7, 0, 0.42]);
  ctx += box([0, 0.6, 1.5, 2.5, 0.85, 0.9]);
  ctx += pg(f([[0.5, 0.2, 0.001], [1.4, 0.2, 0.001], [1.4, 1.2, 0.001], [0.5, 1.2, 0.001]]), { fill: 'none', stroke: '#9AA1AD', 'stroke-width': 0.8, 'stroke-dasharray': '4 3' });
  // esgoto (sob a laje)
  const zE = -0.3;
  let es = '';
  es += tubo([[0.95, 0.75, 0], [0.95, 0.75, -0.2], [1.75, 0.75, -0.2]], cES, 3);
  es += tubo([[2.1, 0.25, 0.72], [2.1, 0.25, -0.2], [2.1, 0.75, -0.2], [1.75, 0.75, -0.2]], cES, 3);
  es += tubo([[1.75, 0.75, -0.2], [1.75, 1.7, -0.25], [3.1, 1.7, -0.28]], cES, 3.4);
  es += tubo([[3.1, 0.45, 0], [3.1, 0.45, zE], [3.1, 3.2, -0.36]], cES, 4.6);
  es += tubo([[0.3, 2.0, 0.85], [0.3, 2.0, -0.2], [0.3, 2.9, -0.25], [0.3, 3.2, -0.3], [2.9, 3.2, -0.35]], cES, 3.4);
  es += pg(f([[1.6, 0.6, -0.2], [1.9, 0.6, -0.2], [1.9, 0.9, -0.2], [1.6, 0.9, -0.2]]), { fill: '#fff', stroke: cES, 'stroke-width': 1.2 });
  es += box([2.95, 3.35, 3.1, 3.5, -0.6, -0.3], '#fff');
  es += ci(...P(0.95, 0.75, 0), 5, { fill: '#fff', stroke: cES, 'stroke-width': 1.3 });
  // água fria
  const zF = 2.2;
  let af = '';
  af += tubo([[0.12, 0.12, 3.0], [0.12, 0.12, zF], [3.1, 0.12, zF]], cAF, 2.8);
  af += tubo([[0.12, 0.12, zF], [0.12, 2.0, zF]], cAF, 2.8);
  af += tubo([[0.9, 0.12, zF], [0.9, 0.12, 1.1]], cAF, 2.4);
  af += tubo([[2.0, 0.12, zF], [2.0, 0.12, 0.6], [2.0, 0.3, 0.6]], cAF, 2.4);
  af += tubo([[3.1, 0.12, zF], [3.1, 0.12, 0.3], [3.1, 0.3, 0.3]], cAF, 2.4);
  af += tubo([[0.12, 2.0, zF], [0.12, 2.0, 1.1], [0.3, 2.0, 1.1]], cAF, 2.4);
  af += tubo([[0.12, 0.95, zF], [0.12, 0.95, 2.3]], cAF, 2.2);
  // água quente
  const zQ = 2.5;
  let aq = '';
  aq += tubo([[0.2, 0.95, 2.3], [0.2, 0.95, zQ], [0.2, 0.26, zQ], [2.14, 0.26, zQ]], cAQ, 2.6);
  aq += tubo([[0.2, 0.95, zQ], [0.2, 2.14, zQ], [0.2, 2.14, 1.1], [0.3, 2.14, 1.1]], cAQ, 2.4);
  aq += tubo([[1.04, 0.26, zQ], [1.04, 0.26, 1.1]], cAQ, 2.4);
  aq += tubo([[2.14, 0.26, zQ], [2.14, 0.26, 0.6], [2.14, 0.34, 0.6]], cAQ, 2.4);
  // misturador do chuveiro e chuveiro
  aq += tubo([[0.97, 0.12, 1.1], [0.97, 0.12, 2.05], [0.97, 0.45, 2.05]], '#6B7078', 2.2);
  const [chx, chy] = P(0.97, 0.45, 2.05);
  aq += el(chx, chy + 4, 9, 4, { fill: '#fff', stroke: '#6B7078', 'stroke-width': 1.3 });
  let nos = [
    [[0.12, 0.12, zF], cAF],
    [[0.9, 0.12, zF], cAF],
    [[2.0, 0.12, zF], cAF],
    [[0.12, 0.95, zF], cAF],
    [[0.2, 0.95, zQ], cAQ],
    [[1.04, 0.26, zQ], cAQ],
    [[1.75, 0.75, -0.2], cES],
    [[3.1, 1.7, -0.28], cES],
  ]
    .map(([p, c]) => no(p, c))
    .join('');
  let vv = '';
  vv += registro([0.5, 0.12, zF], 'x', cAF) + registro([0.12, 0.5, zF], 'y', cAF);
  vv += registro([0.9, 0.12, 1.1], 'z', cAF, true) + registro([1.04, 0.26, 1.1], 'z', cAQ, true);
  vv += registro([0.55, 0.26, zQ], 'x', cAQ);
  let lb = '';
  lb += rot([0.12, 0.12, 3.0], 'AF — COLUNA Ø 32', 8, -2);
  lb += rot([2.6, 0.12, zF], 'AF Ø 25', 0, 16, cAF, { anchor: 'middle' });
  lb += rot([1.6, 0.26, zQ], 'AQ Ø 22', 0, -10, cAQ, { anchor: 'middle' });
  lb += rot([0.12, 1.4, zF], 'Ø 25', -10, -6, cAF, { anchor: 'end' });
  lb += rot([0.9, 0.12, 1.1], 'RP', -16, 4, cAF, { anchor: 'end' });
  lb += rot([0.97, 0.45, 2.05], 'CH', 14, 8, NAVY, { fw: 700 });
  lb += rot([2.0, 0.3, 0.6], 'LV · Ø 20', 12, 10, NAVY);
  lb += rot([3.1, 0.3, 0.3], 'VS · Ø 20', 12, 10, NAVY);
  lb += rot([0.3, 2.0, 1.1], 'PIA · Ø 20', 12, 12, NAVY);
  lb += rot([0.32, 0.95, 1.6], 'AQUECEDOR', 10, 14, GRAF, { fs: 8.5 });
  lb += rot([0.5, 0.12, zF], 'RG', 4, 18, cAF, { anchor: 'middle', fs: 8.5 });
  lb += rot([0.95, 0.75, 0], 'RS', -10, 14, cES, { anchor: 'end' });
  lb += rot([1.75, 0.75, -0.2], 'CS', 10, 14, cES);
  lb += rot([2.1, 0.5, -0.2], 'Ø 40', 8, 16, cES, { fs: 8.5 });
  lb += rot([2.4, 1.7, -0.27], 'Ø 50', 0, 16, cES, { anchor: 'middle', fs: 8.5 });
  lb += rot([3.1, 2.3, -0.33], 'Ø 100', 10, 14, cES);
  lb += rot([1.6, 3.2, -0.3], 'Ø 50', 0, 16, cES, { anchor: 'middle', fs: 8.5 });
  lb += rot([3.15, 3.3, -0.6], 'CI — PARA REDE', 16, 18, cES);
  lb += rot([0.3, 3.2, -0.3], 'CG', -12, 14, cES, { anchor: 'end' });
  const nv = [
    [[4.6, 0, zQ], '+2,50'],
    [[4.6, 0, zF], '+2,20'],
    [[4.6, 0, 1.1], '+1,10'],
    [[4.6, 0, 0.6], '+0,60'],
  ]
    .map(([p, t]) => {
      const [x, y] = P(...p);
      return ln(x, y, x + 40, y, { stroke: GRAF, 'stroke-width': 0.6, 'stroke-dasharray': '3 2' }) + T(x + 44, y + 3.5, t, { fs: 9, fill: GRAF });
    })
    .join('');
  const leg = caixaLegenda(930, 120, 240, 'LEGENDA', [
    [(x, y) => ln(x - 16, y, x + 16, y, { stroke: cAF, 'stroke-width': 2.8 }), 'AF — água fria (PVC)'],
    [(x, y) => ln(x - 16, y, x + 16, y, { stroke: cAQ, 'stroke-width': 2.6 }), 'AQ — água quente (PPR)'],
    [(x, y) => ln(x - 16, y, x + 16, y, { stroke: cES, 'stroke-width': 3.6 }), 'ESG — esgoto (PVC)'],
    [(x, y) => pg([[x, y], [x - 7, y - 6], [x - 7, y + 6]], { fill: '#fff', stroke: NAVY, 'stroke-width': 1.2 }) + pg([[x, y], [x + 7, y - 6], [x + 7, y + 6]], { fill: '#fff', stroke: NAVY, 'stroke-width': 1.2 }), 'RG — registro de gaveta'],
    [(x, y) => pg([[x, y], [x - 7, y - 6], [x - 7, y + 6]], { fill: '#fff', stroke: NAVY, 'stroke-width': 1.2 }) + pg([[x, y], [x + 7, y - 6], [x + 7, y + 6]], { fill: '#fff', stroke: NAVY, 'stroke-width': 1.2 }) + ln(x, y, x, y - 10, { stroke: NAVY, 'stroke-width': 1.2 }) + ci(x, y - 12, 2.5, { fill: NAVY }), 'RP — registro de pressão'],
    [(x, y) => ci(x, y, 5, { fill: '#fff', stroke: cES, 'stroke-width': 1.3 }), 'RS — ralo sifonado'],
  ]);
  const nt = notas(930, 330, 240, 'NOTAS', ['Diâmetros em milímetros', 'Cotas de altura a partir do piso', 'Esgoto com caimento mínimo de 1%', 'CS — caixa sifonada 150 mm', 'CG — caixa de gordura', 'CI — caixa de inspeção']);
  const body =
    ctx + es + af + aq + nos + vv + lb + nv + leg + nt +
    legenda(th, 60, 822, 'ISOMÉTRICO — ÁREA MOLHADA', 'SEM ESCALA') +
    prancha(th, 1200, 900, 'HIDROSSANITÁRIO — ISOMÉTRICO', { escala: 'SEM ESCALA', folha: '02/04' });
  return svgDoc({ th, css: '', body });
};

/* ------------------------------------------------------------------ */
/* Detalhe executivo                                                   */
/* ------------------------------------------------------------------ */
SVGS['detalhe-executivo'] = () => {
  const th = TH_PAPEL;
  const out = [];
  const lead = (x1, y1, x2, y2, t, o = {}) => chamada(th, x1, y1, x2, y2, t, { fs: 9, fw: 400, col: GRAF, ...o });
  const poly = (pts, a) => pg(pts, a);
  // ---- DETALHE 01: platibanda e laje de cobertura (1:20) ----
  {
    const k = 2.15;
    const ox = 385;
    const oy = 330;
    const Q = (x, y) => [ox + x * k, oy - y * k];
    const R = (x0, y0, x1, y1, a) => poly([Q(x0, y0), Q(x1, y0), Q(x1, y1), Q(x0, y1)], a);
    const concreto = { fill: '#E4E3DF', stroke: NAVY, 'stroke-width': 1.1 };
    const hach = { fill: 'url(#conc)' };
    // parede inferior + reboco
    out.push(R(-14, -110, 0, -40, { fill: 'url(#alvF)', stroke: NAVY, 'stroke-width': 1 }));
    out.push(R(-16.5, -110, -14, -40, { fill: '#F7F6F3', stroke: GRAF, 'stroke-width': 0.6 }));
    out.push(R(0, -110, 2.5, 110, { fill: '#F7F6F3', stroke: GRAF, 'stroke-width': 0.6 }));
    // viga + laje
    const vl = [Q(-130, 0), Q(0, 0), Q(0, -40), Q(-15, -40), Q(-15, -12), Q(-130, -12)];
    out.push(poly(vl, concreto), poly(vl, hach));
    out.push(R(-130, -13.5, -15, -12, { fill: '#F7F6F3', stroke: GRAF, 'stroke-width': 0.5 }));
    // camadas de impermeabilização
    out.push(poly([Q(-130, 0), Q(-14, 0), Q(-14, 3.2), Q(-130, 1.9)], { fill: 'url(#arg)', stroke: GRAF, 'stroke-width': 0.5 }));
    out.push(pa(D([Q(-130, 2.2), Q(-14.6, 3.5), Q(-14.6, 33)]), { fill: 'none', stroke: '#1B1E24', 'stroke-width': 2.2 }));
    out.push(poly([Q(-130, 2.5), Q(-15.2, 3.8), Q(-15.2, 7.8), Q(-130, 6.5)], { fill: 'url(#arg)', stroke: GRAF, 'stroke-width': 0.5 }));
    // platibanda
    out.push(R(-14, 0, 0, 100, { fill: 'url(#alvF)', stroke: NAVY, 'stroke-width': 1 }));
    out.push(R(-16.5, 33, -14, 100, { fill: '#F7F6F3', stroke: GRAF, 'stroke-width': 0.6 }));
    const cinta = [Q(-16.5, 100), Q(2.5, 100), Q(2.5, 110), Q(-16.5, 110)];
    out.push(poly(cinta, concreto), poly(cinta, hach));
    out.push(pa(D([Q(-20, 104), Q(-20, 112), Q(6, 112), Q(6, 104)]) + D([Q(-20, 104), Q(-21.5, 102.5)]) + D([Q(6, 104), Q(7.5, 102.5)]), { fill: 'none', stroke: '#1B1E24', 'stroke-width': 1.5 }));
    // armaduras
    let arm = '';
    for (const [x, y] of [[-12, -3.5], [-3, -3.5], [-12, -36.5], [-7.5, -36.5], [-3, -36.5]]) arm += ci(...Q(x, y), 2.1, { fill: NAVY });
    out.push(arm);
    out.push(pa(D([Q(-12.5, -2.5), Q(-2.5, -2.5), Q(-2.5, -37.5), Q(-12.5, -37.5)], 1), { fill: 'none', stroke: NAVY, 'stroke-width': 0.9 }));
    let ls = D([Q(-126, -9.3), Q(-3, -9.3)]) + D([Q(-60, -3), Q(-3, -3), Q(-3, -20)]);
    out.push(pa(ls, { fill: 'none', stroke: NAVY, 'stroke-width': 1.1 }));
    let dots = '';
    for (let x = -122; x < -18; x += 12) dots += ci(...Q(x, -8.3), 1.4, { fill: NAVY });
    out.push(dots);
    // linha de interrupção
    out.push(pa(D([Q(-130, 12), Q(-130, 2), Q(-127, -1), Q(-133, -5), Q(-130, -8), Q(-130, -18)]), { fill: 'none', stroke: GRAF, 'stroke-width': 0.8 }));
    out.push(pa(D([Q(-22, -110), Q(-9, -110), Q(-6, -106), Q(-3, -114), Q(0, -110), Q(8, -110)]), { fill: 'none', stroke: GRAF, 'stroke-width': 0.8 }));
    // chamadas
    const cx = ox + 40;
    const it = [
      [Q(-7, 111.5), 'Rufo metálico com pingadeira', 140],
      [Q(-7, 105), 'Cinta de amarração (concreto)', 175],
      [Q(-7, 60), 'Platibanda — bloco cerâmico 14 cm', 215],
      [Q(-14.6, 25), 'Manta asfáltica 4 mm (subida 30 cm)', 255],
      [Q(-40, 6), 'Proteção mecânica 3 cm', 295],
      [Q(-60, 1.2), 'Regularização com caimento 1%', 335],
      [Q(-80, -6), 'Laje maciça h = 12 cm', 375],
      [Q(-8, -25), 'Viga V12 (15x40)', 415],
      [Q(-7, -80), 'Alvenaria de vedação 14 cm', 455],
    ];
    for (const [p, t, y] of it) out.push(lead(p[0], p[1], cx + 30, y - 100 + 30, t));
    // cotas
    out.push(cotaV(th, [Q(0, 0)[1], Q(0, 100)[1]], Q(0, 0)[0] + 30, { labels: ['100'], s: k }));
    out.push(cotaV(th, [Q(0, -40)[1], Q(0, 0)[1]], Q(0, 0)[0] + 30, { labels: ['40'], s: k }));
    out.push(cotaH(th, [Q(-14, 0)[0], Q(0, 0)[0]], Q(0, -110)[1] + 22, { labels: ['14'], s: k }));
    out.push(legenda(th, 70, 628, 'DETALHE 01 — PLATIBANDA E COBERTURA', 'ESC. 1:20'));
  }
  // ---- DETALHE 02: corte da escada (1:25) ----
  {
    const k = 1.22;
    const ox = 720;
    const oy = 420;
    const Q = (x, y) => [ox + x * k, oy - y * k];
    const e = 17.5;
    const pi = 28;
    const n = 9;
    const th2 = Math.atan(e / pi);
    const hw = 12 / Math.cos(th2);
    const L = (n - 1) * pi;
    const Hl = n * e;
    // solo e laje de piso
    out.push(poly([Q(-40, -10), Q(360, -10), Q(360, -34), Q(-40, -34)], { fill: 'url(#terra)', opacity: 0.45 }));
    const pis = [Q(-40, 0), Q(0, 0), Q(0, -10), Q(-40, -10)];
    out.push(poly(pis, { fill: '#E4E3DF', stroke: NAVY, 'stroke-width': 1 }), poly(pis, { fill: 'url(#conc)' }));
    // lance + patamar + viga
    const pts2 = [Q(0, 0)];
    for (let i = 0; i < n; i++) {
      pts2.push(Q(i * pi, (i + 1) * e));
      if (i < n - 1) pts2.push(Q((i + 1) * pi, (i + 1) * e));
    }
    const xs0 = hw / Math.tan(th2);
    const xl = (Hl - 12 + hw) / Math.tan(th2);
    pts2.push(Q(L + 110, Hl), Q(L + 110, Hl - 40), Q(L + 95, Hl - 40), Q(L + 95, Hl - 12), Q(xl, Hl - 12), Q(xs0, 0));
    out.push(poly(pts2, { fill: '#E4E3DF', stroke: NAVY, 'stroke-width': 1.1, 'stroke-linejoin': 'round' }), poly(pts2, { fill: 'url(#conc)' }));
    // armaduras
    const off = 3 / Math.cos(th2);
    const yb = (x) => x * Math.tan(th2) - hw + off;
    let ar = D([Q(xs0 + 5, yb(xs0 + 5)), Q(xl + 4, Hl - 9), Q(L + 106, Hl - 9), Q(L + 106, Hl - 30)]);
    ar += D([Q(L - 60, (L - 60) * Math.tan(th2) - 3), Q(L - 2, Hl - 3), Q(L + 106, Hl - 3)]);
    out.push(pa(ar, { fill: 'none', stroke: NAVY, 'stroke-width': 1.6, 'stroke-linejoin': 'round' }));
    let dd = '';
    for (let x = xs0 + 20; x < xl; x += 24) dd += ci(...Q(x, yb(x) + 1.3), 1.5, { fill: NAVY });
    out.push(dd);
    // cotas dos degraus
    out.push(cotaV(th, [Q(0, e)[1], Q(0, 2 * e)[1]], Q(pi, 0)[0] - 12, { labels: ['17,5'], fs: 9, s: k }));
    out.push(cotaH(th, [Q(pi, 2 * e)[0], Q(2 * pi, 2 * e)[0]], Q(0, 2 * e)[1] - 34, { labels: ['28'], fs: 9, s: k }));
    out.push(cotaH(th, [Q(0, 0)[0], Q(L, 0)[0], Q(L + 110, 0)[0]], Q(0, -34)[1] + 20, { labels: ['8 x 28 = 224', '110'], fs: 9, s: k }));
    out.push(nivel(th, Q(-40, 0)[0], Q(0, 0)[1], '+0,00', { len: 44, fs: 9.5 }));
    out.push(nivel(th, Q(L + 110, Hl)[0] - 50, Q(0, Hl)[1], '+1,58', { len: 48, fs: 9.5 }));
    out.push(lead(...Q(110, 64), ...Q(40, 150), 'N1 — Ø 10,0 c/ 12', { anchor: 'end', sub: 'armadura principal' }));
    out.push(lead(...Q(L - 20, Hl - 5), ...Q(L - 30, Hl + 55), 'N2 — Ø 8,0 c/ 15 (negativo)', { anchor: 'end' }));
    out.push(lead(...Q(150, 80), ...Q(215, 30), 'Laje da escada h = 12 cm'));
    out.push(lead(...Q(L + 102, Hl - 28), ...Q(L + 60, Hl - 80), 'V15 (15x40)', { anchor: 'end' }));
    out.push(legenda(th, 660, 500, 'DETALHE 02 — CORTE DA ESCADA', 'ESC. 1:25'));
  }
  // ---- DETALHE 03: seção transversal da viga (1:10) ----
  {
    const k = 3.9;
    const ox = 720;
    const oy = 752;
    const Q = (x, y) => [ox + x * k, oy - y * k];
    const sec = [Q(0, 0), Q(15, 0), Q(15, 40), Q(0, 40)];
    out.push(poly(sec, { fill: '#E4E3DF', stroke: NAVY, 'stroke-width': 1.2 }), poly(sec, { fill: 'url(#conc)' }));
    out.push(rc(Q(2.5, 37.5)[0], Q(2.5, 37.5)[1], 10 * k, 35 * k, { fill: 'none', stroke: NAVY, 'stroke-width': 1.3, rx: 4 }));
    out.push(pa(D([Q(10.5, 37.5), Q(8, 34.5)]) + D([Q(12.5, 35.5), Q(9.5, 32.5)]), { fill: 'none', stroke: NAVY, 'stroke-width': 1.3 }));
    for (const x of [3.6, 7.5, 11.4]) out.push(ci(...Q(x, 3.6), 2.9, { fill: NAVY }));
    for (const x of [3.3, 11.7]) out.push(ci(...Q(x, 36.3), 2.1, { fill: NAVY }));
    out.push(lead(...Q(11.7, 36.3), ox + 90, oy - 150, '2 Ø 8,0 — N4'));
    out.push(lead(...Q(12.5, 20), ox + 90, oy - 98, 'Estribo Ø 5,0 c/ 15 — N6'));
    out.push(lead(...Q(11.4, 3.6), ox + 90, oy - 46, '3 Ø 12,5 — N5'));
    out.push(cotaH(th, [Q(0, 0)[0], Q(15, 0)[0]], oy + 18, { labels: ['15'], s: k, fs: 9 }));
    out.push(cotaV(th, [Q(0, 0)[1], Q(0, 40)[1]], ox - 18, { labels: ['40'], s: k, fs: 9 }));
    out.push(legenda(th, 660, 560, 'DETALHE 03 — SEÇÃO V12', 'ESC. 1:10'));
  }
  out.push(
    notas(935, 560, 235, 'NOTAS GERAIS', [
      'Concreto estrutural: fck = 30 MPa',
      'Aço CA-50 (Ø ≥ 6,3) e CA-60 (Ø 5,0)',
      'Cobrimento: vigas 3,0 cm · lajes 2,5 cm',
      'Medidas em centímetros, salvo indicação',
      'Impermeabilização conforme NBR 9575',
      'Conferir medidas no local antes da execução',
    ]),
  );
  out.push(legenda(th, 60, 822, 'PROJETO EXECUTIVO — DETALHES', 'INDICADAS'));
  out.push(prancha(th, 1200, 900, 'DETALHES CONSTRUTIVOS', { escala: 'ESC. INDICADAS', folha: '08/08' }));
  return svgDoc({ th, css: '', defs: ['conc', 'alvF', 'arg', 'terra'], body: out.join('') });
};

async function gerarPNGs() {
  const og = ogSVG();
  await sharp(Buffer.from(og)).flatten({ background: NAVY }).png({ compressionLevel: 9 }).toFile(join(PUB, 'og-image.png'));
  console.log('  og-image.png');
  const fav = readFileSync(join(PUB, 'favicon.svg'));
  for (const [nome, size, opaco] of [
    ['apple-touch-icon.png', 180, true],
    ['icon-192.png', 192, false],
    ['icon-512.png', 512, false],
  ]) {
    let img = sharp(fav).resize(size, size);
    if (opaco) img = img.flatten({ background: NAVY });
    await img.png({ compressionLevel: 9 }).toFile(join(PUB, nome));
    console.log(`  ${nome}`);
  }
}

// @@NEXT@@

/* ------------------------------------------------------------------ */
/* Execução                                                            */
/* ------------------------------------------------------------------ */
async function main() {
  mkdirSync(OUT, { recursive: true });
  const nomes = Object.keys(SVGS);
  const filtro = process.argv.slice(2);
  for (const nome of nomes) {
    if (filtro.length && !filtro.some((f) => nome.includes(f))) continue;
    const svg = SVGS[nome]();
    writeFileSync(join(OUT, `${nome}.svg`), svg);
    console.log(`  ilustracoes/${nome}.svg  ${(Buffer.byteLength(svg) / 1024).toFixed(1)} KB`);
  }
  if (!filtro.length || filtro.includes('png')) await gerarPNGs();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

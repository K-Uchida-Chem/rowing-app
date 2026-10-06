// 1日のまとめを PNG 画像にする(Slack などに上げる用)。
// 外部ライブラリは使わず、Canvas に直接描く。
import { formatDate } from './lib.js';

const W = 1080;
const PAD = 56;
const FONT = '-apple-system, BlinkMacSystemFont, "Hiragino Kaku Gothic ProN", "Noto Sans JP", sans-serif';
const C = { navy: '#1b365d', paper: '#f6f4ef', line: '#dcd8cf', ink: '#1c1c1c', mute: '#6f6b63', accent: '#c2410c' };

const font = (weight, size) => `${weight} ${size}px ${FONT}`;

// 日本語は単語区切りがないので、1文字ずつ幅を測って折り返す
function wrap(ctx, text, maxWidth) {
  const out = [];
  for (const para of String(text).split('\n')) {
    let line = '';
    for (const ch of para) {
      if (line && ctx.measureText(line + ch).width > maxWidth) {
        out.push(line);
        line = ch;
      } else {
        line += ch;
      }
    }
    out.push(line);
  }
  return out;
}

// dry=true のときは描かずに高さだけ返す
function layout(ctx, { date, stats, groups, note }, dry) {
  const inner = W - PAD * 2;
  let y = 0;
  const text = (str, x, size, weight, color, align = 'left') => {
    if (dry) return;
    ctx.font = font(weight, size);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(str, x, y);
  };
  const hr = (x1 = PAD, x2 = W - PAD, color = C.line, w = 2) => {
    if (dry) return;
    ctx.fillStyle = color;
    ctx.fillRect(x1, y, x2 - x1, w);
  };

  // ヘッダー
  if (!dry) {
    ctx.fillStyle = C.navy;
    ctx.fillRect(0, 0, W, 170);
  }
  y = 105;
  text(formatDate(date), PAD, 64, 700, C.paper);
  text('Rowing Log', W - PAD, 30, 500, '#9fb0c8', 'right');
  y = 170 + 56;

  // 数字
  if (stats.length) {
    const cell = inner / stats.length;
    stats.forEach((s, i) => {
      const x = PAD + cell * i;
      y = 226;
      text(s.label, x, 26, 500, C.mute);
      y = 290;
      if (!dry) {
        ctx.font = font(700, 62);
        const vw = ctx.measureText(s.value).width;
        text(s.value, x, 62, 700, C.ink);
        if (s.unit) {
          ctx.font = font(500, 28);
          text(s.unit, x + vw + 8, 28, 500, C.mute);
        }
      }
    });
    y = 290 + 30;
    hr();
    y += 20;
  }

  // 種類ごとの記録
  for (const g of groups) {
    y += 60;
    if (!dry) ctx.font = font(700, 30);
    text(g.label, PAD, 30, 700, C.navy);
    if (g.note) {
      if (!dry) ctx.font = font(700, 30);
      const lw = dry ? 0 : ctx.measureText(g.label).width;
      text(g.note, PAD + lw + 16, 26, 500, C.mute);
    }
    y += 16;
    hr(PAD, W - PAD, C.navy, 3);
    for (const r of g.rows) {
      y += 52;
      text(r.title, PAD, 38, 700, C.ink);
      if (r.detail) {
        ctx.font = font(500, 30);
        for (const l of wrap(ctx, r.detail, inner)) {
          y += 44;
          text(l, PAD, 30, 500, '#3d3d3a');
        }
      }
      for (const line of r.lines) {
        ctx.font = font(400, 27);
        for (const l of wrap(ctx, line, inner)) {
          y += 40;
          text(l, PAD, 27, 400, C.mute);
        }
      }
      y += 24;
      hr();
    }
  }

  // 1日のメモ
  if (note?.trim()) {
    y += 56;
    text('メモ', PAD, 28, 700, C.navy);
    y += 14;
    hr(PAD, W - PAD, C.navy, 3);
    ctx.font = font(400, 32);
    for (const l of wrap(ctx, note.trim(), inner)) {
      y += 52;
      text(l, PAD, 32, 400, C.ink);
    }
    y += 12;
  }

  y += 70;
  return y;
}

/** @returns {Promise<Blob>} */
export async function renderDayImage(data) {
  const probe = document.createElement('canvas').getContext('2d');
  const height = layout(probe, data, true);

  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = Math.max(height, 400);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, W, canvas.height);
  layout(ctx, data, false);

  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('画像を作れませんでした'))), 'image/png')
  );
}

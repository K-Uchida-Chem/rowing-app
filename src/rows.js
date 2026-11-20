// 履歴・今日の画面に出す「1行ぶんの表示」を種類ごとに作る
import {
  ERGO_ZONES, KINDS, STATUS_LABEL, FEELINGS, labelOf, exerciseLabel, intervalLabel, formatDate, boatShort, parseTime, formatTime, timeMenuLabel,
} from './lib.js';
import { minutesOf, readiness } from './stats.js';

const MEALS = { breakfast: '朝食', lunch: '昼食', dinner: '夕食', snack: '間食', total: '1日合計' };

const join = (parts, sep = ' · ') => parts.filter(Boolean).join(sep);

// 同じ重量・回数のセットは「×2セット」にまとめる
export function setsText(r) {
  const list = r.setList?.length
    ? r.setList
    : r.reps
      ? Array.from({ length: r.sets || 1 }, () => ({ weight: r.weight || 0, reps: r.reps }))
      : [];
  const groups = [];
  for (const s of list) {
    const last = groups[groups.length - 1];
    if (last && last.weight === s.weight && last.reps === s.reps) last.n++;
    else groups.push({ ...s, n: 1 });
  }
  return groups
    .map((g) => `${g.weight ? `${g.weight}kg` : '自重'} ${g.reps}回${g.n > 1 ? ` ×${g.n}セット` : ''}`)
    .join('、');
}

/** 距離メニュー・時間メニューの見出し(インターバルなら「4×2000m」「5×4分」) */
function menuTitle(e) {
  if (e.intervals?.length) return intervalLabel(e);
  const sec = parseTime(e.time);
  if (e.menuBy === 'time' && sec) return timeMenuLabel(sec);
  if (e.distance) return `${e.distance}m`;
  return sec ? timeMenuLabel(sec) : '';
}

/**
 * @returns {{title: string, detail: string, lines: string[], links: {url: string, label: string}[], badge: string}}
 *   badge: 「途中で中止」など、予定どおりにできなかったときの印
 */
export function rowOf(e) {
  const lines = [];
  // インターバルは1本ずつ1行。距離メニューなら時間、時間メニューなら距離を見せる(結果が未入力なら、メニュー側を見せる)
  if (e.intervals?.length) {
    e.intervals.forEach((p, i) => {
      const main = e.intervalBy === 'time' ? (p.distance ? `${p.distance}m` : p.time) : p.time || (p.distance ? `${p.distance}m` : '');
      lines.push(join([`${i + 1}本目`, main, p.split && `@${p.split}`, p.watts && `${p.watts}W`, p.rate && `${p.rate}spm`], '  '));
    });
  }
  if (e.planned) lines.push(`予定: ${e.planned}`);
  if (e.aim) lines.push(`ねらい: ${e.aim}`);
  if (e.rest) lines.push(`レスト: ${e.rest}`);
  if (e.event || e.result) lines.push(join([e.event && `大会: ${e.event}`, e.result && `結果: ${e.result}`]));
  if (e.technique) lines.push(`振り返り: ${e.technique}`);
  if (e.memo && !e.nameFromMemo) lines.push(e.memo);
  const links = e.videoUrl ? [{ url: String(e.videoUrl), label: '動画' }] : [];
  const badge = STATUS_LABEL[e.status] ?? '';
  const out = (title, detail) => ({ title: title || KINDS[e.kind]?.label || '', detail, lines, links, badge });

  switch (e.kind) {
    case 'ergo':
      return out(
        join([labelOf(ERGO_ZONES, e.type), menuTitle(e)]),
        join([e.time, e.split && `@${e.split}/500m`, e.watts && `${e.watts}W`, e.avgHR && `HR${e.avgHR}`, e.rate && `${e.rate}spm`])
      );
    case 'water':
      return out(
        join([boatShort(e.boat), labelOf(ERGO_ZONES, e.type), menuTitle(e)]),
        join([e.time, e.split && `@${e.split}/500m`, e.avgHR && `HR${e.avgHR}`, e.rate && `${e.rate}spm`])
      );
    case 'strength':
      return out(
        e.exerciseName || exerciseLabel(e.exercise),
        join([setsText(e) || '自重', e.estimated1RM && `推定1RM ${e.estimated1RM}kg`])
      );
    case 'cross': {
      // 見出しは、決めてあるメニュー側(距離メニューなら距離、時間メニューなら時間)。もう片方は詳細に出す
      const kindName = { running: 'ラン', cycling: 'バイク', other: 'その他' }[e.type] ?? 'ラン';
      const running = kindName === 'ラン';
      const cycling = kindName === 'バイク';
      const sec = parseTime(e.time);
      // 「10+5」のような足し算の書き方は、内訳の書き方で、走った時間そのものとは限らない。ペース・速度は計算しない
      const calcOk = !e.timeText;
      const pace = calcOk ? e.pace || (running && e.distance && sec ? formatTime(sec / e.distance) : '') : '';
      const speed = calcOk ? e.avgSpeed ?? (cycling && e.distance && sec ? Math.round((e.distance / (sec / 3600)) * 10) / 10 : null) : null;
      const byTime = e.menuBy === 'time';
      return out(
        join([kindName, byTime && sec ? timeMenuLabel(sec) : e.distance ? `${e.distance}km` : e.timeText || (sec ? timeMenuLabel(sec) : '')], ' '),
        join([
          byTime ? e.distance && `${e.distance}km` : e.time && (e.timeText ? `${e.time}(${e.timeText})` : e.time),
          running ? pace && `${pace.replace(/\.0$/, '')}/km` : cycling && speed && `${speed}km/h`,
          e.avgHR && `HR${e.avgHR}`,
          e.rpe && `RPE${e.rpe}`,
        ])
      );
    }
    case 'condition': {
      const feeling = FEELINGS.find((f) => f.id === e.condition)?.label;
      const title = join([e.sleep && `睡眠 ${e.sleep}h`, e.fatigue && `疲労 ${e.fatigue}/5`, feeling && `体調 ${feeling}`]);
      return out(title || '体調メモ', join([e.restingHR && `安静時HR ${e.restingHR}`, e.overallRPE && `全体RPE ${e.overallRPE}`, e.weather]));
    }
    case 'weight':
      return out(`${e.weight}kg`, '');
    case 'nutrition':
      return out(
        join([MEALS[e.mealType], e.calories && `${e.calories}kcal`]),
        join([e.protein && `P ${e.protein}g`, e.fat && `F ${e.fat}g`, e.carbs && `C ${e.carbs}g`])
      );
    default:
      return out('', '');
  }
}

// 種類の見出しの横に出す一言(筋トレなら種目数、エルゴなら合計距離)
export function groupNote(kind, items) {
  if (kind === 'strength') return `${new Set(items.map((e) => e.exercise)).size}種目`;
  if (kind === 'ergo' || kind === 'water') {
    const km = items.reduce((s, e) => s + (e.distance || 0), 0) / 1000;
    return km ? `計 ${km.toFixed(1)}km` : '';
  }
  if (kind === 'cross') {
    const km = items.reduce((s, e) => s + (e.distance || 0), 0);
    return km ? `計 ${km.toFixed(1)}km` : '';
  }
  return '';
}

// 種類ごとにまとめた配列 [{kind, label, note, rows:[{title, detail, lines}]}]
export function groupsOf(entries) {
  return Object.keys(KINDS)
    .map((kind) => {
      const items = entries.filter((e) => e.kind === kind).sort((a, b) => a.id - b.id);
      return { kind, label: KINDS[kind].label, note: groupNote(kind, items), rows: items.map(rowOf) };
    })
    .filter((g) => g.rows.length > 0);
}

// 1日の数字(まとめの上段に出す)。ない項目は含めない
export function dayStats(entries, allEntries, date) {
  const stats = [];
  const ergo = entries.filter((e) => e.kind === 'ergo');
  const km = ergo.reduce((s, e) => s + (e.distance || 0), 0) / 1000;
  if (km) stats.push({ label: 'エルゴ', value: km.toFixed(1), unit: 'km' });

  const waterKm = entries.filter((e) => e.kind === 'water').reduce((s, e) => s + (e.distance || 0), 0) / 1000;
  if (waterKm) stats.push({ label: '水上', value: waterKm.toFixed(1), unit: 'km' });

  const min = entries
    .filter((e) => e.kind === 'ergo' || e.kind === 'water' || e.kind === 'cross')
    .reduce((s, e) => s + (minutesOf(e) || 0), 0);
  if (min) stats.push({ label: '練習時間', value: String(Math.round(min)), unit: '分' });

  const lifts = new Set(entries.filter((e) => e.kind === 'strength').map((e) => e.exercise)).size;
  if (lifts) stats.push({ label: '筋トレ', value: String(lifts), unit: '種目' });

  const ready = readiness(allEntries, date);
  if (ready) stats.push({ label: 'コンディション', value: String(ready.score), unit: '' });

  const weight = entries.find((e) => e.kind === 'weight');
  if (weight) stats.push({ label: '体重', value: String(weight.weight), unit: 'kg' });

  return stats.slice(0, 4);
}

// Slack などに貼る用のテキスト
export function dayText(date, entries, note) {
  const lines = [`【${formatDate(date)} 練習まとめ】`];
  for (const g of groupsOf(entries)) {
    lines.push('', `■ ${g.label}${g.note ? `(${g.note})` : ''}`);
    for (const r of g.rows) {
      lines.push(`・${[r.title, r.badge && `(${r.badge})`, r.detail].filter(Boolean).join(' / ')}`);
      for (const l of r.lines) lines.push(`　${l}`);
      for (const k of r.links) lines.push(`　${k.label}: ${k.url}`);
    }
  }
  if (note?.trim()) lines.push('', '■ メモ', note.trim());
  return lines.join('\n');
}

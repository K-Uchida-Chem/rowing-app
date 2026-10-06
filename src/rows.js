// 履歴・今日の画面に出す「1行ぶんの表示」を種類ごとに作る
import { ERGO_ZONES, labelOf, exerciseLabel, intervalLabel } from './lib.js';

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

/** @returns {{title: string, detail: string, lines: string[]}} */
export function rowOf(e) {
  const lines = [];
  if (e.intervals?.length) lines.push(e.intervals.map((p, i) => `${i + 1}本目 ${p.time}`).join('  '));
  if (e.memo) lines.push(e.memo);

  switch (e.kind) {
    case 'ergo':
      return {
        title: join([labelOf(ERGO_ZONES, e.type), e.intervals?.length ? intervalLabel(e) : e.distance && `${e.distance}m`]),
        detail: join([e.time, e.split && `@${e.split}/500m`, e.watts && `${e.watts}W`, e.avgHR && `HR${e.avgHR}`, e.rate && `${e.rate}spm`]),
        lines,
      };
    case 'strength':
      return {
        title: exerciseLabel(e.exercise),
        detail: join([setsText(e) || '自重', e.estimated1RM && `推定1RM ${e.estimated1RM}kg`]),
        lines,
      };
    case 'cross':
      return {
        title: join([e.type === 'cycling' ? 'バイク' : 'ラン', e.distance && `${e.distance}km`]),
        detail: join([e.time, e.avgHR && `HR${e.avgHR}`, e.rpe && `RPE${e.rpe}`]),
        lines,
      };
    case 'condition':
      return {
        title: join([e.sleep && `睡眠 ${e.sleep}h`, e.fatigue && `疲労 ${e.fatigue}/5`]),
        detail: e.restingHR ? `安静時HR ${e.restingHR}` : '',
        lines,
      };
    case 'weight':
      return { title: `${e.weight}kg`, detail: '', lines };
    case 'nutrition':
      return {
        title: join([MEALS[e.mealType], e.calories && `${e.calories}kcal`]),
        detail: join([e.protein && `P ${e.protein}g`, e.fat && `F ${e.fat}g`, e.carbs && `C ${e.carbs}g`]),
        lines,
      };
    default:
      return { title: '', detail: '', lines };
  }
}

// 種類の見出しの横に出す一言(筋トレなら種目数、エルゴなら合計距離)
export function groupNote(kind, items) {
  if (kind === 'strength') return `${new Set(items.map((e) => e.exercise)).size}種目`;
  if (kind === 'ergo') {
    const km = items.reduce((s, e) => s + (e.distance || 0), 0) / 1000;
    return km ? `計 ${km.toFixed(1)}km` : '';
  }
  if (kind === 'cross') {
    const km = items.reduce((s, e) => s + (e.distance || 0), 0);
    return km ? `計 ${km.toFixed(1)}km` : '';
  }
  return '';
}

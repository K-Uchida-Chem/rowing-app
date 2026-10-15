import { Fragment, useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Minus, Plus, X } from 'lucide-react';
import db from '../db.js';
import { pbMessage } from '../stats.js';
import HrChart from '../HrChart.jsx';
import { ACTIVITIES, workoutSummary } from '../workouts.js';
import {
  KINDS, cleanRecord, today, toDateStr, formatTimeInput, normalizeTime, calcSplit, parseTime, formatTime,
  normalizeRecord, exerciseLabel, wattsFromSplit, timeMenuLabel, SESSIONS, normalizeSession,
} from '../lib.js';

// エルゴと水上は同じ入力(単発/インターバル、距離/時間メニュー、スプリット…)
const isRowKind = (k) => k === 'ergo' || k === 'water';

const initialValues = (kind) => ({
  ...Object.fromEntries(KINDS[kind].fields.map((f) => [f.key, f.default ?? ''])),
  ...(KINDS[kind].sessionable && { session: '' }),
});

// ヘルスケアのワークアウトから分かる項目を入力欄に入れる(メニュー名や強度ゾーンは後から本人が選ぶ)
function workoutValues(kind, w) {
  const v = initialValues(kind);
  const sec = w.duration ? Math.round(w.duration) : null;
  if (isRowKind(kind) || kind === 'cross') {
    if (w.distance) v.distance = String(kind === 'cross' ? Math.round(w.distance / 100) / 10 : Math.round(w.distance));
    if (sec) v.time = formatTime(sec);
    if (w.avgHR) v.avgHR = String(w.avgHR);
  }
  if (isRowKind(kind) && w.maxHR) v.maxHR = String(w.maxHR);
  if (isRowKind(kind) && v.distance && v.time) v.split = calcSplit(Number(v.distance), v.time);
  if (kind === 'cross' && ACTIVITIES[w.activity]?.cross) v.type = ACTIVITIES[w.activity].cross;
  if (kind === 'cross') {
    const avg = crossAvgOf(v.type, v.distance, v.time);
    if (v.type === 'cycling') v.avgSpeed = avg;
    else v.pace = avg;
  }
  return v;
}

// 開いた記録の「保存済みの距離・タイム・スプリット」。何も触らなければ、これをそのまま保存し直す
// (保存してあるスプリットが計算値と0.1秒ずれていても、タイムや距離を勝手に変えないため)
function keepOf(distance, time, storedSplit) {
  const calc = calcSplit(distance, time);
  if (!calc) return null;
  const split = storedSplit && Math.abs(parseTime(storedSplit) - parseTime(calc)) <= 0.15 ? normalizeTime(storedSplit) : calc;
  return { distance: String(distance), time: normalizeTime(time), split };
}

const toPiece = (p) => {
  const keep = keepOf(p.distance, p.time, p.split);
  return {
    distance: String(p.distance ?? ''),
    time: p.time ?? '',
    split: keep?.split ?? p.split ?? '',
    rate: p.rate != null ? String(p.rate) : '',
    _keep: keep,
  };
};

// メニューの「決めてある側」(距離メニューなら距離、時間メニューなら時間)を入れた n 本ぶんの行
const makePieces = (by, spec, n) =>
  Array.from({ length: n }, () => ({ distance: by === 'distance' ? spec : '', time: by === 'time' ? spec : '', split: '', rate: '' }));

// 平均スプリットと、決めてある側(距離 or 時間)から、もう片方を計算する。
// 編集で開いた記録のように、入力したスプリットと矛盾しない元の値があれば、それをそのまま使う
// (スプリットを丸めて計算し直すと、保存済みのタイムや距離が少しずれるため)
function derive(by, { distance, time, split, _keep }) {
  const sp = parseTime(split);
  if (!(sp > 0)) return null;
  const normSplit = normalizeTime(split);
  // 開いた記録のスプリットも、決めてある側も触っていなければ、保存済みの値のまま
  if (_keep && normSplit === _keep.split && (by === 'distance' ? String(distance) === _keep.distance : normalizeTime(time) === _keep.time)) {
    return { distance: Number(_keep.distance), sec: parseTime(_keep.time), split: normSplit };
  }
  if (by === 'distance') {
    const d = Number(distance);
    if (!(d > 0)) return null;
    const keep = time && parseTime(time) > 0 && calcSplit(d, time) === normSplit;
    return { distance: d, sec: keep ? parseTime(time) : (sp * d) / 500, split: normSplit };
  }
  const sec = parseTime(time);
  if (!(sec > 0)) return null;
  const keep = Number(distance) > 0 && calcSplit(Number(distance), time) === normSplit;
  return { distance: keep ? Number(distance) : Math.round((sec / sp) * 500), sec, split: normSplit };
}

// ─── ラン / バイク ───────────────────────────────────
// 距離メニュー: 距離 + 平均ペース(バイクは平均速度)→ タイム。時間メニュー: 時間 + 平均 → 距離。
const round1 = (x) => Math.round(x * 10) / 10;

// 距離(km)とタイムから出した平均。ランは秒/km を「M:SS.T」、バイクは km/h
function crossAvgOf(type, distance, time) {
  const d = Number(distance);
  const sec = parseTime(time);
  if (!(d > 0) || !(sec > 0)) return '';
  return type === 'cycling' ? String(round1(d / (sec / 3600))) : formatTime(sec / d);
}

function deriveCross(by, type, { distance, time, pace, avgSpeed }) {
  const running = type !== 'cycling';
  const avg = running ? parseTime(pace) : Number(avgSpeed);
  if (!(avg > 0)) return null;
  const avgText = running ? normalizeTime(pace) : String(Number(avgSpeed));
  // 入力した平均が、すでにある距離とタイムの組と合っているなら、その組をそのまま使う
  // (編集で開いた記録やヘルスケアの取り込みで、丸めによる再計算のずれを出さない)
  if (Number(distance) > 0 && parseTime(time) > 0 && crossAvgOf(type, distance, time) === avgText) {
    return { distance: Number(distance), sec: parseTime(time), avg: avgText, running };
  }
  if (by === 'distance') {
    const d = Number(distance);
    if (!(d > 0)) return null;
    return { distance: d, sec: running ? avg * d : (d / avg) * 3600, avg: avgText, running };
  }
  const sec = parseTime(time);
  if (!(sec > 0)) return null;
  return { distance: Math.round((running ? sec / avg : (avg * sec) / 3600) * 100) / 100, sec, avg: avgText, running };
}

// 保存してある平均ペース/速度が、保存してある距離・タイムを再現できるときだけ使う。
// 旧アプリの記録のように合っていなければ、距離とタイムから出した平均にする(開き直しで値が動かないように)
function storedCrossAvg(rec) {
  const running = rec.type !== 'cycling';
  const stored = running ? rec.pace : rec.avgSpeed;
  const calc = crossAvgOf(rec.type, rec.distance, rec.time);
  if (stored == null || stored === '' || !calc) return calc || (stored != null ? String(stored) : '');
  const by = rec.menuBy === 'time' ? 'time' : 'distance';
  const probe = deriveCross(by, rec.type, {
    distance: rec.distance, time: rec.time, pace: running ? stored : '', avgSpeed: running ? '' : stored,
  });
  const same = probe && Math.abs(probe.sec - parseTime(rec.time)) < 0.06 && Math.abs(probe.distance - Number(rec.distance)) < 0.006;
  return same ? String(stored) : calc;
}

const valuesFrom = (kind, rec) => {
  const v = Object.fromEntries(KINDS[kind].fields.map((f) => [f.key, rec[f.key] ?? f.default ?? '']));
  if (KINDS[kind].sessionable) v.session = normalizeSession(rec.session);
  // 旧い記録にはスプリットの入力値がないので、距離とタイムから出す
  if (kind === 'cross') {
    const avg = storedCrossAvg(rec);
    if (rec.type !== 'cycling') v.pace = avg;
    else v.avgSpeed = avg;
  }
  if (isRowKind(kind) && !rec.intervals?.length) {
    const keep = keepOf(rec.distance, rec.time, rec.split);
    v.split = keep?.split ?? rec.split ?? '';
    v._keep = keep;
  }
  return v;
};

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateStr(d);
};

// 編集時に、フォームが扱わない項目(旧アプリの動画URLなど)は残し、フォームの項目は入れ替える
function preservedFields(kind, rec) {
  const own = new Set([...KINDS[kind].fields.map((f) => f.key), 'split', 'estimated1RM', 'session', 'intervals', 'intervalBy', 'menuBy', 'watts', 'kind', 'setList', 'hr', 'sleepHours', 'fatigueScore']);
  return Object.fromEntries(Object.entries(rec).filter(([k]) => !own.has(k)));
}

export default function LogPage({ kind, onKind, onSaved, editing, workout }) {
  const isEdit = !!editing;
  const def = KINDS[kind];
  const isRow = isRowKind(kind);
  const showWatts = kind !== 'water'; // 水上にはエルゴ用のワット換算が当てはまらない
  const [date, setDate] = useState(editing?.date ?? workout?.date ?? today());
  const [values, setValues] = useState(() => (editing ? valuesFrom(kind, editing) : workout ? workoutValues(kind, workout) : initialValues(kind)));
  const [mode, setMode] = useState(editing?.intervals?.length ? 'intervals' : 'single');
  // 距離メニュー(距離を決めてタイムを入れる) / 時間メニュー(時間を決めて距離を入れる)
  const [by, setBy] = useState((editing?.intervals?.length ? editing.intervalBy : editing?.menuBy) === 'time' ? 'time' : 'distance');
  const [pieces, setPieces] = useState(() => (editing?.intervals ?? []).map(toPiece));
  const [hint, setHint] = useState('');
  const [toast, setToast] = useState('');
  const [recent, setRecent] = useState([]);
  const linked = useLiveQuery(() => (editing?.workoutId ? db.workouts.get(editing.workoutId) : undefined), [editing?.workoutId]);
  const shown = workout ?? linked;
  const set = (key, v) => setValues((cur) => ({ ...cur, [key]: v }));

  const switchKind = (k) => {
    onKind(k);
    setValues(workout ? workoutValues(k, workout) : initialValues(k));
    setMode('single');
    setBy('distance');
    setPieces([]);
    setHint('');
  };

  // 筋トレ: 種目を選ぶと前回の重量・回数・セット数を自動で入れる(編集時は触らない)
  const exercise = values.exercise;
  useEffect(() => {
    if (kind !== 'strength' || isEdit) return;
    let cancelled = false;
    db.strengthRecords.where('exercise').equals(exercise).toArray().then((rows) => {
      if (cancelled) return;
      const last = rows.filter((r) => r.date).map((r) => normalizeRecord('strength', r)).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)[0];
      if (!last) return setHint('');
      setValues((cur) => ({ ...cur, weight: last.weight ?? '', reps: last.reps ?? cur.reps, sets: last.sets ?? cur.sets }));
      setHint(`前回(${last.date}): ${last.weight ? `${last.weight}kg` : '自重'} ${last.reps}回×${last.sets}`);
    });
    return () => { cancelled = true; };
  }, [kind, exercise, isEdit]);

  // 水上: 艇種は前回と同じものを初期値にする
  useEffect(() => {
    if (kind !== 'water' || isEdit) return;
    let cancelled = false;
    db.waterRecords.toArray().then((rows) => {
      if (cancelled) return;
      const last = rows.filter((r) => r.date && r.boat).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)[0];
      if (last) setValues((cur) => (cur.boat ? cur : { ...cur, boat: last.boat }));
    });
    return () => { cancelled = true; };
  }, [kind, isEdit]);

  // 最近のメニュー(種類+距離が同じものは1つにまとめる)
  useEffect(() => {
    if (!def.menuKeys || isEdit) return setRecent([]);
    let cancelled = false;
    db[def.table].toArray().then((rows) => {
      if (cancelled) return;
      const seen = new Set();
      const out = [];
      for (const r of rows.filter((r) => r.date).map((x) => normalizeRecord(kind, x)).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)) {
        if (!r.distance) continue;
        const timeMenu = r.intervals?.length ? r.intervalBy === 'time' : r.menuBy === 'time';
        const sig = JSON.stringify([r.boat, r.type, timeMenu ? r.time : r.distance, r.intervals?.map((p) => (r.intervalBy === 'time' ? p.time : p.distance))]);
        if (seen.has(sig)) continue;
        seen.add(sig);
        out.push(r);
        if (out.length === 5) break;
      }
      setRecent(out);
    });
    return () => { cancelled = true; };
  }, [kind, def, isEdit]);

  const applyMenu = (r) => {
    // 前回のメニューの「決めてある側」だけ引き継ぎ、結果(スプリット・レート)は空にする
    if (r.intervals?.length) {
      const menuBy = r.intervalBy === 'time' ? 'time' : 'distance';
      setValues((cur) => ({ ...cur, type: r.type ?? cur.type, ...(r.boat && { boat: r.boat }), distance: '', time: '', split: '' }));
      setMode('intervals');
      setBy(menuBy);
      setPieces(r.intervals.map((p) => ({ distance: menuBy === 'distance' ? String(p.distance) : '', time: menuBy === 'time' ? p.time : '', split: '', rate: '' })));
    } else {
      const menuBy = r.menuBy === 'time' ? 'time' : 'distance';
      setMode('single');
      setBy(menuBy);
      setValues((cur) => ({
        ...cur,
        type: r.type ?? cur.type,
        ...(r.boat && { boat: r.boat }),
        distance: menuBy === 'distance' ? String(r.distance ?? '') : '',
        time: menuBy === 'time' ? r.time ?? '' : '',
        split: '',
        pace: '',
        avgSpeed: '',
      }));
    }
  };

  const changeBy = (next) => {
    if (next === by) return;
    setBy(next);
    // インターバルは、意味が変わるので行を作り直す(単発は入力欄を切り替えるだけ)
    if (mode === 'intervals') setPieces(makePieces(next, next === 'distance' ? '1000' : '4:00.0', pieces.length || 4));
  };

  const toIntervals = () => {
    setMode('intervals');
    if (!pieces.length) {
      setPieces(makePieces(by, by === 'distance' ? String(Number(values.distance) || 1000) : values.time || '4:00.0', 4));
    }
  };

  // 入力が揃った区間だけを集計する。タイム(または距離)とワットはスプリットから自動計算
  const donePieces = pieces
    .map((p) => {
      const r = derive(by, p);
      if (!r) return null;
      return {
        distance: r.distance,
        sec: r.sec,
        time: formatTime(r.sec),
        split: r.split,
        watts: Math.round(wattsFromSplit(parseTime(r.split))),
        rate: Number(p.rate) > 0 ? Number(p.rate) : undefined,
      };
    })
    .filter(Boolean);
  const totalSec = donePieces.reduce((s, p) => s + p.sec, 0);
  const totalDist = donePieces.reduce((s, p) => s + p.distance, 0);
  // 全体のワット・レートは、各区間の値を時間で重み付けした平均
  const weighted = (key) => {
    const ps = donePieces.filter((p) => p[key] != null);
    const t = ps.reduce((s, p) => s + p.sec, 0);
    return t ? Math.round(ps.reduce((s, p) => s + p[key] * p.sec, 0) / t) : undefined;
  };

  const buildRecord = () => {
    const rec = cleanRecord(kind, values);
    if (def.sessionable && values.session) rec.session = values.session;
    if (isRow && mode === 'intervals') {
      delete rec.distance;
      delete rec.time;
      delete rec.rate;
      if (donePieces.length) {
        rec.intervals = donePieces.map(({ sec: _sec, rate, watts, ...p }) => ({ ...p, ...(showWatts && { watts }), ...(rate != null && { rate }) }));
        rec.intervalBy = by;
        rec.distance = totalDist;
        rec.time = formatTime(totalSec);
        if (showWatts) rec.watts = weighted('watts');
        const rate = weighted('rate');
        if (rate != null) rec.rate = rate;
      }
    } else if (isRow) {
      // 単発: 決めてある側(距離 or 時間)とスプリットから、もう片方を出す
      const r = derive(by, { ...rec, _keep: values._keep });
      if (r) {
        rec.distance = r.distance;
        rec.time = formatTime(r.sec);
        rec.split = r.split;
      } else if (by === 'distance') {
        delete rec.time; // 切り替え前の入力が隠れて残っていても、持ち越さない
      } else {
        delete rec.distance;
      }
      rec.menuBy = by;
    } else if (kind === 'cross') {
      // ラン/バイク: 決めてある側(距離 or 時間)と平均ペース(速度)から、もう片方を出す
      const r = deriveCross(by, rec.type, rec);
      if (r) {
        rec.distance = r.distance;
        rec.time = formatTime(r.sec);
        if (r.running) rec.pace = r.avg;
        else rec.avgSpeed = Number(r.avg);
        if (r.running) rec.avgSpeed = round1(r.distance / (r.sec / 3600));
      } else if (by === 'distance') {
        delete rec.time; // 切り替え前の入力が隠れて残っていても、持ち越さない
      } else {
        delete rec.distance;
      }
      if (rec.type === 'cycling') delete rec.pace;
      rec.menuBy = by;
    }
    return rec;
  };

  const record = buildRecord();
  const canSave = isRow && mode === 'intervals' ? donePieces.length > 0 : def.requireAny.some((k) => record[k] != null);

  const save = async (andContinue) => {
    if (!canSave) return;
    const rec = def.prepare(record);
    const pb = await pbMessage(kind, rec, editing?.id);
    if (isEdit) {
      await db[def.table].put({
        ...preservedFields(kind, editing), ...rec, date, id: editing.id, updatedAt: new Date().toISOString(),
      });
    } else {
      const id = await db[def.table].add({
        ...rec, date, ...(workout && { workoutId: workout.id }), createdAt: new Date().toISOString(),
      });
      if (workout) await db.workouts.update(workout.id, { status: 'linked', linkedKind: kind, linkedId: id });
    }
    if (andContinue) {
      setToast(pb || '保存しました');
      setTimeout(() => setToast(''), 3000);
    } else {
      onSaved(pb);
    }
  };

  // 単発: スプリットから出した、もう片方の値とワット(入力しながら見せる)
  const single = isRow && mode === 'single' ? derive(by, values) : null; // values に _keep も入っている
  const singleWatts = single ? Math.round(wattsFromSplit(parseTime(single.split))) : null;
  const cross = kind === 'cross' ? deriveCross(by, values.type, values) : null;
  const hiddenKeys =
    kind === 'cross'
      ? [by === 'distance' ? 'time' : 'distance', values.type === 'cycling' ? 'pace' : 'avgSpeed']
      : !isRow ? [] : mode === 'intervals' ? ['distance', 'time', 'split', 'rate'] : by === 'distance' ? ['time'] : ['distance'];

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">{isEdit ? `${def.label}を編集` : '記録する'}</h1>

      {!isEdit && (
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1">
          {Object.entries(KINDS).map(([k, v]) => (
            <Chip key={k} active={k === kind} onClick={() => switchKind(k)}>{v.label}</Chip>
          ))}
        </div>
      )}

      {shown && (
        <div className="card space-y-2">
          <p className="label">ヘルスケアのワークアウト</p>
          <p className="text-sm">{workoutSummary(shown)}</p>
          <HrChart series={shown.hr} />
          {workout && <p className="text-xs text-mute">時間・距離・心拍は入れてあります。メニュー(強度ゾーンなど)を選んで保存してください。</p>}
        </div>
      )}

      {recent.length > 0 && (
        <div>
          <span className="label mb-1.5 block">前回のメニューから</span>
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5">
            {recent.map((r) => (
              <Chip key={r.id} onClick={() => applyMenu(r)}>{def.menuLabel(r)}</Chip>
            ))}
          </div>
        </div>
      )}

      <div className="card space-y-5">
        <Field label="日付">
          <div className="flex gap-2">
            <Chip active={date === today()} onClick={() => setDate(today())}>今日</Chip>
            <Chip active={date === daysAgo(1)} onClick={() => setDate(daysAgo(1))}>昨日</Chip>
            <input type="date" className="input !w-auto flex-1" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </Field>

        {def.sessionable && (
          <Field label="時間帯(任意)">
            <div className="flex gap-2">
              {SESSIONS.map((o) => (
                <Chip key={o.id} active={values.session === o.id} onClick={() => set('session', values.session === o.id ? '' : o.id)}>{o.label}</Chip>
              ))}
            </div>
          </Field>
        )}

        {hint && <p className="-mt-2 rounded-md bg-brand-soft px-3 py-2 text-xs text-brand">{hint}</p>}
        {editing?.setList?.length > 1 && (
          <p className="-mt-2 rounded-md bg-brand-soft px-3 py-2 text-xs text-brand">
            旧アプリの「セットごとの記録」です。更新すると、最も重いセットの重量・回数と、セット数にまとまります。
          </p>
        )}

        {def.fields.map((f) => (
          <Fragment key={f.key}>
            <Field label={f.label} hidden={hiddenKeys.includes(f.key)}>
              <FieldInput f={withCurrentOption(f, values[f.key])} value={values[f.key]} onChange={(v) => set(f.key, v)} />
            </Field>

            {/* ゾーンの直後に 単発/インターバル の切り替え */}
            {isRow && f.key === 'type' && (
              <Field label="形式">
                <div className="flex gap-2">
                  <Chip active={mode === 'single'} onClick={() => setMode('single')}>単発</Chip>
                  <Chip active={mode === 'intervals'} onClick={toIntervals}>インターバル</Chip>
                </div>
              </Field>
            )}
            {(isRow || kind === 'cross') && f.key === 'type' && (
              <Field label="メニュー">
                <div className="flex gap-2">
                  <Chip active={by === 'distance'} onClick={() => changeBy('distance')}>距離メニュー</Chip>
                  <Chip active={by === 'time'} onClick={() => changeBy('time')}>時間メニュー</Chip>
                </div>
                <p className="mt-1.5 text-xs text-mute">
                  {kind === 'cross'
                    ? `${by === 'distance' ? '距離' : '時間'}を決めて、${values.type === 'cycling' ? '平均速度' : '平均ペース'}を入れます。${by === 'distance' ? 'タイム' : '距離'}は自動で出ます。`
                    : by === 'distance'
                      ? '距離を決めて、平均スプリットを入れます。タイムは自動で出ます。'
                      : '時間を決めて、平均スプリットを入れます。距離は自動で出ます。'}
                </p>
              </Field>
            )}
            {isRow && f.key === 'type' && mode === 'intervals' && (
              <IntervalEditor by={by} showWatts={showWatts} pieces={pieces} setPieces={setPieces} done={donePieces} totals={{ dist: totalDist, sec: totalSec, watts: weighted('watts'), rate: weighted('rate') }} />
            )}
          </Fragment>
        ))}

        {cross && (
          <p className="text-sm text-mute">
            {by === 'distance' ? <>タイム <b className="text-ink">{formatTime(cross.sec)}</b></> : <>距離 <b className="text-ink">{cross.distance}km</b></>}
            {cross.running && <> · 平均 <b className="text-ink">{round1(cross.distance / (cross.sec / 3600))}km/h</b></>}
          </p>
        )}
        {single && (
          <p className="text-sm text-mute">
            {by === 'distance' ? <>タイム <b className="text-ink">{formatTime(single.sec)}</b></> : <>距離 <b className="text-ink">{single.distance}m</b></>}
            {showWatts && <> · 平均 <b className="text-ink">{singleWatts}W</b></>}
          </p>
        )}
      </div>

      <div className="space-y-2">
        <button className="btn" disabled={!canSave} onClick={() => save(false)}>{isEdit ? '更新' : '保存'}</button>
        {!isEdit && !workout && (
          <button
            className="w-full rounded-md border border-brand py-3 font-semibold text-brand disabled:opacity-35"
            disabled={!canSave}
            onClick={() => save(true)}
          >
            保存して続けて入力
          </button>
        )}
      </div>

      {toast && (
        <div className="fixed inset-x-4 bottom-20 mx-auto w-fit max-w-sm rounded-md bg-ink px-4 py-2 text-center text-sm text-white">
          {toast}
        </div>
      )}
    </div>
  );
}

// 選択肢にない値(旧アプリの追加種目など)が入っている記録を編集するときも、その値を選択肢に出す
function withCurrentOption(f, value) {
  if (f.type !== 'choice' || !value || f.options.some((o) => o.id === value)) return f;
  const label = f.key === 'exercise' ? exerciseLabel(value) : String(value);
  return { ...f, options: [{ id: value, label }, ...f.options] };
}

const DISTANCE_PRESETS = [250, 500, 750, 1000, 1500, 2000, 3000];
const TIME_PRESETS = [60, 120, 180, 240, 300, 480, 600, 1200];

function IntervalEditor({ by, showWatts, pieces, setPieces, done, totals }) {
  const target = by === 'distance' ? 'distance' : 'time'; // メニューで決めてある側
  const spec = pieces[0]?.[target] ?? '';
  const update = (i, patch) => setPieces((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  // メニュー(決めてある側)を全区間に反映。入力済みのスプリットとレートは残す
  const setSpec = (v) => setPieces((ps) => ps.map((p) => ({ ...p, [target]: v })));
  const setCount = (n) =>
    setPieces((ps) => (n <= ps.length ? ps.slice(0, n) : [...ps, ...makePieces(by, spec, n - ps.length)]));

  return (
    <div className="space-y-3 rounded-md border border-line bg-white p-3">
      <div className="space-y-2">
        <span className="label block">{by === 'distance' ? '1本の距離' : '1本の時間'}</span>
        {by === 'distance' ? (
          <input className="input" type="number" inputMode="numeric" value={spec} onChange={(e) => setSpec(e.target.value)} />
        ) : (
          <input
            className="input font-semibold"
            inputMode="numeric"
            placeholder="0:00.0"
            value={spec}
            onChange={(e) => setSpec(formatTimeInput(e.target.value))}
          />
        )}
        <div className="flex flex-wrap gap-2">
          {by === 'distance'
            ? DISTANCE_PRESETS.map((d) => (
                <Chip key={d} active={Number(spec) === d} onClick={() => setSpec(String(d))}>{d}</Chip>
              ))
            : TIME_PRESETS.map((t) => (
                <Chip key={t} active={parseTime(spec) === t} onClick={() => setSpec(formatTime(t))}>{timeMenuLabel(t)}</Chip>
              ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="label">本数</span>
        <StepButton onClick={() => setCount(Math.max(1, pieces.length - 1))}><Minus size={20} /></StepButton>
        <span className="w-10 text-center text-2xl font-bold">{pieces.length}</span>
        <StepButton onClick={() => setCount(pieces.length + 1)}><Plus size={20} /></StepButton>
      </div>

      <div className="grid grid-cols-[1.25rem_1fr_1fr_3.6rem_1.5rem] items-center gap-1.5 text-xs text-mute">
        <span /> <span>{by === 'distance' ? '距離 (m)' : '時間'}</span> <span>平均スプリット</span> <span>レート</span> <span />
      </div>
      {pieces.map((p, i) => {
        const r = derive(by, p);
        const watts = r ? Math.round(wattsFromSplit(parseTime(r.split))) : null;
        return (
          <div key={i} className="space-y-0.5">
            <div className="grid grid-cols-[1.25rem_1fr_1fr_3.6rem_1.5rem] items-center gap-1.5">
              <span className="text-sm text-mute">{i + 1}</span>
              <PieceField kind={target} value={p[target]} onChange={(v) => update(i, { [target]: v })} />
              <PieceField kind="time" value={p.split} onChange={(v) => update(i, { split: v })} />
              <input
                className="input !px-2"
                type="number"
                inputMode="numeric"
                aria-label={`${i + 1}本目のレート`}
                placeholder="spm"
                value={p.rate}
                onChange={(e) => update(i, { rate: e.target.value })}
              />
              <button
                type="button"
                aria-label={`${i + 1}本目を削除`}
                onClick={() => setPieces((ps) => (ps.length > 1 ? ps.filter((_, j) => j !== i) : ps))}
                className="p-0.5 text-mute"
              >
                <X size={16} />
              </button>
            </div>
            {r && (
              <p className="pl-6 text-xs text-mute">
                {by === 'distance' ? `タイム ${formatTime(r.sec)}` : `距離 ${r.distance}m`}{showWatts && ` · ${watts}W`}
              </p>
            )}
          </div>
        );
      })}

      {done.length > 0 && (
        <p className="border-t border-line pt-2 text-sm text-mute">
          {done.length}本 合計 <b className="text-ink">{totals.dist}m</b> {formatTime(totals.sec)} 平均{' '}
          <b className="text-ink">{calcSplit(totals.dist, formatTime(totals.sec))}</b>/500m
          {showWatts && <> · <b className="text-ink">{totals.watts}W</b></>}
          {totals.rate != null && <> · レート <b className="text-ink">{totals.rate}</b></>}
        </p>
      )}
    </div>
  );
}

// 区間の入力欄。時間は数字だけ打てば 0:00.0 に整形、距離は数字
function PieceField({ kind, value, onChange }) {
  return kind === 'time' ? (
    <input
      className="input font-semibold !px-2"
      inputMode="numeric"
      placeholder="0:00.0"
      value={value}
      onChange={(e) => onChange(formatTimeInput(e.target.value))}
    />
  ) : (
    <input className="input !px-2" type="number" inputMode="numeric" placeholder="m" value={value} onChange={(e) => onChange(e.target.value)} />
  );
}

function FieldInput({ f, value, onChange }) {
  switch (f.type) {
    case 'choice':
      return (
        <div className="flex flex-wrap gap-2">
          {f.options.map((o) => (
            <Chip key={o.id} active={value === o.id} onClick={() => onChange(o.id)}>{o.label}</Chip>
          ))}
        </div>
      );

    case 'scale': {
      const nums = Array.from({ length: f.max - f.min + 1 }, (_, i) => f.min + i);
      return (
        <div className="flex gap-1.5">
          {nums.map((n) => (
            <button
              type="button"
              key={n}
              onClick={() => onChange(value === n ? '' : n)}
              className={`h-10 flex-1 rounded-md border text-sm font-semibold ${
                value === n ? 'border-brand bg-brand text-white' : 'border-line bg-white text-ink'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      );
    }

    case 'stepper': {
      const n = Number(value) || 0;
      return (
        <div className="flex items-center gap-3">
          <StepButton onClick={() => onChange(Math.max(f.min ?? 0, n - 1))}><Minus size={20} /></StepButton>
          <span className="w-12 text-center text-2xl font-bold">{n}</span>
          <StepButton onClick={() => onChange(n + 1)}><Plus size={20} /></StepButton>
        </div>
      );
    }

    case 'textarea':
      return (
        <textarea
          className="input min-h-32 resize-y leading-relaxed"
          placeholder={f.placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      );

    case 'time':
      return (
        <div className="space-y-2">
          <input
            className="input text-xl font-semibold tracking-wide"
            inputMode="numeric"
            placeholder="0:00.0"
            value={value}
            onChange={(e) => onChange(formatTimeInput(e.target.value))}
          />
          {f.presets && (
            <div className="flex flex-wrap gap-2">
              {f.presets.map((t) => (
                <Chip key={t} active={parseTime(value) === t} onClick={() => onChange(formatTime(t))}>{timeMenuLabel(t)}</Chip>
              ))}
            </div>
          )}
        </div>
      );

    case 'number':
      return (
        <div className="space-y-2">
          <input
            className="input"
            type="number"
            inputMode="decimal"
            step={f.step ?? 'any'}
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          {f.presets && (
            <div className="flex flex-wrap gap-2">
              {f.presets.map((p) => (
                <Chip key={p} active={Number(value) === p} onClick={() => onChange(String(p))}>{p}</Chip>
              ))}
            </div>
          )}
        </div>
      );

    default:
      return <input className="input" value={value} onChange={(e) => onChange(e.target.value)} />;
  }
}

function Chip({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-md border px-3.5 py-2 text-sm font-medium ${
        active ? 'border-brand bg-brand text-white' : 'border-line bg-white text-ink'
      }`}
    >
      {children}
    </button>
  );
}

function StepButton({ onClick, children }) {
  return (
    <button type="button" onClick={onClick} className="flex h-11 w-11 items-center justify-center rounded-md border border-line bg-white active:bg-brand-soft">
      {children}
    </button>
  );
}

function Field({ label, children, hidden }) {
  if (hidden) return null;
  return (
    <div>
      <span className="label mb-1.5 block">{label}</span>
      {children}
    </div>
  );
}

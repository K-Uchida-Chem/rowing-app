import { Fragment, useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Camera, Minus, Plus, Loader2, X } from 'lucide-react';
import db from '../db.js';
import { readWorkoutImages } from '../ocr.js';
import { pbMessage } from '../stats.js';
import HrChart from '../HrChart.jsx';
import { ACTIVITIES, workoutSummary } from '../workouts.js';
import {
  KINDS, cleanRecord, today, toDateStr, formatTimeInput, normalizeTime, calcSplit, parseTime, formatTime,
  normalizeRecord, exerciseLabel, wattsFromSplit, timeMenuLabel,
} from '../lib.js';

const initialValues = (kind) =>
  Object.fromEntries(KINDS[kind].fields.map((f) => [f.key, f.default ?? '']));

// ヘルスケアのワークアウトから分かる項目を入力欄に入れる(メニュー名や強度ゾーンは後から本人が選ぶ)
function workoutValues(kind, w) {
  const v = initialValues(kind);
  const sec = w.duration ? Math.round(w.duration) : null;
  if (kind === 'ergo' || kind === 'cross') {
    if (w.distance) v.distance = String(kind === 'cross' ? Math.round(w.distance / 100) / 10 : Math.round(w.distance));
    if (sec) v.time = formatTime(sec);
    if (w.avgHR) v.avgHR = String(w.avgHR);
  }
  if (kind === 'ergo' && w.maxHR) v.maxHR = String(w.maxHR);
  if (kind === 'cross' && ACTIVITIES[w.activity]?.cross) v.type = ACTIVITIES[w.activity].cross;
  return v;
}

const toPiece = (p) => ({
  distance: String(p.distance ?? ''),
  time: p.time ?? '',
  rate: p.rate != null ? String(p.rate) : '',
});

// メニューの「決めてある側」(距離メニューなら距離、時間メニューなら時間)を入れた n 本ぶんの行
const makePieces = (by, spec, n) =>
  Array.from({ length: n }, () => ({ distance: by === 'distance' ? spec : '', time: by === 'time' ? spec : '', rate: '' }));

const valuesFrom = (kind, rec) =>
  Object.fromEntries(KINDS[kind].fields.map((f) => [f.key, rec[f.key] ?? f.default ?? '']));

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateStr(d);
};

// 編集時に、フォームが扱わない項目(旧アプリの動画URLなど)は残し、フォームの項目は入れ替える
function preservedFields(kind, rec) {
  const own = new Set([...KINDS[kind].fields.map((f) => f.key), 'split', 'estimated1RM', 'intervals', 'kind', 'setList', 'hr', 'sleepHours', 'fatigueScore']);
  return Object.fromEntries(Object.entries(rec).filter(([k]) => !own.has(k)));
}

export default function LogPage({ kind, onKind, onSaved, editing, workout }) {
  const isEdit = !!editing;
  const def = KINDS[kind];
  const [date, setDate] = useState(editing?.date ?? workout?.date ?? today());
  const [values, setValues] = useState(() => (editing ? valuesFrom(kind, editing) : workout ? workoutValues(kind, workout) : initialValues(kind)));
  const [mode, setMode] = useState(editing?.intervals?.length ? 'intervals' : 'single');
  // 距離メニュー(距離を決めてタイムを入れる) / 時間メニュー(時間を決めて距離を入れる)
  const [by, setBy] = useState(editing?.intervalBy === 'time' ? 'time' : 'distance');
  const [pieces, setPieces] = useState(() => (editing?.intervals ?? []).map(toPiece));
  const [hint, setHint] = useState('');
  const [toast, setToast] = useState('');
  const [recent, setRecent] = useState([]);
  const linked = useLiveQuery(() => (editing?.workoutId ? db.workouts.get(editing.workoutId) : undefined), [editing?.workoutId]);
  const shown = workout ?? linked;
  const set = (key, v) => setValues((cur) => ({ ...cur, [key]: v }));

  const switchKind = (k) => {
    onKind(k);
    setValues(initialValues(k));
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
        const sig = JSON.stringify([def.menuKeys.map((k) => r[k]), r.intervals?.map((p) => p.distance)]);
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
    setValues((cur) => ({
      ...cur,
      ...Object.fromEntries(def.menuKeys.map((k) => [k, r[k] ?? cur[k]])),
      time: '',
    }));
    if (r.intervals?.length) {
      // 前回のメニューの「決めてある側」だけ引き継ぎ、結果(タイム・距離・レート)は空にする
      const menuBy = r.intervalBy === 'time' ? 'time' : 'distance';
      setMode('intervals');
      setBy(menuBy);
      setPieces(r.intervals.map((p) => ({ distance: menuBy === 'distance' ? String(p.distance) : '', time: menuBy === 'time' ? p.time : '', rate: '' })));
    } else {
      setMode('single');
    }
  };

  const toIntervals = () => {
    setMode('intervals');
    if (!pieces.length) {
      setBy('distance');
      setPieces(makePieces('distance', String(values.distance || 1000), 4));
    }
  };

  // 入力が揃った区間だけを集計する。スプリットとワットはタイムと距離から自動計算
  const donePieces = pieces
    .filter((p) => Number(p.distance) > 0 && parseTime(p.time) > 0)
    .map((p) => {
      const distance = Number(p.distance);
      const sec = parseTime(p.time);
      return {
        distance,
        sec,
        time: normalizeTime(p.time),
        split: calcSplit(distance, p.time),
        watts: Math.round(wattsFromSplit((sec / distance) * 500)),
        rate: Number(p.rate) > 0 ? Number(p.rate) : undefined,
      };
    });
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
    if (kind === 'ergo' && mode === 'intervals') {
      delete rec.distance;
      delete rec.time;
      delete rec.rate;
      if (donePieces.length) {
        rec.intervals = donePieces.map(({ sec, rate, ...p }) => ({ ...p, ...(rate != null && { rate }) }));
        rec.intervalBy = by;
        rec.distance = totalDist;
        rec.time = formatTime(totalSec);
        rec.watts = weighted('watts');
        const rate = weighted('rate');
        if (rate != null) rec.rate = rate;
      }
    }
    return rec;
  };

  const record = buildRecord();
  const canSave = kind === 'ergo' && mode === 'intervals' ? donePieces.length > 0 : def.requireAny.some((k) => record[k] != null);

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

  // 写真から読み取った値を入力欄に反映(エルゴのみ)
  const applyScan = (scan) => {
    setMode('single');
    setValues((cur) => ({
      ...cur,
      ...(scan.distance != null && { distance: String(Math.round(scan.distance)) }),
      ...(scan.time && { time: normalizeTime(scan.time) }),
      ...(scan.rate != null && { rate: String(Math.round(scan.rate)) }),
      ...(scan.avgHR != null && { avgHR: String(Math.round(scan.avgHR)) }),
      ...(scan.maxHR != null && { maxHR: String(Math.round(scan.maxHR)) }),
    }));
  };

  const split = kind === 'ergo' && mode === 'single' ? calcSplit(record.distance, record.time) : '';
  const hideInSingle = kind === 'ergo' && mode === 'intervals' ? ['distance', 'time', 'rate'] : [];
  const singleWatts = split ? Math.round(wattsFromSplit(parseTime(split))) : null;

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

      {kind === 'ergo' && !isEdit && !workout && <PhotoImport onResult={applyScan} />}

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

        {hint && <p className="-mt-2 rounded-md bg-brand-soft px-3 py-2 text-xs text-brand">{hint}</p>}
        {editing?.setList?.length > 1 && (
          <p className="-mt-2 rounded-md bg-brand-soft px-3 py-2 text-xs text-brand">
            旧アプリの「セットごとの記録」です。更新すると、最も重いセットの重量・回数と、セット数にまとまります。
          </p>
        )}

        {def.fields.map((f) => (
          <Fragment key={f.key}>
            <Field label={f.label} hidden={hideInSingle.includes(f.key)}>
              <FieldInput f={withCurrentOption(f, values[f.key])} value={values[f.key]} onChange={(v) => set(f.key, v)} />
            </Field>

            {/* ゾーンの直後に 単発/インターバル の切り替え */}
            {kind === 'ergo' && f.key === 'type' && (
              <Field label="形式">
                <div className="flex gap-2">
                  <Chip active={mode === 'single'} onClick={() => setMode('single')}>単発</Chip>
                  <Chip active={mode === 'intervals'} onClick={toIntervals}>インターバル</Chip>
                </div>
              </Field>
            )}
            {kind === 'ergo' && f.key === 'type' && mode === 'intervals' && (
              <IntervalEditor by={by} setBy={setBy} pieces={pieces} setPieces={setPieces} done={donePieces} totals={{ dist: totalDist, sec: totalSec, watts: weighted('watts'), rate: weighted('rate') }} />
            )}
          </Fragment>
        ))}

        {split && (
          <p className="text-sm text-mute">
            500mスプリット <b className="text-ink">{split}</b> · 平均 <b className="text-ink">{singleWatts}W</b>
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

function IntervalEditor({ by, setBy, pieces, setPieces, done, totals }) {
  const target = by === 'distance' ? 'distance' : 'time'; // メニューで決めてある側
  const result = by === 'distance' ? 'time' : 'distance'; // 漕いだ結果として入れる側
  const spec = pieces[0]?.[target] ?? '';
  const update = (i, patch) => setPieces((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  // メニュー(決めてある側)を全区間に反映。入力済みの結果とレートは残す
  const setSpec = (v) => setPieces((ps) => ps.map((p) => ({ ...p, [target]: v })));
  const setCount = (n) =>
    setPieces((ps) =>
      n <= ps.length ? ps.slice(0, n) : [...ps, ...makePieces(by, spec, n - ps.length)]
    );
  // 距離⇔時間を切り替えたら、決める側を空にして作り直す(意味が変わるため)
  const switchBy = (next) => {
    if (next === by) return;
    setBy(next);
    setPieces(makePieces(next, next === 'distance' ? '1000' : '4:00.0', pieces.length || 4));
  };

  const headTarget = by === 'distance' ? '距離 (m)' : '時間';
  const headResult = by === 'distance' ? 'タイム' : '距離 (m)';

  return (
    <div className="space-y-3 rounded-md border border-line bg-white p-3">
      <div className="flex gap-2">
        <Chip active={by === 'distance'} onClick={() => switchBy('distance')}>距離メニュー</Chip>
        <Chip active={by === 'time'} onClick={() => switchBy('time')}>時間メニュー</Chip>
      </div>
      <p className="text-xs text-mute">
        {by === 'distance' ? '距離を決めて、1本ごとのタイムを入れます。(例: 1000m × 4本)' : '時間を決めて、1本ごとに進んだ距離を入れます。(例: 4分 × 5本)'}
      </p>

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
        <span /> <span>{headTarget}</span> <span>{headResult}</span> <span>レート</span> <span />
      </div>
      {pieces.map((p, i) => {
        const sec = parseTime(p.time);
        const ok = Number(p.distance) > 0 && sec > 0;
        const split = ok ? calcSplit(Number(p.distance), p.time) : '';
        const watts = ok ? Math.round(wattsFromSplit((sec / Number(p.distance)) * 500)) : null;
        return (
          <div key={i} className="space-y-0.5">
            <div className="grid grid-cols-[1.25rem_1fr_1fr_3.6rem_1.5rem] items-center gap-1.5">
              <span className="text-sm text-mute">{i + 1}</span>
              <PieceField kind={target} value={p[target]} onChange={(v) => update(i, { [target]: v })} />
              <PieceField kind={result} value={p[result]} onChange={(v) => update(i, { [result]: v })} />
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
            {ok && <p className="pl-6 text-xs text-mute">@{split}/500m · {watts}W</p>}
          </div>
        );
      })}

      {done.length > 0 && (
        <p className="border-t border-line pt-2 text-sm text-mute">
          {done.length}本 合計 <b className="text-ink">{totals.dist}m</b> {formatTime(totals.sec)} 平均{' '}
          <b className="text-ink">{calcSplit(totals.dist, formatTime(totals.sec))}</b>/500m ·{' '}
          <b className="text-ink">{totals.watts}W</b>
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

    case 'time':
      return (
        <input
          className="input text-xl font-semibold tracking-wide"
          inputMode="numeric"
          placeholder="0:00.0"
          value={value}
          onChange={(e) => onChange(formatTimeInput(e.target.value))}
        />
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

function PhotoImport({ onResult }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);

  const onFiles = async (e) => {
    const files = [...e.target.files];
    e.target.value = '';
    if (!files.length) return;
    setBusy(true);
    setMsg(null);
    try {
      const result = await readWorkoutImages(files);
      onResult(result);
      setMsg({ ok: true, text: `読み取りました(${Object.keys(result).length}項目)。内容を確認して保存してください。` });
    } catch (err) {
      setMsg({ ok: false, text: err.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => ref.current.click()}
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-md border border-brand py-3 font-semibold text-brand disabled:opacity-60"
      >
        {busy ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
        {busy ? '読み取り中…' : '写真から読み取る(PM5・ウォッチ)'}
      </button>
      <input ref={ref} type="file" accept="image/*" multiple hidden onChange={onFiles} />
      <p className="text-xs text-mute">PM5の画面とウォッチのスクショは、まとめて選べます。</p>
      {msg && <p className={`text-sm ${msg.ok ? 'text-brand' : 'text-accent'}`}>{msg.text}</p>}
    </div>
  );
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

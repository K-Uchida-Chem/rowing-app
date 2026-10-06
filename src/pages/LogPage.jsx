import { Fragment, useEffect, useRef, useState } from 'react';
import { Camera, Minus, Plus, Loader2, X } from 'lucide-react';
import db from '../db.js';
import { readWorkoutImages } from '../ocr.js';
import { pbMessage } from '../stats.js';
import {
  KINDS, cleanRecord, today, toDateStr, formatTimeInput, normalizeTime, calcSplit, parseTime, formatTime,
  normalizeRecord, exerciseLabel,
} from '../lib.js';

const initialValues = (kind) =>
  Object.fromEntries(KINDS[kind].fields.map((f) => [f.key, f.default ?? '']));

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

export default function LogPage({ kind, onKind, onSaved, editing }) {
  const isEdit = !!editing;
  const def = KINDS[kind];
  const [date, setDate] = useState(editing?.date ?? today());
  const [values, setValues] = useState(() => (editing ? valuesFrom(kind, editing) : initialValues(kind)));
  const [mode, setMode] = useState(editing?.intervals?.length ? 'intervals' : 'single');
  const [pieces, setPieces] = useState(() =>
    (editing?.intervals ?? []).map((p) => ({ distance: String(p.distance ?? ''), time: p.time ?? '' }))
  );
  const [hint, setHint] = useState('');
  const [toast, setToast] = useState('');
  const [recent, setRecent] = useState([]);
  const set = (key, v) => setValues((cur) => ({ ...cur, [key]: v }));

  const switchKind = (k) => {
    onKind(k);
    setValues(initialValues(k));
    setMode('single');
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
      setMode('intervals');
      setPieces(r.intervals.map((p) => ({ distance: String(p.distance), time: '' })));
    } else {
      setMode('single');
    }
  };

  const toIntervals = () => {
    setMode('intervals');
    if (!pieces.length) setPieces([{ distance: String(values.distance || ''), time: '' }]);
  };

  // フォーム内容を保存用レコードにする
  const donePieces = pieces
    .filter((p) => Number(p.distance) > 0 && parseTime(p.time))
    .map((p) => ({
      distance: Number(p.distance),
      time: normalizeTime(p.time),
      split: calcSplit(Number(p.distance), p.time),
    }));

  const buildRecord = () => {
    const rec = cleanRecord(kind, values);
    if (kind === 'ergo' && mode === 'intervals') {
      delete rec.distance;
      delete rec.time;
      if (donePieces.length) {
        rec.intervals = donePieces;
        rec.distance = donePieces.reduce((s, p) => s + p.distance, 0);
        rec.time = formatTime(donePieces.reduce((s, p) => s + parseTime(p.time), 0));
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
      await db[def.table].add({ ...rec, date, createdAt: new Date().toISOString() });
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
      ...(scan.watts != null && { watts: String(Math.round(scan.watts)) }),
      ...(scan.rate != null && { rate: String(Math.round(scan.rate)) }),
      ...(scan.avgHR != null && { avgHR: String(Math.round(scan.avgHR)) }),
      ...(scan.maxHR != null && { maxHR: String(Math.round(scan.maxHR)) }),
    }));
  };

  const split = kind === 'ergo' && mode === 'single' ? calcSplit(record.distance, record.time) : '';
  const hideInSingle = kind === 'ergo' && mode === 'intervals' ? ['distance', 'time'] : [];

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

      {kind === 'ergo' && !isEdit && <PhotoImport onResult={applyScan} />}

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
              <IntervalEditor pieces={pieces} setPieces={setPieces} />
            )}
          </Fragment>
        ))}

        {split && <p className="text-sm text-mute">500mスプリット <b className="text-ink">{split}</b></p>}
      </div>

      <div className="space-y-2">
        <button className="btn" disabled={!canSave} onClick={() => save(false)}>{isEdit ? '更新' : '保存'}</button>
        {!isEdit && (
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

function IntervalEditor({ pieces, setPieces }) {
  const update = (i, patch) => setPieces((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const done = pieces.filter((p) => Number(p.distance) > 0 && parseTime(p.time));
  const totalDist = done.reduce((s, p) => s + Number(p.distance), 0);
  const totalSec = done.reduce((s, p) => s + parseTime(p.time), 0);

  return (
    <div className="space-y-2 rounded-md border border-line bg-white p-3">
      <div className="grid grid-cols-[1.5rem_1fr_1fr_2rem] items-center gap-2 text-xs text-mute">
        <span /> <span>距離 (m)</span> <span>タイム</span> <span />
      </div>
      {pieces.map((p, i) => (
        <div key={i} className="grid grid-cols-[1.5rem_1fr_1fr_2rem] items-center gap-2">
          <span className="text-sm text-mute">{i + 1}</span>
          <input
            className="input"
            type="number"
            inputMode="numeric"
            value={p.distance}
            onChange={(e) => update(i, { distance: e.target.value })}
          />
          <input
            className="input font-semibold"
            inputMode="numeric"
            placeholder="0:00.0"
            value={p.time}
            onChange={(e) => update(i, { time: formatTimeInput(e.target.value) })}
          />
          <button type="button" aria-label="この本を削除" onClick={() => setPieces((ps) => ps.filter((_, j) => j !== i))} className="p-1 text-mute">
            <X size={18} />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setPieces((ps) => [...ps, { distance: ps[ps.length - 1]?.distance ?? '', time: '' }])}
        className="w-full rounded-md border border-dashed border-brand py-2 text-sm font-medium text-brand"
      >
        ＋ 1本追加(同じ距離)
      </button>
      {done.length > 0 && (
        <p className="text-sm text-mute">
          {done.length}本 合計 <b className="text-ink">{totalDist}m</b> {formatTime(totalSec)} 平均 <b className="text-ink">{calcSplit(totalDist, formatTime(totalSec))}</b>/500m
        </p>
      )}
    </div>
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

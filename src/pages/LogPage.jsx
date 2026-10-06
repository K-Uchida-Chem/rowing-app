import { useEffect, useRef, useState } from 'react';
import { Camera, Minus, Plus, Loader2 } from 'lucide-react';
import db from '../db.js';
import { readWorkoutImages } from '../ocr.js';
import {
  KINDS, cleanRecord, today, toDateStr, formatTimeInput, normalizeTime, calcSplit,
} from '../lib.js';

const initialValues = (kind) =>
  Object.fromEntries(KINDS[kind].fields.map((f) => [f.key, f.default ?? '']));

const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return toDateStr(d);
};

export default function LogPage({ kind, onKind, onSaved }) {
  const [date, setDate] = useState(today());
  const [values, setValues] = useState(() => initialValues(kind));
  const [hint, setHint] = useState('');
  const [toast, setToast] = useState('');
  const def = KINDS[kind];
  const set = (key, v) => setValues((cur) => ({ ...cur, [key]: v }));

  const switchKind = (k) => {
    onKind(k);
    setValues(initialValues(k));
    setHint('');
  };

  // 筋トレ: 種目を選ぶと前回の重量・回数・セット数を自動で入れる
  const exercise = values.exercise;
  useEffect(() => {
    if (kind !== 'strength') return;
    let cancelled = false;
    db.strengthRecords.where('exercise').equals(exercise).toArray().then((rows) => {
      if (cancelled) return;
      const last = rows.filter((r) => r.date).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id)[0];
      if (!last) return setHint('');
      setValues((cur) => ({ ...cur, weight: last.weight ?? '', reps: last.reps ?? cur.reps, sets: last.sets ?? cur.sets }));
      setHint(`前回(${last.date}): ${last.weight ? `${last.weight}kg` : '自重'} ${last.reps}回×${last.sets}`);
    });
    return () => { cancelled = true; };
  }, [kind, exercise]);

  const record = cleanRecord(kind, values);
  const canSave = def.requireAny.some((k) => record[k] != null);

  const save = async (andContinue) => {
    if (!canSave) return;
    await db[def.table].add({ ...def.prepare(record), date, createdAt: new Date().toISOString() });
    if (andContinue) {
      setToast('保存しました');
      setTimeout(() => setToast(''), 2500);
    } else {
      onSaved();
    }
  };

  // 写真から読み取った値を入力欄に反映(エルゴのみ)
  const applyScan = (scan) => {
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

  const split = kind === 'ergo' ? calcSplit(record.distance, record.time) : '';

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold">記録する</h1>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1">
        {Object.entries(KINDS).map(([k, v]) => (
          <Chip key={k} active={k === kind} onClick={() => switchKind(k)}>{v.label}</Chip>
        ))}
      </div>

      {kind === 'ergo' && <PhotoImport onResult={applyScan} />}

      <div className="card space-y-5">
        <Field label="日付">
          <div className="flex gap-2">
            <Chip active={date === today()} onClick={() => setDate(today())}>今日</Chip>
            <Chip active={date === daysAgo(1)} onClick={() => setDate(daysAgo(1))}>昨日</Chip>
            <input type="date" className="input !w-auto flex-1" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
        </Field>

        {hint && <p className="-mt-2 rounded-md bg-brand-soft px-3 py-2 text-xs text-brand">{hint}</p>}

        {def.fields.map((f) => (
          <Field key={f.key} label={f.label}>
            <FieldInput f={f} value={values[f.key]} onChange={(v) => set(f.key, v)} />
          </Field>
        ))}

        {split && <p className="text-sm text-mute">500mスプリット <b className="text-ink">{split}</b></p>}
      </div>

      <div className="space-y-2">
        <button className="btn" disabled={!canSave} onClick={() => save(false)}>保存</button>
        <button
          className="w-full rounded-md border border-brand py-3 font-semibold text-brand disabled:opacity-35"
          disabled={!canSave}
          onClick={() => save(true)}
        >
          保存して続けて入力
        </button>
      </div>

      {toast && (
        <div className="fixed inset-x-0 bottom-20 mx-auto w-fit rounded-md bg-ink px-4 py-2 text-sm text-white">
          {toast}
        </div>
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
      {msg && <p className={`text-sm ${msg.ok ? 'text-brand' : 'text-red-600'}`}>{msg.text}</p>}
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

function Field({ label, children }) {
  return (
    <div>
      <span className="label mb-1.5 block">{label}</span>
      {children}
    </div>
  );
}

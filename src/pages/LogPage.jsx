import { useState } from 'react';
import db from '../db.js';
import { KINDS, cleanRecord, today } from '../lib.js';

const initialValues = (kind) =>
  Object.fromEntries(KINDS[kind].fields.map((f) => [f.key, f.default ?? '']));

export default function LogPage({ kind, onKind, onSaved }) {
  const [date, setDate] = useState(today());
  // 種目を切り替えたら入力欄をリセットするため kind ごとに state を持つ
  const [values, setValues] = useState(() => initialValues(kind));
  const [saving, setSaving] = useState(false);
  const def = KINDS[kind];

  const switchKind = (k) => {
    onKind(k);
    setValues(initialValues(k));
  };

  const save = async (e) => {
    e.preventDefault();
    const record = cleanRecord(kind, values);
    const hasInput = Object.keys(record).some((k) => values[k] !== (def.fields.find((f) => f.key === k).default ?? ''));
    if (!hasInput) return;
    setSaving(true);
    await db[def.table].add({ ...def.prepare(record), date, createdAt: new Date().toISOString() });
    setSaving(false);
    onSaved();
  };

  return (
    <form onSubmit={save} className="space-y-4">
      <h1 className="text-xl font-bold">記録する</h1>

      <div className="flex flex-wrap gap-2">
        {Object.entries(KINDS).map(([k, v]) => (
          <button
            type="button"
            key={k}
            onClick={() => switchKind(k)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium ${
              k === kind ? 'bg-brand text-white' : 'bg-white text-slate-600 shadow-sm'
            }`}
          >
            {v.label}
          </button>
        ))}
      </div>

      <div className="card space-y-3">
        <Field label="日付">
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>

        {def.fields.map((f) => (
          <Field key={f.key} label={f.label}>
            {f.type === 'select' ? (
              <select
                className="input"
                value={values[f.key]}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              >
                {f.options.map((o) => (
                  <option key={o.id} value={o.id}>{o.label}</option>
                ))}
              </select>
            ) : (
              <input
                className="input"
                type={f.type === 'number' ? 'number' : 'text'}
                inputMode={f.type === 'number' ? 'decimal' : undefined}
                step="any"
                value={values[f.key]}
                onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
              />
            )}
          </Field>
        ))}
      </div>

      <button className="btn" disabled={saving}>{saving ? '保存中…' : '保存'}</button>
    </form>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">{label}</span>
      {children}
    </label>
  );
}

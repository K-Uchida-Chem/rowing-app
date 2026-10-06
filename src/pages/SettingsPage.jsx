import { useEffect, useRef, useState } from 'react';
import { Download, Upload, Trash2 } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import db, { exportData, importData, lastBackup } from '../db.js';
import {
  today, formatTimeInput, GOAL_TYPES, SCHEDULE_ERGO, SCHEDULE_STRENGTH,
} from '../lib.js';
import { getApiKey, setApiKey } from '../ocr.js';

const DAYS = [
  { id: 1, name: '月' }, { id: 2, name: '火' }, { id: 3, name: '水' }, { id: 4, name: '木' },
  { id: 5, name: '金' }, { id: 6, name: '土' }, { id: 0, name: '日' },
];

export default function SettingsPage() {
  return (
    <>
      <h1 className="text-xl font-bold">設定</h1>
      <ScheduleSection />
      <GoalSection />
      <ApiKeySection />
      <BackupSection />
    </>
  );
}

// ─── 週間メニュー ───────────────────────────────────
function ScheduleSection() {
  const rows = useLiveQuery(() => db.weeklySchedule.toArray(), []);
  const [draft, setDraft] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!rows || draft) return;
    setDraft(
      Object.fromEntries(
        DAYS.map((d) => [d.id, { dayOfWeek: d.id, ergoType: 'none', strengthDay: 'none', description: '', ...rows.find((r) => r.dayOfWeek === d.id) }])
      )
    );
  }, [rows, draft]);

  if (!draft) return null;
  const change = (id, patch) => {
    setSaved(false);
    setDraft((cur) => ({ ...cur, [id]: { ...cur[id], ...patch } }));
  };
  const save = async () => {
    await db.weeklySchedule.bulkPut(Object.values(draft));
    setSaved(true);
  };

  return (
    <section className="card space-y-3">
      <h2 className="label">週間メニュー</h2>
      <p className="text-xs text-mute">決めておくと、「今日」の画面にその日の予定が出ます。</p>
      {DAYS.map((d) => (
        <div key={d.id} className="grid grid-cols-[1.5rem_1fr_1fr] items-center gap-2">
          <span className="text-sm font-semibold">{d.name}</span>
          <select className="input !py-2 text-sm" value={draft[d.id].ergoType} onChange={(e) => change(d.id, { ergoType: e.target.value })}>
            {SCHEDULE_ERGO.map((o) => <option key={o.id} value={o.id}>{o.id === 'none' ? 'エルゴなし' : `エルゴ ${o.id}`}</option>)}
          </select>
          <select className="input !py-2 text-sm" value={draft[d.id].strengthDay} onChange={(e) => change(d.id, { strengthDay: e.target.value })}>
            {SCHEDULE_STRENGTH.map((o) => <option key={o.id} value={o.id}>{o.id === 'none' ? '筋トレなし' : `筋トレ ${o.label}`}</option>)}
          </select>
          <span />
          <input
            className="input col-span-2 !py-2 text-sm"
            placeholder="メモ(例: 乗艇 / オフ)"
            value={draft[d.id].description}
            onChange={(e) => change(d.id, { description: e.target.value })}
          />
        </div>
      ))}
      <button className="btn" onClick={save}>{saved ? '保存しました' : '週間メニューを保存'}</button>
    </section>
  );
}

// ─── 目標 ───────────────────────────────────────────
function GoalSection() {
  const goals = useLiveQuery(() => db.goals.toArray(), []);
  const [type, setType] = useState('2kTT');
  const [target, setTarget] = useState('');
  const def = GOAL_TYPES.find((g) => g.id === type);

  const add = async () => {
    if (!target) return;
    await db.goals.put({ id: `goal-${Date.now()}`, type, target, createdAt: new Date().toISOString() });
    setTarget('');
  };

  return (
    <section className="card space-y-3">
      <h2 className="label">目標</h2>
      {goals?.length > 0 && (
        <ul className="divide-y divide-line border-y border-line">
          {goals.map((g) => (
            <li key={g.id} className="flex items-center justify-between py-2 text-sm">
              <span>{GOAL_TYPES.find((x) => x.id === g.type)?.label ?? g.type}</span>
              <span className="flex items-center gap-2">
                <b>{g.target}{GOAL_TYPES.find((x) => x.id === g.type)?.unit}</b>
                <button aria-label="目標を削除" className="p-1 text-mute active:text-accent" onClick={() => db.goals.delete(g.id)}>
                  <Trash2 size={16} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-2 gap-2">
        <select className="input text-sm" value={type} onChange={(e) => { setType(e.target.value); setTarget(''); }}>
          {GOAL_TYPES.map((g) => <option key={g.id} value={g.id}>{g.label}</option>)}
        </select>
        <input
          className="input"
          inputMode={def.time ? 'numeric' : 'decimal'}
          placeholder={def.time ? '7:00.0' : `目標 (${def.unit})`}
          value={target}
          onChange={(e) => setTarget(def.time ? formatTimeInput(e.target.value) : e.target.value)}
        />
      </div>
      <button className="w-full rounded-md border border-brand py-2.5 font-semibold text-brand disabled:opacity-35" disabled={!target} onClick={add}>
        目標を追加
      </button>
    </section>
  );
}

// ─── APIキー ────────────────────────────────────────
function ApiKeySection() {
  const [apiKey, setApiKeyState] = useState(getApiKey());
  return (
    <section className="card space-y-3">
      <h2 className="label">AI機能 (Gemini APIキー)</h2>
      <p className="text-xs text-mute">
        エルゴの「写真から読み取る」と、分析の「AIに振り返ってもらう」に使います。キーはこの端末にだけ保存され、
        Google 以外には送信されません。キーは Google AI Studio で発行できます。
      </p>
      <input
        className="input"
        type="password"
        placeholder="AIza..."
        value={apiKey}
        onChange={(e) => {
          setApiKeyState(e.target.value);
          setApiKey(e.target.value);
        }}
      />
      {apiKey && <p className="text-xs text-brand">保存済み</p>}
    </section>
  );
}

// ─── バックアップ ───────────────────────────────────
function BackupSection() {
  const fileRef = useRef(null);
  const [msg, setMsg] = useState('');
  const [last, setLast] = useState(lastBackup());

  const doExport = async () => {
    const blob = new Blob([await exportData()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `rowing-log-${today()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setLast(lastBackup());
  };

  const doImport = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    if (!confirm('今のデータはすべて置き換わります。取り込みますか?')) return;
    try {
      await importData(await file.text());
      setMsg('取り込みました');
    } catch (err) {
      setMsg(`取り込みに失敗しました: ${err.message}`);
    }
  };

  return (
    <section className="card space-y-3">
      <h2 className="label">バックアップ</h2>
      <p className="text-xs text-mute">
        データはこの端末のブラウザ内にだけ保存されます。定期的に書き出しておくと安心です。
        旧アプリの書き出しファイルもそのまま取り込めます。
        {last ? ` 最後の書き出し: ${last}` : ' まだ書き出していません。'}
      </p>
      <button className="btn flex items-center justify-center gap-2" onClick={doExport}>
        <Download size={18} /> データを書き出す
      </button>
      <button
        className="flex w-full items-center justify-center gap-2 rounded-md border border-brand py-3 font-semibold text-brand active:bg-brand-soft"
        onClick={() => fileRef.current.click()}
      >
        <Upload size={18} /> データを取り込む
      </button>
      <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={doImport} />
      {msg && <p className="text-sm text-brand">{msg}</p>}

      <p className="border-t border-line pt-3 text-xs text-mute">
        スマホでは、ブラウザの共有ボタンから「ホーム画面に追加」すると、アプリのように使え、電波がなくても開けます。
      </p>
    </section>
  );
}

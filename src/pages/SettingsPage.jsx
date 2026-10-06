import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { exportData, importData } from '../db.js';
import { today } from '../lib.js';
import { getApiKey, setApiKey } from '../ocr.js';

export default function SettingsPage() {
  const fileRef = useRef(null);
  const [msg, setMsg] = useState('');
  const [apiKey, setApiKeyState] = useState(getApiKey());

  const doExport = async () => {
    const blob = new Blob([await exportData()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `rowing-log-${today()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
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
    <>
      <h1 className="text-xl font-bold">設定</h1>

      <section className="card space-y-3">
        <h2 className="text-sm font-semibold text-slate-500">写真読み取り (Gemini APIキー)</h2>
        <p className="text-xs text-slate-400">
          エルゴ記録の「写真から入力」に使います。キーはこの端末にだけ保存され、Google 以外には送信されません。
          キーは Google AI Studio で発行できます。
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

      <section className="card space-y-3">
        <h2 className="text-sm font-semibold text-slate-500">バックアップ</h2>
        <p className="text-xs text-slate-400">
          データはこの端末のブラウザ内にだけ保存されます。定期的に書き出しておくと安心です。
          旧アプリの書き出しファイルもそのまま取り込めます。
        </p>
        <button className="btn flex items-center justify-center gap-2" onClick={doExport}>
          <Download size={18} /> データを書き出す
        </button>
        <button
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-3 font-semibold text-slate-700 active:bg-slate-50"
          onClick={() => fileRef.current.click()}
        >
          <Upload size={18} /> データを取り込む
        </button>
        <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={doImport} />
        {msg && <p className="text-sm text-brand">{msg}</p>}
      </section>
    </>
  );
}

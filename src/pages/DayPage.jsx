import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronLeft, ChevronRight, Download, Share2, Copy } from 'lucide-react';
import db from '../db.js';
import { useEntries } from '../useEntries.js';
import EntryList from '../EntryList.jsx';
import { groupsOf, dayStats, dayText } from '../rows.js';
import { renderDayImage } from '../dayImage.js';
import { formatDate, toDateStr, today } from '../lib.js';

const shiftDate = (date, n) => {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
};

export default function DayPage({ date, onDate, onEdit }) {
  const entries = useEntries();
  // 取得結果に日付を持たせ、日付が切り替わった直後に前の日の値を取り込まないようにする
  const saved = useLiveQuery(async () => ({ forDate: date, note: (await db.dayNotes.get(date))?.note ?? '' }), [date]);

  // 入力中の文章は手元の state に持ち、止まって0.6秒後に保存する
  const [note, setNote] = useState('');
  const [loadedFor, setLoadedFor] = useState(null);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (saved?.forDate === date && loadedFor !== date) {
      setNote(saved.note);
      setLoadedFor(date);
    }
  }, [saved, date, loadedFor]);

  useEffect(() => {
    if (loadedFor !== date) return;
    const t = setTimeout(() => {
      if (note.trim()) db.dayNotes.put({ date, note, updatedAt: new Date().toISOString() });
      else db.dayNotes.delete(date);
    }, 600);
    return () => clearTimeout(t);
  }, [note, date, loadedFor]);

  if (!entries) return null;

  const dayEntries = entries.filter((e) => e.date === date);
  const stats = dayStats(dayEntries, entries, date);
  const groups = groupsOf(dayEntries);
  const filename = `rowing-log-${date}.png`;
  const canShareFiles = typeof navigator.canShare === 'function' && navigator.canShare({ files: [new File([], 'a.png', { type: 'image/png' })] });

  const flash = (text) => {
    setMsg(text);
    setTimeout(() => setMsg(''), 2500);
  };

  const makeImage = () => renderDayImage({ date, stats, groups, note });

  const download = async () => {
    setBusy(true);
    try {
      const blob = await makeImage();
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
      flash('画像を保存しました');
    } catch (e) {
      flash(e.message);
    } finally {
      setBusy(false);
    }
  };

  const share = async () => {
    setBusy(true);
    try {
      const blob = await makeImage();
      await navigator.share({ files: [new File([blob], filename, { type: 'image/png' })] });
    } catch (e) {
      if (e.name !== 'AbortError') flash(e.message); // 共有画面を閉じただけのときは何も出さない
    } finally {
      setBusy(false);
    }
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(dayText(date, dayEntries, note));
      flash('テキストをコピーしました');
    } catch {
      flash('コピーできませんでした');
    }
  };

  const empty = dayEntries.length === 0 && !note.trim();

  return (
    <>
      <header className="flex items-center justify-between">
        <button onClick={() => onDate(shiftDate(date, -1))} aria-label="前の日" className="p-2 text-brand"><ChevronLeft size={22} /></button>
        <div className="text-center">
          <p className="label">1日のまとめ</p>
          <h1 className="text-xl font-bold tracking-tight">{formatDate(date)}</h1>
        </div>
        <button
          onClick={() => onDate(shiftDate(date, 1))}
          disabled={date >= today()}
          aria-label="次の日"
          className="p-2 text-brand disabled:opacity-25"
        >
          <ChevronRight size={22} />
        </button>
      </header>

      {stats.length > 0 && (
        <div className="flex divide-x divide-line border-y border-line py-3">
          {stats.map((s) => (
            <div key={s.label} className="flex-1 px-3 first:pl-0">
              <p className="text-[11px] text-mute">{s.label}</p>
              <p className="mt-0.5 text-2xl font-bold tracking-tight">
                {s.value}
                <span className="ml-1 text-xs font-normal text-mute">{s.unit}</span>
              </p>
            </div>
          ))}
        </div>
      )}

      {dayEntries.length > 0 ? (
        <EntryList entries={dayEntries} onEdit={(e) => onEdit(e, 'day')} />
      ) : (
        <p className="py-6 text-sm text-mute">この日の記録はありません。</p>
      )}

      <section>
        <h2 className="label mb-1.5">1日のメモ</h2>
        <textarea
          className="input min-h-28 resize-y leading-relaxed"
          placeholder="今日の感想、気づいたこと、明日への課題など"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <p className="mt-1 text-xs text-mute">入力すると自動で保存されます。</p>
      </section>

      <section className="space-y-2">
        <h2 className="label">Slack などに送る</h2>
        <div className="grid grid-cols-2 gap-2">
          <button className="btn flex items-center justify-center gap-2" disabled={busy || empty} onClick={download}>
            <Download size={18} /> 画像を保存
          </button>
          {canShareFiles ? (
            <button
              className="flex items-center justify-center gap-2 rounded-md border border-brand py-3 font-semibold text-brand disabled:opacity-35"
              disabled={busy || empty}
              onClick={share}
            >
              <Share2 size={18} /> 画像を共有
            </button>
          ) : (
            <button
              className="flex items-center justify-center gap-2 rounded-md border border-brand py-3 font-semibold text-brand disabled:opacity-35"
              disabled={empty}
              onClick={copyText}
            >
              <Copy size={18} /> テキストをコピー
            </button>
          )}
        </div>
        {canShareFiles && (
          <button className="w-full rounded-md border border-line py-2.5 text-sm text-mute disabled:opacity-35" disabled={empty} onClick={copyText}>
            テキストをコピー
          </button>
        )}
        <p className="text-xs text-mute">
          スマホでは「画像を共有」から Slack を選ぶと、そのまま投稿できます。
        </p>
      </section>

      {msg && (
        <div className="fixed inset-x-4 bottom-20 mx-auto w-fit max-w-sm rounded-md bg-ink px-4 py-2 text-center text-sm text-white">
          {msg}
        </div>
      )}
    </>
  );
}


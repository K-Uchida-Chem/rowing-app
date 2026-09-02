import { useState, useRef } from 'react';
import { Settings, X, Save, Lock, Database, Upload, Download } from 'lucide-react';
import { getApiKey, setApiKey, hasApiKey } from '../../services/ocrService';
import { exportData, importData } from '../../db/database';

/**
 * API Key settings modal for Gemini API configuration.
 * Key is stored only in localStorage — never sent anywhere except Google's API.
 */
export default function ApiKeySettings({ isOpen, onClose }) {
  const [key, setKey] = useState(getApiKey());
  const [saved, setSaved] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) return null;

  const handleSave = () => {
    setApiKey(key.trim());
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 1500);
  };

  const handleClear = () => {
    setKey('');
    setApiKey('');
  };
  
  const handleExport = async () => {
    try {
      const jsonData = await exportData();
      const blob = new Blob([jsonData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rowpro-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('エクスポートに失敗しました');
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (window.confirm('現在のデータはすべて上書きされます。インポートしてもよろしいですか？')) {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          await importData(e.target.result);
          alert('インポートが完了しました。ページを再読み込みします。');
          window.location.reload();
        } catch (err) {
          alert('インポートに失敗しました。ファイルが壊れている可能性があります。');
        }
      };
      reader.readAsText(file);
    }
    
    // reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      id="api-key-modal"
    >
      <div
        className="w-full max-w-md rounded-2xl p-6"
        style={{
          background: 'var(--color-surface-800)',
          border: '1px solid rgba(56,189,248,0.12)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Settings className="text-[var(--color-accent-primary)]" size={20} />
            <h3 className="text-base font-bold text-[var(--color-text-primary)]">
              各種設定 (API & データ)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-[var(--color-surface-600)] border-none text-[var(--color-text-muted)] cursor-pointer flex items-center justify-center text-sm hover:text-[var(--color-text-primary)] transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Info */}
        <div className="mb-4 px-3 py-2.5 rounded-xl bg-[rgba(56,189,248,0.06)] border border-[rgba(56,189,248,0.1)] flex gap-2">
          <Lock size={14} className="text-[var(--color-text-secondary)] mt-0.5 flex-shrink-0" />
          <p className="text-xs text-[var(--color-text-secondary)] leading-relaxed">
            APIキーはブラウザのLocalStorageに保存され、Google API以外には送信されません。
            <a
              href="https://aistudio.google.com/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[var(--color-accent-primary)] ml-1 underline"
            >
              Google AI Studio でAPIキーを取得 →
            </a>
          </p>
        </div>

        {/* Input */}
        <div className="mb-4">
          <label className="text-[10px] text-[var(--color-text-muted)] font-semibold uppercase tracking-wider mb-1.5 block">
            Gemini API Key
          </label>
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={key}
              onChange={(e) => { setKey(e.target.value); setSaved(false); }}
              placeholder="AIza..."
              className="w-full px-3 py-3 pr-20 rounded-xl bg-[var(--color-surface-700)] border border-[rgba(56,189,248,0.08)] text-[var(--color-text-primary)] text-sm outline-none transition-all duration-200 focus:border-[rgba(56,189,248,0.3)] font-mono"
              id="api-key-input"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg text-[10px] font-medium text-[var(--color-text-muted)] bg-[var(--color-surface-600)] border-none cursor-pointer hover:text-[var(--color-text-secondary)] transition-colors"
            >
              {showKey ? '隠す' : '表示'}
            </button>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center gap-2 mb-5 px-1">
          <div className={`w-2 h-2 rounded-full ${hasApiKey() ? 'bg-[var(--color-accent-success)] pulse-dot' : 'bg-[var(--color-text-muted)]'}`} />
          <span className="text-xs text-[var(--color-text-muted)]">
            {hasApiKey() ? 'APIキー設定済み — OCR機能が利用可能です' : '未設定 — OCR機能を使うにはAPIキーが必要です'}
          </span>
        </div>

        {/* Buttons */}
        <div className="flex gap-3 mb-6">
          <button
            onClick={handleClear}
            className="px-4 py-2.5 rounded-xl text-xs font-medium bg-[var(--color-surface-600)] text-[var(--color-text-secondary)] border border-[rgba(56,189,248,0.06)] cursor-pointer transition-all duration-200 hover:bg-[var(--color-surface-500)]"
          >
            クリア
          </button>
          <button
            onClick={handleSave}
            className={`
              flex flex-1 items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border-none cursor-pointer transition-all duration-200
              ${saved
                ? 'bg-[var(--color-accent-success)] text-white'
                : 'bg-gradient-to-r from-[var(--color-accent-primary)] to-[var(--color-accent-secondary)] text-white hover:opacity-90'
              }
            `}
            id="api-key-save-btn"
          >
            {!saved && <Save size={16} />}
            {saved ? '✓ 保存しました' : '保存'}
          </button>
        </div>

        {/* Divider */}
        <div className="h-px bg-[var(--color-surface-600)] w-full mb-5"></div>

        {/* Backup / Restore Section */}
        <div className="mb-2 flex items-center gap-2">
          <Database size={16} className="text-[var(--color-text-primary)]" />
          <h4 className="text-sm font-bold text-[var(--color-text-primary)]">
            データのバックアップ・復元
          </h4>
        </div>
        <p className="text-[10px] text-[var(--color-text-muted)] mb-4 leading-relaxed">
          すべての記録データをJSONファイルとしてエクスポート・インポートできます。定期的なバックアップを推奨します。
        </p>

        <div className="flex gap-3">
          <button
            onClick={handleExport}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[rgba(56,189,248,0.12)] text-[var(--color-accent-primary)] border border-[rgba(56,189,248,0.2)] hover:bg-[rgba(56,189,248,0.2)] transition-colors"
          >
            エクスポート
          </button>
          
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-[rgba(255,167,38,0.12)] text-[var(--color-accent-warning)] border border-[rgba(255,167,38,0.2)] hover:bg-[rgba(255,167,38,0.2)] transition-colors"
          >
            インポート (上書き)
          </button>
          <input 
            type="file" 
            accept=".json"
            ref={fileInputRef}
            onChange={handleImport}
            style={{ display: 'none' }}
          />
        </div>

      </div>
    </div>
  );
}

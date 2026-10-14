import { Component } from 'react';

// 画面の描画でエラーが起きても、真っ白にせず原因を表示する。
// 表示された文章をそのまま送ってもらえば、原因を調べられる。
export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('画面の描画でエラー', error, info?.componentStack);
  }

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    const detail = [String(error?.message ?? error), ...String(error?.stack ?? '').split('\n').slice(1, 4)].join('\n');
    return (
      <div className="space-y-3 rounded-md border border-accent p-4">
        <h2 className="text-base font-bold text-accent">表示でエラーが起きました</h2>
        <p className="text-sm">記録したデータは消えていません。下の文章を開発者に送ってください。</p>
        <pre className="select-all whitespace-pre-wrap break-all rounded-md bg-white p-3 text-xs">{detail}</pre>
        <div className="flex gap-2">
          <button className="btn" onClick={() => this.setState({ error: null })}>もう一度表示</button>
          <button className="w-full rounded-md border border-brand py-3 font-semibold text-brand" onClick={() => location.reload()}>再読み込み</button>
        </div>
      </div>
    );
  }
}

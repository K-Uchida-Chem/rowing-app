import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: 'white', backgroundColor: '#111827', minHeight: '100vh' }}>
          <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>アプリでエラーが発生しました</h2>
          <p>お手数ですが、以下のエラーメッセージをコピーしてAIにお伝えください：</p>
          <div style={{ 
            backgroundColor: '#1f2937', 
            padding: '1rem', 
            marginTop: '1rem',
            borderRadius: '8px',
            fontFamily: 'monospace',
            fontSize: '12px',
            overflowX: 'auto',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all'
          }}>
            <p style={{ color: '#f87171', fontWeight: 'bold' }}>{this.state.error && this.state.error.toString()}</p>
            <br />
            <p style={{ color: '#9ca3af' }}>{this.state.errorInfo && this.state.errorInfo.componentStack}</p>
          </div>
          <button 
            onClick={() => window.location.reload()}
            style={{ 
              marginTop: '2rem', 
              padding: '0.8rem 1.5rem', 
              backgroundColor: '#38bdf8', 
              color: 'white', 
              border: 'none', 
              borderRadius: '8px',
              fontWeight: 'bold' 
            }}
          >
            アプリを再読み込みする
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;

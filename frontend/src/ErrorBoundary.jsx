import { Component } from 'react';

export class ErrorBoundary extends Component {
  state = { error: null, errorInfo: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('React Error Boundary caught an error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({ error: null, errorInfo: null });
    // Optionally reload the page for a clean state
    if (this.props.resetOnError) {
      window.location.reload();
    }
  };

  render() {
    if (this.state.error) {
      const { error, errorInfo } = this.state;
      return (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: '#0a0a0a',
            color: '#ff5555',
            padding: 24,
            fontFamily: 'monospace',
            overflow: 'auto',
            zIndex: 99999,
          }}
        >
          <h2 style={{ color: '#00ff00', marginTop: 0, marginBottom: 16 }}>
            💀 Wankr crashed
          </h2>
          <div style={{ marginBottom: 16 }}>
            <pre
              style={{
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                background: '#1a1a1a',
                padding: 12,
                borderRadius: 4,
                border: '1px solid #333',
                maxHeight: '40vh',
                overflow: 'auto',
              }}
            >
              {error?.message || String(error)}
            </pre>
          </div>
          {errorInfo?.componentStack && (
            <details style={{ marginBottom: 16, color: '#888' }}>
              <summary style={{ cursor: 'pointer', color: '#aaa', marginBottom: 8 }}>
                Component Stack
              </summary>
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  background: '#1a1a1a',
                  padding: 12,
                  borderRadius: 4,
                  border: '1px solid #333',
                  fontSize: '12px',
                  maxHeight: '30vh',
                  overflow: 'auto',
                }}
              >
                {errorInfo.componentStack}
              </pre>
            </details>
          )}
          <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
            <button
              onClick={this.handleReset}
              style={{
                padding: '8px 16px',
                background: '#00ff00',
                color: '#000',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: 'bold',
                fontFamily: 'monospace',
              }}
            >
              Reset & Reload
            </button>
            <button
              onClick={() => this.setState({ error: null, errorInfo: null })}
              style={{
                padding: '8px 16px',
                background: '#333',
                color: '#fff',
                border: '1px solid #555',
                borderRadius: 4,
                cursor: 'pointer',
                fontFamily: 'monospace',
              }}
            >
              Try Again
            </button>
          </div>
          <p style={{ color: '#888', marginTop: 16, fontSize: '12px' }}>
            Check the browser console (F12) for more details.
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}

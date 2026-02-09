import { Component } from 'react';

export class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('React Error:', error, info);
  }

  render() {
    if (this.state.error) {
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
          }}
        >
          <h2 style={{ color: '#00ff00', marginTop: 0 }}>Wankr crashed</h2>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {this.state.error?.message || String(this.state.error)}
          </pre>
          <p style={{ color: '#888' }}>Check the browser console (F12) for details.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

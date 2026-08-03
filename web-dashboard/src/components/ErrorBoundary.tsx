import { Component, type ReactNode, type ErrorInfo } from 'react';
import { WarningIcon } from '../design-system/icons';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * Global Error Boundary
 * 
 * Catches rendering errors in the component tree and displays
 * a fallback UI instead of a blank white screen.
 * 
 * Without this, React 19 silently unmounts the entire tree on errors.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });
    console.error('[ErrorBoundary] Uncaught rendering error:', error);
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0b111b',
          color: '#e4e4e7',
          fontFamily: "'Inter', 'Noto Sans TC', system-ui, sans-serif",
          padding: '24px',
        }}>
          <div style={{
            maxWidth: '480px',
            textAlign: 'center',
          }}>
            <div style={{ marginBottom: '16px', color: '#fbbf24' }} aria-hidden="true"><WarningIcon size={48} /></div>
            <h1 style={{
              fontSize: '20px',
              fontWeight: 600,
              marginBottom: '8px',
              color: '#fbbf24',
            }}>
              系統載入異常
            </h1>
            <p style={{
              fontSize: '14px',
              color: '#a1a1aa',
              marginBottom: '24px',
              lineHeight: 1.6,
            }}>
              應用程式遇到未預期的錯誤。請嘗試重新載入頁面。
            </p>

            <button
              onClick={this.handleReload}
              style={{
                padding: '10px 24px',
                background: '#fbbf24',
                color: '#0b111b',
                border: 'none',
                borderRadius: '6px',
                fontWeight: 600,
                fontSize: '14px',
                cursor: 'pointer',
              }}
            >
              重新載入
            </button>

            {import.meta.env.DEV && this.state.error && (
              <details style={{
                marginTop: '24px',
                textAlign: 'left',
                background: '#1c1917',
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid #292524',
              }}>
                <summary style={{ cursor: 'pointer', color: '#ef4444', fontSize: '13px' }}>
                  Error Details (dev only)
                </summary>
                <pre style={{
                  marginTop: '8px',
                  fontSize: '11px',
                  color: '#fca5a5',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  overflow: 'auto',
                  maxHeight: '300px',
                }}>
                  {this.state.error.toString()}
                  {'\n\n'}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

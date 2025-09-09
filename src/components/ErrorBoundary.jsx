import React from 'react';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';

const { FiAlertTriangle, FiRefreshCw, FiDownload, FiBug } = FiIcons;

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error info:', errorInfo);
    console.error('Component stack:', errorInfo?.componentStack);
    
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  handleReload = () => {
    window.location.reload();
  };

  handleDownloadDebug = () => {
    try {
      const debugInfo = {
        error: this.state.error ? {
          message: this.state.error.message,
          stack: this.state.error.stack,
          name: this.state.error.name,
          toString: this.state.error.toString()
        } : null,
        errorInfo: this.state.errorInfo ? {
          componentStack: this.state.errorInfo.componentStack
        } : null,
        timestamp: new Date().toISOString(),
        url: window.location.href,
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight
        },
        localStorage: (() => {
          try {
            const ls = {};
            for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.startsWith('investment-')) {
                ls[key] = localStorage.getItem(key);
              }
            }
            return ls;
          } catch (e) {
            return { error: 'Could not access localStorage' };
          }
        })()
      };

      const dataStr = JSON.stringify(debugInfo, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(dataBlob);
      link.download = `investment-property-manager-debug-${new Date().toISOString().slice(0, 19).replace(/[:.]/g, '')}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (downloadError) {
      console.error('Failed to download debug info:', downloadError);
      alert('Failed to download debug info. Check console for details.');
    }
  };

  handleReportBug = () => {
    const subject = encodeURIComponent('Investment Property Manager Pro - Bug Report');
    const body = encodeURIComponent(`
Hi,

I encountered an error in Investment Property Manager Pro:

Error: ${this.state.error?.message || 'Unknown error'}
Timestamp: ${new Date().toISOString()}
URL: ${window.location.href}

Please find the debug file attached.

Thanks!
    `);
    
    window.open(`mailto:Support@bpasolutions.au?subject=${subject}&body=${body}`);
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-gray-800 rounded-lg p-6 text-center">
            <div className="w-16 h-16 bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <SafeIcon icon={FiAlertTriangle} className="w-8 h-8 text-red-400" />
            </div>
            
            <h1 className="text-xl font-bold text-white mb-2">
              Oops! Something went wrong
            </h1>
            
            <p className="text-gray-400 mb-6">
              The application encountered an unexpected error. Don't worry, your data is safe.
            </p>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mb-6 p-3 bg-red-900/20 border border-red-700 rounded text-left">
                <p className="text-red-400 text-sm font-medium mb-2">Error Details:</p>
                <p className="text-red-300 text-xs font-mono">
                  {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <details className="mt-2">
                    <summary className="text-red-400 text-xs cursor-pointer">Stack Trace</summary>
                    <pre className="text-red-300 text-xs mt-1 overflow-auto max-h-32">
                      {this.state.error.stack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={this.handleReload}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
              >
                <SafeIcon icon={FiRefreshCw} className="w-4 h-4" />
                <span>Reload Application</span>
              </button>

              <div className="flex space-x-2">
                <button
                  onClick={this.handleDownloadDebug}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <SafeIcon icon={FiDownload} className="w-4 h-4" />
                  <span>Download Debug Info</span>
                </button>

                <button
                  onClick={this.handleReportBug}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <SafeIcon icon={FiBug} className="w-4 h-4" />
                  <span>Report a Bug</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
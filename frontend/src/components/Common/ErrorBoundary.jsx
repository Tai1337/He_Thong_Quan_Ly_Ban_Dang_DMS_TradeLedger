import React from 'react';
import './ErrorBoundary.css';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary-container">
          <div className="error-boundary-card">
            <div className="error-boundary-icon">⚠️</div>
            <h2>Đã xảy ra lỗi giao diện</h2>
            <p className="error-boundary-message">
              {this.state.error?.message || 'Không thể hiển thị thành phần này.'}
            </p>
            <div className="error-boundary-actions">
              <button 
                type="button" 
                className="btn-reload"
                onClick={() => window.location.reload()}
              >
                Tải lại trang
              </button>
              <button 
                type="button" 
                className="btn-home"
                onClick={() => {
                  this.setState({ hasError: false, error: null });
                  window.location.href = '/';
                }}
              >
                Về Trang chủ
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;

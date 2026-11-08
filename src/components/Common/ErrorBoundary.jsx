import React from 'react';
import { AlertOctagon, RotateCcw } from 'lucide-react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary caught error]:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-2xl border border-rose-200 p-8 shadow-lg text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
              <AlertOctagon className="w-6 h-6" />
            </div>

            <h1 className="text-base font-bold text-slate-900">
              Đã xảy ra sự cố hiển thị giao diện
            </h1>

            <p className="text-xs text-slate-600 leading-relaxed">
              Ứng dụng gặp lỗi không mong muốn trong quá trình xử lý giao diện. Vui lòng thử tải lại trang hoặc đăng nhập lại.
            </p>

            {this.state.error && (
              <div className="bg-slate-50 rounded-lg p-3 text-left border border-slate-200 overflow-x-auto text-[11px] font-mono text-rose-700 max-h-32">
                {this.state.error.message || String(this.state.error)}
              </div>
            )}

            <button
              onClick={this.handleReload}
              className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Tải lại trang</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}


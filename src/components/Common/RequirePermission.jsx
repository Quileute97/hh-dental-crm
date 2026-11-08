import React from 'react';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { can } from '../../config/permissions';

/**
 * RequirePermission: Bọc các view/tab yêu cầu quyền hạn cụ thể
 * Khi thiếu quyền: hiển thị màn hình thông báo rõ ràng bằng tiếng Việt + nút quay lại.
 * 
 * @param {string} role - Vai trò của người dùng hiện tại
 * @param {string} action - Hành động cần kiểm tra quyền
 * @param {React.ReactNode} children - Nội dung khi có đủ quyền
 * @param {function} onBack - Hàm quay lại Dashboard
 */
export default function RequirePermission({ role, action, children, onBack }) {
  const isAllowed = can(role, action);

  if (!isAllowed) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center max-w-md mx-auto">
        <div className="w-14 h-14 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4 shadow-xs">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1.5">
          Bạn không có quyền truy cập mục này
        </h3>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          Tài khoản với vai trò <strong className="font-semibold text-slate-700 capitalize">"{role || 'khách'}"</strong> không được phân quyền thực hiện chức năng <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded text-[11px] font-mono">{action}</code>. Vui lòng liên hệ quản trị viên để được cấp quyền.
        </p>
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg shadow-xs transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Quay lại Bảng điều khiển
          </button>
        )}
      </div>
    );
  }

  return <>{children}</>;
}

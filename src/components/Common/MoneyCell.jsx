import React from 'react';
import { formatVND } from '../../utils/formatters';

/**
 * MoneyCell: Hiển thị giá trị tiền tệ VND hoặc ẩn "—" khi người dùng không có quyền xem
 * 
 * @param {number} value - Số tiền cần hiển thị
 * @param {boolean} visible - Quyền xem (mặc định: true)
 * @param {string} className - Lớp CSS tùy biến
 * @param {string} fallback - Ký hiệu khi không có quyền (mặc định: '—')
 */
export default function MoneyCell({ value = 0, visible = true, className = '', fallback = '—' }) {
  if (!visible) {
    return <span className={`text-slate-400 font-mono select-none ${className}`}>{fallback}</span>;
  }
  return <span className={className}>{formatVND(value)}</span>;
}


import React from 'react';
import { X, ClipboardList, CheckCircle2, ShieldAlert, ArrowRight } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';

export default function AuditLogModal({ isOpen, onClose, logs }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-lg border border-slate-200 max-w-2xl w-full overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-100 flex flex-col max-h-[85vh]">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
              <ClipboardList className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-sm">
                Sổ Kiểm Toán Bất Biến (Immutable Audit Log)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Nhật ký ghi vết giao dịch, tính hoa hồng và phân cấp đối tác trên server backend
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex-1 overflow-y-auto space-y-2.5 text-xs">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              Chưa có bản ghi nhật ký kiểm toán nào.
            </div>
          ) : (
            logs.map((log, index) => (
              <div
                key={index}
                className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors flex items-start justify-between gap-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200 text-[11px]">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-slate-500 font-medium">
                      Đối tượng: <strong className="text-slate-700">{log.entity}</strong>
                    </span>
                    <span className="text-[10px] text-slate-400">• Người thực hiện: {log.operator}</span>
                  </div>
                  <div className="text-[11px] text-slate-600 mt-1 font-mono bg-white p-2 rounded border border-slate-100">
                    {JSON.stringify(log.details)}
                  </div>
                </div>

                <div className="text-right text-[10px] text-slate-400 font-mono shrink-0">
                  {formatDateTime(log.timestamp)}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-between shrink-0 text-xs text-slate-500">
          <span>Ghi đè file bất biến: <code>server/data/audit.log</code></span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}


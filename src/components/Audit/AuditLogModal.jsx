import React, { useState, useMemo } from 'react';
import { X, ClipboardList, Download, Filter, ChevronDown, ChevronRight, Calendar, User } from 'lucide-react';
import { formatDateTime } from '../../utils/formatters';
import { exportAuditLogsToCSV } from '../../services/exportService';

export default function AuditLogModal({ isOpen, onClose, logs = [], currentUserRole = 'admin' }) {
  const [selectedEntity, setSelectedEntity] = useState('ALL');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const isAdmin = currentUserRole === 'admin';

  // Lọc logs theo điều kiện
  const filteredLogs = useMemo(() => {
    return (logs || []).filter(log => {
      const entity = (log.entity || '').toUpperCase();
      if (selectedEntity !== 'ALL' && entity !== selectedEntity) {
        return false;
      }

      const logDate = new Date(log.created_at || log.timestamp || Date.now());
      if (startDate) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        if (logDate < start) return false;
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        if (logDate > end) return false;
      }

      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const action = (log.action || '').toLowerCase();
        const entityId = (log.entity_id || log.entityId || '').toLowerCase();
        const actor = (log.actor || log.operator || '').toLowerCase();
        const payloadStr = JSON.stringify(log.payload || log.details || '').toLowerCase();
        if (!action.includes(term) && !entityId.includes(term) && !actor.includes(term) && !payloadStr.includes(term)) {
          return false;
        }
      }

      return true;
    });
  }, [logs, selectedEntity, startDate, endDate, searchTerm]);

  if (!isOpen) return null;

  const toggleExpand = (idx) => {
    setExpandedRow(prev => prev === idx ? null : idx);
  };

  const getActionBadgeClass = (action) => {
    const act = (action || '').toUpperCase();
    if (act.includes('INSERT') || act.includes('CREATE')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (act.includes('UPDATE')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (act.includes('DELETE')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (act.includes('SETTLE')) {
      return 'bg-purple-50 text-purple-700 border-purple-200';
    }
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-xl border border-slate-200 max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col my-4 sm:my-6 max-h-[94vh] sm:max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 flex items-center justify-between shrink-0 bg-slate-50/70">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-8 sm:w-9 h-8 sm:h-9 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shadow-xs shrink-0">
              <ClipboardList className="w-4 sm:w-5 h-4 sm:h-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                <h3 className="font-bold text-slate-900 text-sm">
                  Nhật Ký Kiểm Toán Hệ Thống (Audit Logs)
                </h3>
                <span className="px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                  PostgreSQL Triggers
                </span>
                {!isAdmin && (
                  <span className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded">
                    Chế độ xem (Read-only)
                  </span>
                )}
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 mt-0.5">
                Ghi vết tự động mọi biến động trên các bảng customers, visits, partners, settlements
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 sm:w-8 h-7 sm:h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Toolbar */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 bg-white grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3 text-xs">
          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Đối tượng (Entity)</label>
            <select
              value={selectedEntity}
              onChange={(e) => setSelectedEntity(e.target.value)}
              className="w-full px-2.5 py-2 sm:py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700 text-base sm:text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="ALL">Tất cả đối tượng</option>
              <option value="CUSTOMERS">Khách hàng (customers)</option>
              <option value="VISITS">Lượt khám (visits)</option>
              <option value="PARTNERS">Đối tác (partners)</option>
              <option value="SETTLEMENTS">Quyết toán (settlements)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Từ ngày</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-2.5 py-2 sm:py-1.5 border border-slate-300 rounded-lg text-slate-700 text-base sm:text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Đến ngày</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-2.5 py-2 sm:py-1.5 border border-slate-300 rounded-lg text-slate-700 text-base sm:text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-500 mb-1">Tìm kiếm từ khóa</label>
            <input
              type="text"
              placeholder="Action, ID, Actor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2.5 py-2 sm:py-1.5 border border-slate-300 rounded-lg text-slate-700 text-base sm:text-xs focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-16 text-slate-400">
              <ClipboardList className="w-10 h-10 mx-auto text-slate-300 mb-2 stroke-1" />
              <p className="text-sm font-medium text-slate-500">Chưa có nhật ký kiểm toán phù hợp</p>
              <p className="text-xs text-slate-400 mt-1">Các thay đổi dữ liệu từ trigger Postgres sẽ xuất hiện tại đây.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredLogs.map((log, index) => {
                const isExpanded = expandedRow === index;
                const dateStr = log.created_at || log.timestamp;
                const payload = log.payload || log.details || {};
                const entityId = log.entity_id || log.entityId || '—';
                const actor = log.actor || log.operator || 'Hệ thống';

                return (
                  <div key={log.id || index} className="hover:bg-slate-50/70 transition-colors">
                    <div 
                      onClick={() => toggleExpand(index)}
                      className="px-3.5 sm:px-6 py-2.5 sm:py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4 cursor-pointer text-xs"
                    >
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <button type="button" className="text-slate-400 hover:text-slate-600 shrink-0">
                          {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                        <span className={`px-2 py-0.5 font-mono text-[10px] sm:text-[11px] font-bold rounded border shrink-0 ${getActionBadgeClass(log.action)}`}>
                          {log.action}
                        </span>
                        <span className="font-semibold text-slate-800 shrink-0">
                          {log.entity}
                        </span>
                        <span className="font-mono text-slate-500 truncate max-w-[140px] text-[10px] sm:text-[11px]" title={entityId}>
                          ID: {entityId}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 sm:gap-4 shrink-0 text-[10px] sm:text-[11px] text-slate-500 pl-6 sm:pl-0">
                        <span className="flex items-center gap-1 text-slate-600 truncate max-w-[150px]" title={actor}>
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{actor}</span>
                        </span>
                        <span className="font-mono text-slate-400 shrink-0">
                          {dateStr ? formatDateTime(dateStr) : '—'}
                        </span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="px-4 sm:px-12 py-3 bg-slate-900 text-slate-200 border-t border-slate-800 text-[11px] font-mono overflow-x-auto">
                        <div className="text-[10px] text-slate-400 mb-1 flex items-center justify-between">
                          <span>Chi tiết thay đổi dữ liệu (Payload):</span>
                          <span>Độ dài: {JSON.stringify(payload).length} ký tự</span>
                        </div>
                        <pre className="p-2.5 bg-slate-950 rounded-lg overflow-x-auto text-emerald-400 border border-slate-800">
                          {JSON.stringify(payload, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 sm:px-6 py-3 border-t border-slate-200 bg-slate-50 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 shrink-0 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span>Hiển thị <strong>{filteredLogs.length}</strong> / {logs.length} bản ghi</span>
            <span>• <code>audit_logs</code></span>
          </div>
          <div className="flex items-center justify-end gap-2">
            {isAdmin && (
              <button
                type="button"
                onClick={() => exportAuditLogsToCSV(filteredLogs)}
                disabled={filteredLogs.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-700 bg-white border border-sky-300 hover:bg-sky-50 rounded-lg transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-3.5 h-3.5" />
                Xuất CSV ({filteredLogs.length})
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

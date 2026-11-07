import React from 'react';
import { AlertTriangle, Server, ExternalLink } from 'lucide-react';

export default function MissingConfigScreen() {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center">
        <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
          <AlertTriangle className="w-6 h-6" />
        </div>

        <h1 className="text-lg font-bold text-slate-900 mb-2">
          Thiếu cấu hình Supabase — liên hệ quản trị
        </h1>

        <p className="text-xs text-slate-600 leading-relaxed mb-6">
          Hệ thống không tìm thấy biến môi trường <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono">VITE_SUPABASE_URL</code> hoặc <code className="bg-slate-100 text-slate-800 px-1 py-0.5 rounded font-mono">VITE_SUPABASE_ANON_KEY</code> tại thời điểm khởi tạo ứng dụng.
        </p>

        <div className="bg-slate-50 rounded-xl p-4 text-left border border-slate-200 text-xs text-slate-700 space-y-2 mb-6">
          <div className="font-semibold text-slate-900 flex items-center gap-1.5">
            <Server className="w-3.5 h-3.5 text-sky-600" />
            <span>Hướng dẫn cấu hình trên Cloudflare:</span>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-slate-600 text-[11px]">
            <li>Mở Cloudflare Dashboard &rarr; Workers &amp; Pages.</li>
            <li>Chọn dự án &rarr; <strong>Settings</strong> &rarr; <strong>Variables and Secrets</strong>.</li>
            <li>Thêm biến môi trường:
              <ul className="list-disc list-inside pl-3 mt-1 font-mono text-[10px] text-slate-800">
                <li>VITE_SUPABASE_URL</li>
                <li>VITE_SUPABASE_ANON_KEY</li>
              </ul>
            </li>
            <li>Kích hoạt <strong>Re-deploy</strong> lại dự án.</li>
          </ol>
        </div>

        <p className="text-[11px] text-slate-400">
          HH Dental Clinic &bull; Multi-level Partner &amp; Customer System
        </p>
      </div>
    </div>
  );
}


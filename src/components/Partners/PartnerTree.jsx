import React, { useState } from 'react';
import { 
  Network, 
  ChevronDown, 
  ChevronRight, 
  User, 
  Phone, 
  CreditCard, 
  Building2, 
  Plus, 
  Coins,
  ShieldCheck,
  CheckCircle2,
  GitFork
} from 'lucide-react';
import { buildPartnerTree } from '../../services/commissionEngine';
import { formatVND } from '../../utils/formatters';
import { useAuth } from '../../context/AuthContext';
import { can } from '../../config/permissions';

export default function PartnerTree({ 
  partners, 
  settlementResult, 
  onAddPartner, 
  onSelectPartner 
}) {
  const { role } = useAuth();
  const treeRoots = buildPartnerTree(partners);

  return (
    <div className="space-y-4">
      {/* Policy banner */}
      <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center shrink-0">
            <Network className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sky-900 text-sm">Cây Phả Hệ Đối Tác Không Giới Hạn Tầng (Plan V5)</h3>
            <p className="text-sky-700 mt-0.5">
              Cơ chế phí nhánh: Cấp trên nhận <strong>1% doanh thu trên toàn bộ cây con trực tiếp</strong>. Không giới hạn số tầng.
            </p>
          </div>
        </div>
        {can(role, 'managePartners') && (
          <button
            onClick={() => onAddPartner()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white font-semibold rounded shadow-sm transition-colors shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm đối tác gốc mới</span>
          </button>
        )}
      </div>

      {/* Tree container */}
      <div className="bg-white border border-slate-200 rounded-lg p-6 overflow-x-auto min-h-[480px]">
        {treeRoots.length === 0 ? (
          <div className="text-center py-12 text-slate-400 text-sm">
            Chưa có đối tác nào trong cây phả hệ.
          </div>
        ) : (
          <div className="space-y-6">
            {treeRoots.map(rootNode => (
              <TreeNode
                key={rootNode.id}
                node={rootNode}
                settlementResult={settlementResult}
                onSelectPartner={onSelectPartner}
                onAddSubPartner={(parentId) => onAddPartner(parentId)}
                canManagePartners={can(role, 'managePartners')}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TreeNode({ node, settlementResult, onSelectPartner, onAddSubPartner, canManagePartners }) {
  const [isExpanded, setIsExpanded] = useState(true);

  const row = settlementResult?.partnerRows?.find(r => r.partnerId === node.id) || {
    ownRevenue: 0,
    branchRevenue: 0,
    commission: 0,
    branchFee: 0,
    total: 0,
    isSettled: false
  };

  const hasChildren = node.children && node.children.length > 0;
  const depth = node.depth !== undefined ? node.depth : 0;

  return (
    <div className="relative pl-6 border-l-2 border-slate-200 ml-3">
      {/* Node card */}
      <div className="inline-block min-w-[360px] max-w-[440px] bg-white border border-slate-200 hover:border-sky-300 rounded-lg p-3.5 transition-all text-xs mb-3 shadow-xs">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {hasChildren ? (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-5 h-5 rounded hover:bg-slate-100 flex items-center justify-center text-slate-500"
                title={isExpanded ? 'Thu gọn nhánh' : 'Mở rộng nhánh'}
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            ) : (
              <div className="w-5 h-5 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              </div>
            )}

            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-slate-900 text-sm hover:text-sky-700 cursor-pointer" onClick={() => onSelectPartner(node)}>
                  {node.name}
                </span>
                <span className="text-[10px] bg-sky-50 text-sky-700 font-mono px-1.5 py-0.2 rounded border border-sky-200">
                  {node.code}
                </span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {node.title || (depth === 0 ? 'Bác sĩ Sáng lập' : `Đối tác Tuyến ${depth}`)}
              </div>
            </div>
          </div>

          {/* Depth badge */}
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            Độ sâu: {depth}
          </span>
        </div>

        {/* Finance Snapshot for the Period */}
        <div className="mt-3 pt-2.5 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px]">
          <div className="bg-slate-50 p-2 rounded">
            <span className="text-slate-500 block text-[10px]">Sổ khách kỳ:</span>
            <span className="font-bold text-slate-800">{formatVND(row.ownRevenue)}</span>
          </div>
          <div className="bg-sky-50/60 p-2 rounded">
            <span className="text-sky-700 block text-[10px]">Doanh thu toàn nhánh:</span>
            <span className="font-bold text-sky-900">{formatVND(row.branchRevenue)}</span>
          </div>
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] px-1">
          <div className="text-slate-600">
            <span>Hoa hồng CTV: <strong>{formatVND(row.commission)}</strong></span>
            {row.branchFee > 0 && (
              <span className="text-amber-700 ml-1.5">+ Phí 1%: <strong>{formatVND(row.branchFee)}</strong></span>
            )}
          </div>
          <div className="font-bold text-slate-900 text-xs">
            Tổng: <span className="text-sky-700">{formatVND(row.total)}</span>
          </div>
        </div>

        {/* Action bar on node */}
        <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
          <span className="text-slate-400 font-mono text-[10px]">{node.phone}</span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onSelectPartner(node)}
              className="text-slate-500 hover:text-slate-800 px-2 py-0.5 rounded hover:bg-slate-100 font-medium"
            >
              Chi tiết
            </button>
            {canManagePartners && (
              <button
                onClick={() => onAddSubPartner(node.id)}
                className="inline-flex items-center gap-1 text-sky-600 hover:text-sky-700 bg-sky-50 hover:bg-sky-100 px-2 py-0.5 rounded font-semibold transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Thêm con</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Children nodes (collapsible) */}
      {hasChildren && isExpanded && (
        <div className="space-y-1">
          {node.children.map(childNode => (
            <TreeNode
              key={childNode.id}
              node={childNode}
              settlementResult={settlementResult}
              onSelectPartner={onSelectPartner}
              onAddSubPartner={onAddSubPartner}
              canManagePartners={canManagePartners}
            />
          ))}
        </div>
      )}
    </div>
  );
}

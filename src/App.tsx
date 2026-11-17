import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, X } from 'lucide-react';
import type {
  AppStateResponse,
  DashboardPeriodFilter,
  HydratedPart,
  KpiWindowDays,
  PhuTung,
  TransactionType,
  UserRole,
} from './types/inventory';
import { api, type UserContext } from './services/api';
import { Layout, type NavTab } from './components/Layout';
import { DashboardPage } from './components/DashboardPage';
import { PartsPage } from './components/PartsPage';
import { TransactionsPage } from './components/TransactionsPage';
import { KpiAnalysisPage } from './components/KpiAnalysisPage';
import { ProposalsOrdersPage } from './components/ProposalsOrdersPage';
import { AlertsHistoryPage } from './components/AlertsHistoryPage';
import { SettingsSyncPage } from './components/SettingsSyncPage';
import { PartDetailModal } from './components/PartDetailModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [role, setRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem('tienthu_role');
    return saved === 'QUAN_LY' ? 'QUAN_LY' : 'NHAN_VIEN_KHO';
  });
  const [period, setPeriod] = useState<DashboardPeriodFilter>('month');
  const [kpiDays, setKpiDays] = useState<KpiWindowDays>(30);
  const [searchQuery, setSearchQuery] = useState('');

  const [state, setState] = useState<AppStateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState(false);

  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [txPreselectedPart, setTxPreselectedPart] = useState<string | null>(null);
  const [txPreselectedMode, setTxPreselectedMode] = useState<TransactionType>('XUAT_KHO');
  const [toast, setToast] = useState<{ type: 'success' | 'warning'; text: string } | null>(null);

  const userContext: UserContext = {
    role,
    name: role === 'QUAN_LY' ? 'Nguyễn Thị Lan (Quản lý)' : 'Trần Văn Nam (Nhân viên kho)',
  };

  const handleRoleChange = (nextRole: UserRole) => {
    setRole(nextRole);
    localStorage.setItem('tienthu_role', nextRole);
    setToast({
      type: 'success',
      text: `Đã chuyển vai trò vận hành sang: ${
        nextRole === 'QUAN_LY' ? 'Quản lý trung tâm' : 'Nhân viên kho'
      }.`,
    });
  };

  const refreshState = useCallback(
    async (p: DashboardPeriodFilter = period, d: KpiWindowDays = kpiDays) => {
      try {
        setLoadError(null);
        const data = await api.getState(p, d);
        setState(data);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : 'Không thể tải dữ liệu tồn kho.');
      } finally {
        setLoading(false);
      }
    },
    [period, kpiDays]
  );

  useEffect(() => {
    refreshState(period, kpiDays);
  }, [period, kpiDays, refreshState]);

  const selectedPart: HydratedPart | null =
    state && selectedPartId
      ? state.parts.find((p) => p.id === selectedPartId) || null
      : null;

  const handleQuickDemoIssuePT001 = async () => {
    setBusyAction(true);
    try {
      const res = await api.createTransaction(
        {
          phuTungId: 'PT001',
          loaiGiaoDich: 'XUAT_KHO',
          soLuong: 6,
          ngayGiaoDich: new Date().toISOString().slice(0, 10),
          maChungTu: 'PBH-DEMO-PT001',
          lyDo: 'Kịch bản kiểm thử BPMN To-Be: Xuất kho 6 bộ má phanh PT001',
        },
        userContext
      );
      await refreshState();
      setToast({
        type: 'warning',
        text: `Đã xuất 6 bộ PT001 (${res.oldStock} → ${res.newStock} bộ). Phát hiện ≤ ROP → Đổi trạng thái "Cần đặt hàng"${
          res.autoProposalCreated
            ? ` và tự động tạo đề xuất ${res.autoProposalCreated.maDeXuat} (${res.autoProposalCreated.soLuongDeXuat} bộ).`
            : '.'
        }`,
      });
    } catch (err) {
      setToast({
        type: 'warning',
        text: err instanceof Error ? err.message : 'Không thể thực hiện xuất kho thử nghiệm.',
      });
    } finally {
      setBusyAction(false);
    }
  };

  const handleResetDemo = async () => {
    setBusyAction(true);
    try {
      await api.resetDemo(userContext);
      await refreshState();
      setToast({
        type: 'success',
        text: 'Đã khôi phục dữ liệu mẫu ban đầu (PT001 = 20 bộ, ADD = 2, LT = 5, SS = 5, ROP = 15).',
      });
    } finally {
      setBusyAction(false);
    }
  };

  if (loading && !state) {
    return (
      <div className="min-h-screen bg-[#F6F7F9] flex items-center justify-center p-6">
        <div className="bg-white border border-zinc-200 rounded-xl p-6 max-w-sm w-full text-center space-y-3">
          <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-sm font-bold text-zinc-900">
            Đang tải dữ liệu tồn kho Tiến Thu...
          </div>
          <div className="text-xs text-zinc-500">
            Đang đồng bộ danh mục phụ tùng và tính toán các chỉ số KPI
          </div>
        </div>
      </div>
    );
  }

  if (loadError && !state) {
    return (
      <div className="min-h-screen bg-[#F6F7F9] flex items-center justify-center p-6">
        <div className="bg-white border border-red-200 rounded-xl p-6 max-w-md w-full text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-red-600 mx-auto" />
          <div className="text-sm font-bold text-zinc-900">Không thể kết nối máy chủ</div>
          <div className="text-xs text-zinc-600">{loadError}</div>
          <button
            type="button"
            onClick={() => refreshState()}
            className="h-9 px-4 rounded-lg bg-orange-600 text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Thử lại
          </button>
        </div>
      </div>
    );
  }

  if (!state) return null;

  const pendingProposalsCount = state.proposals.filter(
    (p) => p.trangThai === 'CHO_DUYET'
  ).length;

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      role={role}
      onRoleChange={handleRoleChange}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      alerts={state.alerts}
      pendingProposalsCount={pendingProposalsCount}
      onMarkAlertsRead={async () => {
        await api.markAlertsRead();
        await refreshState();
      }}
      onQuickTransaction={() => {
        setTxPreselectedMode('XUAT_KHO');
        setActiveTab('transactions');
      }}
    >
      {toast && (
        <div
          className={`mb-5 p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between gap-3 ${
            toast.type === 'warning'
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'warning' ? (
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            )}
            <span>{toast.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="p-1 text-zinc-500 hover:text-zinc-900"
            aria-label="Đóng thông báo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {activeTab === 'dashboard' && (
        <DashboardPage
          state={state}
          period={period}
          onPeriodChange={setPeriod}
          kpiDays={kpiDays}
          onKpiDaysChange={setKpiDays}
          onSelectPart={(p) => setSelectedPartId(p.id)}
          onGoToProposals={() => setActiveTab('proposals')}
          onQuickDemoIssuePT001={handleQuickDemoIssuePT001}
          onResetDemo={handleResetDemo}
          busyAction={busyAction}
        />
      )}

      {activeTab === 'parts' && (
        <PartsPage
          state={state}
          role={role}
          searchQuery={searchQuery}
          onSelectPart={(p) => setSelectedPartId(p.id)}
          onCreatePart={async (payload: Partial<PhuTung>) => {
            await api.createPart(payload, userContext);
            await refreshState();
          }}
          onUpdatePart={async (id, payload) => {
            await api.updatePart(id, payload, userContext);
            await refreshState();
          }}
          onDeletePart={async (id) => {
            try {
              await api.deletePart(id, userContext);
              await refreshState();
              setToast({ type: 'success', text: `Đã xóa phụ tùng ${id} khỏi danh mục.` });
            } catch (err) {
              setToast({
                type: 'warning',
                text: err instanceof Error ? err.message : 'Không thể xóa phụ tùng.',
              });
            }
          }}
        />
      )}

      {activeTab === 'transactions' && (
        <TransactionsPage
          state={state}
          preselectedPartId={txPreselectedPart}
          preselectedMode={txPreselectedMode}
          onCreateTransaction={async (payload) => {
            const res = await api.createTransaction(payload, userContext);
            await refreshState();
            return res;
          }}
          onRecordShortageRequest={async (payload) => {
            await api.createPartRequest(payload, userContext);
            await refreshState();
          }}
        />
      )}

      {activeTab === 'kpi' && (
        <KpiAnalysisPage
          state={state}
          role={role}
          kpiDays={kpiDays}
          onKpiDaysChange={setKpiDays}
          onUpdatePart={async (id, payload) => {
            await api.updatePart(id, payload, userContext);
            await refreshState();
          }}
          onSelectPart={(p) => setSelectedPartId(p.id)}
        />
      )}

      {activeTab === 'proposals' && (
        <ProposalsOrdersPage
          state={state}
          role={role}
          onCreateProposal={async (payload) => {
            await api.createProposal(payload, userContext);
            await refreshState();
          }}
          onUpdateProposal={async (id, payload) => {
            await api.updateProposal(id, payload, userContext);
            await refreshState();
          }}
          onApproveProposal={async (id) => {
            await api.approveProposal(id, userContext);
            await refreshState();
          }}
          onRejectProposal={async (id, reason) => {
            await api.rejectProposal(id, reason, userContext);
            await refreshState();
          }}
          onConvertProposalToOrder={async (id) => {
            await api.convertProposalToOrder(id, userContext);
            await refreshState();
          }}
          onReceiveOrder={async (id) => {
            await api.receiveOrder(id, userContext);
            await refreshState();
          }}
          onCancelOrder={async (id) => {
            await api.cancelOrder(id, userContext);
            await refreshState();
          }}
        />
      )}

      {activeTab === 'alerts' && (
        <AlertsHistoryPage
          state={state}
          onMarkAlertsRead={async () => {
            await api.markAlertsRead();
            await refreshState();
          }}
          onResolveAlert={async (id) => {
            await api.resolveAlert(id);
            await refreshState();
          }}
          onTestEmail={async () => {
            await api.testEmailAlert(userContext);
          }}
          onGoToSettings={() => setActiveTab('settings')}
        />
      )}

      {activeTab === 'settings' && (
        <SettingsSyncPage
          state={state}
          role={role}
          onCreateSupplier={async (payload) => {
            await api.createSupplier(payload, userContext);
            await refreshState();
          }}
          onUpdateConfig={async (payload) => {
            await api.updateConfig(payload, userContext);
            await refreshState();
          }}
          onSyncGoogleSheets={async () => {
            await api.syncGoogleSheets(userContext);
            await refreshState();
          }}
          onResetDemo={handleResetDemo}
        />
      )}

      <PartDetailModal
        part={selectedPart}
        transactions={state.transactions}
        onClose={() => setSelectedPartId(null)}
        onCreateTransaction={(partId, mode) => {
          setSelectedPartId(null);
          setTxPreselectedPart(partId);
          setTxPreselectedMode(mode);
          setActiveTab('transactions');
        }}
      />
    </Layout>
  );
}

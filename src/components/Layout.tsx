import React, { useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  BarChart3,
  Bell,
  Calculator,
  ClipboardList,
  Database,
  Menu,
  Package,
  Search,
  ShieldCheck,
  User,
  X,
} from 'lucide-react';
import type { CanhBaoTonKho, UserRole } from '../types/inventory';
import { formatDateTime } from '../lib/format';

export type NavTab =
  | 'dashboard'
  | 'parts'
  | 'transactions'
  | 'kpi'
  | 'proposals'
  | 'alerts'
  | 'settings';

interface LayoutProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  role: UserRole;
  onRoleChange: (role: UserRole) => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  alerts: CanhBaoTonKho[];
  pendingProposalsCount: number;
  onMarkAlertsRead: () => void;
  onQuickTransaction: () => void;
  children: React.ReactNode;
}

export function Layout({
  activeTab,
  onTabChange,
  role,
  onRoleChange,
  searchQuery,
  onSearchChange,
  alerts,
  pendingProposalsCount,
  onMarkAlertsRead,
  onQuickTransaction,
  children,
}: LayoutProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);

  const unreadAlerts = alerts.filter((a) => !a.daDoc);
  const activeAlerts = alerts.filter((a) => !a.daXuLy);

  const navItems: Array<{
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }> = [
    { id: 'dashboard', label: 'Tổng quan', icon: BarChart3 },
    { id: 'parts', label: 'Danh mục phụ tùng', icon: Package },
    { id: 'transactions', label: 'Nhập – Xuất kho', icon: ArrowLeftRight },
    { id: 'kpi', label: 'Phân tích KPI & Công thức', icon: Calculator },
    {
      id: 'proposals',
      label: 'Đề xuất & Đơn đặt hàng',
      icon: ClipboardList,
      badge: pendingProposalsCount > 0 ? pendingProposalsCount : undefined,
    },
    {
      id: 'alerts',
      label: 'Thông báo & Lịch sử',
      icon: AlertTriangle,
      badge: activeAlerts.length > 0 ? activeAlerts.length : undefined,
    },
    { id: 'settings', label: 'Nhà cung cấp & Đồng bộ', icon: Database },
  ];

  const userName =
    role === 'QUAN_LY' ? 'Nguyễn Thị Lan' : 'Trần Văn Nam';
  const roleLabel = role === 'QUAN_LY' ? 'Quản lý trung tâm' : 'Nhân viên kho';

  const handleNavClick = (id: NavTab) => {
    onTabChange(id);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen flex bg-[#F6F7F9] text-zinc-900">
      {/* Mobile Sidebar Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-zinc-950/50 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-zinc-900 text-zinc-100 flex flex-col border-r border-zinc-800 transition-transform duration-200 lg:static lg:translate-x-0 shrink-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Lockup */}
        <div className="h-16 px-5 flex items-center justify-between border-b border-zinc-800 shrink-0">
          <button
            type="button"
            onClick={() => handleNavClick('dashboard')}
            className="flex items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 rounded"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shrink-0">
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5 text-zinc-950"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
            <div>
              <div className="text-sm font-bold tracking-tight text-white leading-tight">
                TIẾN THU
              </div>
              <div className="text-[11px] text-zinc-400 leading-tight mt-0.5">
                Dịch vụ & Bảo hành
              </div>
            </div>
          </button>
          <button
            type="button"
            className="lg:hidden p-1.5 text-zinc-400 hover:text-white"
            onClick={() => setMobileMenuOpen(false)}
            aria-label="Đóng menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors whitespace-nowrap ${
                  isActive
                    ? 'bg-orange-600 text-white'
                    : 'text-zinc-300 hover:bg-zinc-800/80 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive ? 'text-amber-200' : 'text-zinc-400'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </span>
                {item.badge !== undefined && (
                  <span
                    className={`text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded font-semibold shrink-0 ${
                      isActive
                        ? 'bg-white/20 text-white'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Role Switcher Panel */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950/40 shrink-0">
          <div className="text-[11px] font-medium text-zinc-400 mb-2">
            Vai trò vận hành (Phân quyền)
          </div>
          <div className="grid grid-cols-2 gap-1 p-1 bg-zinc-800 rounded-lg">
            <button
              type="button"
              onClick={() => onRoleChange('NHAN_VIEN_KHO')}
              className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                role === 'NHAN_VIEN_KHO'
                  ? 'bg-amber-500 text-zinc-950 font-semibold'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              Nhân viên kho
            </button>
            <button
              type="button"
              onClick={() => onRoleChange('QUAN_LY')}
              className={`px-2 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                role === 'QUAN_LY'
                  ? 'bg-amber-500 text-zinc-950 font-semibold'
                  : 'text-zinc-300 hover:text-white'
              }`}
            >
              Quản lý
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0">
              {role === 'QUAN_LY' ? (
                <ShieldCheck className="w-4 h-4 text-amber-400" />
              ) : (
                <User className="w-4 h-4 text-zinc-300" />
              )}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">
                {userName}
              </div>
              <div className="text-[11px] text-zinc-400 truncate">
                {roleLabel}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Shell */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-zinc-200 px-4 lg:px-6 flex items-center justify-between gap-4 sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-0 max-w-xl">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-1 text-zinc-600 hover:text-zinc-900 rounded-lg hover:bg-zinc-100"
              aria-label="Mở menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim() && activeTab !== 'parts') {
                    onTabChange('parts');
                  }
                }}
                placeholder="Tìm mã phụ tùng (PT001), tên phụ tùng, nhà cung cấp..."
                className="w-full h-10 pl-9 pr-8 text-sm bg-zinc-50 border border-zinc-200 rounded-lg text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:bg-white focus:border-orange-500 transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700"
                  aria-label="Xóa tìm kiếm"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Notification Bell */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setNotifOpen((v) => !v)}
                className="relative h-10 w-10 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 flex items-center justify-center text-zinc-700 transition-colors"
                aria-label="Trung tâm thông báo"
              >
                <Bell className="w-4 h-4" />
                {unreadAlerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-600 text-white text-[10px] font-mono font-bold flex items-center justify-center tabular-nums">
                    {unreadAlerts.length > 9 ? '9+' : unreadAlerts.length}
                  </span>
                )}
              </button>

              {notifOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setNotifOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-zinc-200 rounded-xl shadow-lg z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b border-zinc-200 flex items-center justify-between">
                      <span className="text-sm font-semibold text-zinc-900">
                        Cảnh báo & Thông báo ({activeAlerts.length})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          onMarkAlertsRead();
                        }}
                        className="text-xs font-medium text-orange-600 hover:text-orange-700"
                      >
                        Đánh dấu đã đọc
                      </button>
                    </div>
                    <div className="max-h-80 overflow-y-auto divide-y divide-zinc-100">
                      {alerts.slice(0, 6).map((alert) => (
                        <div
                          key={alert.id}
                          className={`px-4 py-3 text-xs ${
                            alert.daDoc ? 'bg-white' : 'bg-amber-50/50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span
                              className={`font-semibold ${
                                alert.mucDo === 'KHAN_CAP'
                                  ? 'text-red-700'
                                  : alert.mucDo === 'CAO'
                                  ? 'text-orange-700'
                                  : 'text-amber-700'
                              }`}
                            >
                              {alert.tieuDe}
                            </span>
                            <span className="text-[11px] text-zinc-400 shrink-0 tabular-nums">
                              {formatDateTime(alert.thoiGianPhatSinh)}
                            </span>
                          </div>
                          <p className="text-zinc-600 mt-1 leading-relaxed">
                            {alert.noiDung}
                          </p>
                        </div>
                      ))}
                      {alerts.length === 0 && (
                        <div className="px-4 py-6 text-center text-xs text-zinc-500">
                          Không có thông báo mới.
                        </div>
                      )}
                    </div>
                    <div className="px-4 py-2.5 bg-zinc-50 border-t border-zinc-200 text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setNotifOpen(false);
                          onTabChange('alerts');
                        }}
                        className="text-xs font-semibold text-orange-600 hover:text-orange-700"
                      >
                        Xem tất cả thông báo & lịch sử
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Primary Action CTA */}
            <button
              type="button"
              onClick={onQuickTransaction}
              className="h-10 px-4 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors whitespace-nowrap shrink-0"
            >
              <ArrowLeftRight className="w-4 h-4 shrink-0" />
              <span>Nhập / Xuất kho</span>
            </button>
          </div>
        </header>

        {/* Page Viewport */}
        <main className="flex-1 p-4 lg:p-6 max-w-[1440px] w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

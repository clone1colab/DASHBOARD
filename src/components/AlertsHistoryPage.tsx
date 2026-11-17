import React, { useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  Bell,
  CheckCheck,
  History,
  Mail,
} from 'lucide-react';
import type { AlertType, AppStateResponse } from '../types/inventory';
import { formatDateTime } from '../lib/format';

interface AlertsHistoryPageProps {
  state: AppStateResponse;
  onMarkAlertsRead: () => Promise<void>;
  onResolveAlert: (id: string) => Promise<void>;
  onTestEmail: () => Promise<void>;
  onGoToSettings: () => void;
}

function getAlertTypeLabel(t: AlertType): string {
  switch (t) {
    case 'HET_HANG':
      return 'Hết hàng';
    case 'DUOI_SAFETY_STOCK':
      return 'Dưới Safety Stock';
    case 'CHAM_ROP':
      return 'Chạm điểm đặt hàng (ROP)';
    case 'DE_XUAT_CHO_DUYET':
      return 'Đề xuất chờ duyệt';
    case 'DON_HANG_TRE_HAN':
      return 'Đơn hàng đến hạn / trễ';
  }
}

export function AlertsHistoryPage({
  state,
  onMarkAlertsRead,
  onResolveAlert,
  onTestEmail,
  onGoToSettings,
}: AlertsHistoryPageProps) {
  const [filterType, setFilterType] = useState<'ALL' | AlertType>('ALL');
  const [emailStatusMsg, setEmailStatusMsg] = useState<string | null>(null);

  const filteredAlerts = state.alerts.filter(
    (a) => filterType === 'ALL' || a.loaiCanhBao === filterType
  );

  const emailCfg = state.config.emailConfig;

  const handleCheckEmail = async () => {
    setEmailStatusMsg(null);
    try {
      await onTestEmail();
      setEmailStatusMsg('Đã gửi email kiểm tra qua Webhook thành công.');
    } catch (err) {
      setEmailStatusMsg(err instanceof Error ? err.message : 'Chưa cấu hình email.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
            Trung tâm thông báo & Lịch sử thao tác
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
            Theo dõi cảnh báo tồn kho tự động và nhật ký kiểm thử quy trình phê duyệt
          </p>
        </div>

        <button
          type="button"
          onClick={onMarkAlertsRead}
          className="h-9 px-3.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 inline-flex items-center gap-1.5 self-start"
        >
          <CheckCheck className="w-4 h-4" />
          Đánh dấu tất cả đã đọc
        </button>
      </div>

      {/* Email Integration Honest Status Panel */}
      <div className="bg-white border border-zinc-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-lg bg-zinc-100 flex items-center justify-center shrink-0">
            <Mail className="w-4 h-4 text-zinc-700" />
          </div>
          <div>
            <div className="text-sm font-bold text-zinc-900">
              Cảnh báo qua Email tự động:{' '}
              {emailCfg.daCauHinh ? (
                <span className="text-emerald-700">Đã cấu hình ({emailCfg.recipientEmail})</span>
              ) : (
                <span className="text-amber-700">Chưa cấu hình dịch vụ Email</span>
              )}
            </div>
            <p className="text-xs text-zinc-500 mt-0.5">
              {emailCfg.daCauHinh
                ? `Webhook đang trỏ tới Google Apps Script / SMTP relay.`
                : 'Hệ thống không giả lập gửi email khi chưa cấu hình Webhook / Email nhận trong phần Cấu hình & Đồng bộ.'}
            </p>
            {emailStatusMsg && (
              <div className="text-xs font-medium text-orange-700 mt-1">{emailStatusMsg}</div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCheckEmail}
            className="h-9 px-3 rounded-lg border border-zinc-200 hover:bg-zinc-50 text-xs font-semibold text-zinc-700"
          >
            Kiểm tra gửi Email
          </button>
          <button
            type="button"
            onClick={onGoToSettings}
            className="h-9 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-semibold text-white"
          >
            Cấu hình tích hợp
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Alerts Feed */}
        <div className="lg:col-span-7 bg-white border border-zinc-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-orange-600" />
              <h2 className="text-sm font-bold text-zinc-900">
                Danh sách cảnh báo ({filteredAlerts.length})
              </h2>
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as 'ALL' | AlertType)}
              className="h-8 px-2.5 rounded-lg border border-zinc-200 bg-zinc-50 text-xs font-medium"
            >
              <option value="ALL">Tất cả loại cảnh báo</option>
              <option value="HET_HANG">Hết hàng</option>
              <option value="DUOI_SAFETY_STOCK">Dưới Safety Stock</option>
              <option value="CHAM_ROP">Chạm điểm đặt hàng (ROP)</option>
              <option value="DE_XUAT_CHO_DUYET">Đề xuất chờ duyệt</option>
              <option value="DON_HANG_TRE_HAN">Đơn hàng đến hạn / trễ</option>
            </select>
          </div>

          <div className="divide-y divide-zinc-100 max-h-[580px] overflow-y-auto">
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 flex items-start justify-between gap-3 ${
                  alert.daXuLy ? 'opacity-65 bg-white' : alert.daDoc ? 'bg-white' : 'bg-amber-50/40'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 shrink-0">
                    {alert.mucDo === 'KHAN_CAP' ? (
                      <AlertOctagon className="w-4 h-4 text-red-600" />
                    ) : (
                      <AlertTriangle
                        className={`w-4 h-4 ${
                          alert.mucDo === 'CAO' ? 'text-orange-600' : 'text-amber-600'
                        }`}
                      />
                    )}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
                      <span className="font-semibold text-zinc-700">
                        {getAlertTypeLabel(alert.loaiCanhBao)}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="tabular-nums">{formatDateTime(alert.thoiGianPhatSinh)}</span>
                      {alert.daXuLy && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span className="text-emerald-700 font-semibold">Đã xử lý</span>
                        </>
                      )}
                    </div>
                    <div className="text-xs font-bold text-zinc-900 mt-0.5">{alert.tieuDe}</div>
                    <div className="text-xs text-zinc-600 mt-0.5">{alert.noiDung}</div>
                  </div>
                </div>

                {!alert.daXuLy && (
                  <button
                    type="button"
                    onClick={() => onResolveAlert(alert.id)}
                    className="px-2.5 py-1 rounded border border-zinc-200 hover:bg-zinc-50 text-[11px] font-semibold text-zinc-700 shrink-0"
                  >
                    Đã xử lý
                  </button>
                )}
              </div>
            ))}
            {filteredAlerts.length === 0 && (
              <div className="p-8 text-center text-xs text-zinc-500">
                Không có cảnh báo nào thuộc loại đã chọn.
              </div>
            )}
          </div>
        </div>

        {/* Audit History */}
        <div className="lg:col-span-5 bg-white border border-zinc-200 rounded-xl overflow-hidden">
          <div className="px-5 py-3.5 border-b border-zinc-200 flex items-center gap-2">
            <History className="w-4 h-4 text-zinc-700" />
            <h2 className="text-sm font-bold text-zinc-900">
              Lịch sử thao tác hệ thống ({state.auditLogs.length})
            </h2>
          </div>

          <div className="divide-y divide-zinc-100 max-h-[580px] overflow-y-auto">
            {state.auditLogs.map((log) => (
              <div key={log.id} className="p-3.5 text-xs space-y-1">
                <div className="flex items-center justify-between gap-2 text-[11px] text-zinc-500">
                  <span className="font-mono font-semibold text-orange-700">{log.hanhDong}</span>
                  <span className="tabular-nums">{formatDateTime(log.thoiGian)}</span>
                </div>
                <div className="font-semibold text-zinc-900">{log.doiTuong}</div>
                <div className="text-zinc-600">{log.chiTiet}</div>
                <div className="text-[11px] text-zinc-400">
                  Thực hiện: {log.nguoiThucHien} ({log.vaiTro === 'QUAN_LY' ? 'Quản lý' : 'Nhân viên kho'})
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

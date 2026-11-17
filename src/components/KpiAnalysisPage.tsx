import React, { useState } from 'react';
import { Calculator, Check, ChevronDown, ChevronUp, Info } from 'lucide-react';
import type {
  AppStateResponse,
  HydratedPart,
  KpiWindowDays,
  PhuTung,
  UserRole,
} from '../types/inventory';
import { formatCurrency, formatNumber, getStatusMeta } from '../lib/format';

interface KpiAnalysisPageProps {
  state: AppStateResponse;
  role: UserRole;
  kpiDays: KpiWindowDays;
  onKpiDaysChange: (days: KpiWindowDays) => void;
  onUpdatePart: (id: string, payload: Partial<PhuTung>) => Promise<void>;
  onSelectPart: (part: HydratedPart) => void;
}

export function KpiAnalysisPage({
  state,
  role,
  kpiDays,
  onKpiDaysChange,
  onUpdatePart,
  onSelectPart,
}: KpiAnalysisPageProps) {
  const [expandedId, setExpandedId] = useState<string | null>('PT001');
  const [savingId, setSavingId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const d = state.dashboard;

  const handleQuickMethodChange = async (
    part: HydratedPart,
    patch: Partial<PhuTung>
  ) => {
    setErrorMsg(null);
    setSavingId(part.id);
    try {
      await onUpdatePart(part.id, patch);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Không thể cập nhật thông số.');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
            Phân tích KPI & Kiểm tra công thức tồn kho
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
            Hiển thị đầy đủ công thức, dữ liệu đầu vào và kết quả tự động tính lại theo thời gian thực
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-zinc-600">Kỳ phân tích ADD:</span>
          <div className="inline-flex items-center p-1 bg-white border border-zinc-200 rounded-lg">
            {([30, 60, 90] as KpiWindowDays[]).map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => onKpiDaysChange(days)}
                className={`px-3 py-1.5 text-xs font-mono font-semibold rounded-md transition-colors ${
                  kpiDays === days
                    ? 'bg-orange-600 text-white'
                    : 'text-zinc-600 hover:text-zinc-900'
                }`}
              >
                {days} ngày
              </button>
            ))}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 font-medium">
          {errorMsg}
        </div>
      )}

      {/* System-level Turnover, DOH, Stockout Rate Verification Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-700">
              G. Inventory Turnover (Vòng quay tồn kho)
            </span>
            <span className="font-mono text-base font-bold text-zinc-900 tabular-nums">
              {d.inventoryTurnover !== null ? `${d.inventoryTurnover} vòng` : '—'}
            </span>
          </div>
          <div className="text-[11px] text-zinc-500 mt-1.5">
            Công thức: Giá vốn phụ tùng đã xuất trong kỳ / Giá trị tồn kho bình quân
          </div>
          <div className="text-xs font-mono text-zinc-700 bg-zinc-50 px-2.5 py-1.5 rounded mt-2">
            {d.inventoryTurnoverFormula}
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-700">
              H. Days of Inventory on Hand (DOH)
            </span>
            <span className="font-mono text-base font-bold text-zinc-900 tabular-nums">
              {d.doh !== null ? `${d.doh} ngày` : '—'}
            </span>
          </div>
          <div className="text-[11px] text-zinc-500 mt-1.5">
            Công thức: Số ngày trong kỳ ({d.periodDays} ngày) / Inventory Turnover
          </div>
          <div className="text-xs font-mono text-zinc-700 bg-zinc-50 px-2.5 py-1.5 rounded mt-2">
            {d.dohFormula}
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-700">
              I. Stockout Rate (Tỷ lệ thiếu hàng)
            </span>
            <span className="font-mono text-base font-bold text-orange-700 tabular-nums">
              {d.stockoutRate !== null ? `${d.stockoutRate}%` : 'Chưa có dữ liệu'}
            </span>
          </div>
          <div className="text-[11px] text-zinc-500 mt-1.5">
            Công thức: Số lần yêu cầu không đáp ứng đủ / Tổng số yêu cầu × 100%
          </div>
          <div className="text-xs font-mono text-zinc-700 bg-zinc-50 px-2.5 py-1.5 rounded mt-2">
            {d.stockoutFormula}
          </div>
        </div>
      </div>

      {/* Per-part KPI Audit Table */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="w-4 h-4 text-orange-600" />
            <h2 className="text-sm font-bold text-zinc-900">
              Bảng kiểm tra công thức KPI từng phụ tùng (Nhấn vào dòng để xem công thức chi tiết)
            </h2>
          </div>
          {role !== 'QUAN_LY' && (
            <span className="text-[11px] text-amber-700 font-medium">
              Chế độ xem Nhân viên kho (Quản lý mới chỉnh được ngưỡng SS/LT)
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Mã & Tên phụ tùng</th>
                <th className="px-4 py-3 font-semibold text-right">ADD ({kpiDays}N)</th>
                <th className="px-4 py-3 font-semibold text-right">Lead Time</th>
                <th className="px-4 py-3 font-semibold text-right">Safety Stock</th>
                <th className="px-4 py-3 font-semibold text-right">ROP</th>
                <th className="px-4 py-3 font-semibold text-right">IP / Tồn</th>
                <th className="px-4 py-3 font-semibold text-right">EOQ</th>
                <th className="px-4 py-3 font-semibold text-right">ROQ Đề xuất</th>
                <th className="px-4 py-3 font-semibold">Trạng thái</th>
                <th className="px-4 py-3 font-semibold text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {state.parts.map((part) => {
                const k = part.kpi;
                const isExpanded = expandedId === part.id;
                const meta = getStatusMeta(k.trangThai);
                return (
                  <React.Fragment key={part.id}>
                    <tr
                      onClick={() => setExpandedId(isExpanded ? null : part.id)}
                      className="hover:bg-zinc-50 cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="font-mono font-bold text-zinc-900">{part.maPhuTung}</div>
                        <div className="text-zinc-600 font-medium">{part.tenPhuTung}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        <div className="font-semibold text-zinc-900">{k.add}</div>
                        <div className="text-[11px] text-zinc-400">
                          {k.tongTieuThuTrongKy}/{kpiDays}N
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        <div className="font-semibold text-zinc-900">{k.leadTime} ngày</div>
                        <div className="text-[11px] text-zinc-400">{k.leadTimeNguon}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        <div className="font-semibold text-zinc-900">{k.safetyStock}</div>
                        <div className="text-[11px] text-zinc-400">{k.safetyStockNguon}</div>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-orange-700">
                        {k.rop}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        <span className="font-bold text-zinc-900">{k.inventoryPosition}</span>
                        <span className="text-zinc-400"> / {k.tonHienTai}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        {k.eoqDuDuLieu ? (
                          <span className="font-semibold text-zinc-900">{k.eoq}</span>
                        ) : (
                          <span className="text-amber-700 font-medium">Chưa đủ dữ liệu</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums">
                        <div className="font-bold text-orange-700">{k.roq}</div>
                        <div className="text-[11px] text-zinc-400">
                          {k.roqPhuongPhap === 'eoq' ? 'Theo EOQ' : 'Mức mục tiêu'}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`font-semibold ${meta.textClass}`}>{meta.label}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          className="p-1 text-zinc-500 hover:text-zinc-900"
                          aria-label="Mở rộng công thức"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>

                    {isExpanded && (
                      <tr className="bg-zinc-50/80">
                        <td colSpan={10} className="px-5 py-4 border-t border-zinc-200">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                            <div className="p-3 bg-white border border-zinc-200 rounded-lg space-y-1">
                              <div className="font-bold text-zinc-800">ADD & Demand</div>
                              <div className="font-mono text-zinc-700">{k.addFormula}</div>
                              <div className="text-[11px] text-zinc-500">
                                Max ngày: {k.nhuCauToiDaNgay} · D năm: {k.annualDemandD}
                              </div>
                            </div>
                            <div className="p-3 bg-white border border-zinc-200 rounded-lg space-y-1">
                              <div className="font-bold text-zinc-800">Safety Stock & ROP</div>
                              <div className="font-mono text-zinc-700">{k.safetyStockFormula}</div>
                              <div className="font-mono text-orange-700 font-semibold">
                                ROP = {k.ropFormula}
                              </div>
                            </div>
                            <div className="p-3 bg-white border border-zinc-200 rounded-lg space-y-1">
                              <div className="font-bold text-zinc-800">EOQ & ROQ</div>
                              <div className="font-mono text-zinc-700">{k.eoqFormula}</div>
                              <div className="font-mono text-zinc-700">{k.roqFormula}</div>
                            </div>
                          </div>

                          {/* Interactive Controls for adjusting method */}
                          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-200">
                            <div className="flex flex-wrap items-center gap-3">
                              <label className="flex items-center gap-1.5 text-xs">
                                <span className="font-semibold text-zinc-700">Phương pháp ROQ:</span>
                                <select
                                  disabled={savingId === part.id}
                                  value={part.phuongPhapROQ}
                                  onChange={(e) =>
                                    handleQuickMethodChange(part, {
                                      phuongPhapROQ: e.target.value as 'eoq' | 'target',
                                    })
                                  }
                                  className="h-8 px-2 rounded border border-zinc-200 bg-white text-xs font-medium"
                                >
                                  <option value="eoq">Theo EOQ</option>
                                  <option value="target">Theo mức tồn mục tiêu</option>
                                </select>
                              </label>

                              {role === 'QUAN_LY' && (
                                <>
                                  <label className="flex items-center gap-1.5 text-xs">
                                    <span className="font-semibold text-zinc-700">Safety Stock:</span>
                                    <select
                                      disabled={savingId === part.id}
                                      value={part.phuongPhapSS}
                                      onChange={(e) =>
                                        handleQuickMethodChange(part, {
                                          phuongPhapSS: e.target.value as 'manual' | 'auto',
                                        })
                                      }
                                      className="h-8 px-2 rounded border border-zinc-200 bg-white text-xs font-medium"
                                    >
                                      <option value="manual">Thủ công ({part.safetyStockThuCong ?? k.safetyStock})</option>
                                      <option value="auto">Tự động (Max - Avg)</option>
                                    </select>
                                  </label>

                                  <label className="flex items-center gap-1.5 text-xs">
                                    <span className="font-semibold text-zinc-700">Lead Time:</span>
                                    <select
                                      disabled={savingId === part.id}
                                      value={part.phuongPhapLT}
                                      onChange={(e) =>
                                        handleQuickMethodChange(part, {
                                          phuongPhapLT: e.target.value as 'manual' | 'history',
                                        })
                                      }
                                      className="h-8 px-2 rounded border border-zinc-200 bg-white text-xs font-medium"
                                    >
                                      <option value="manual">Thủ công ({part.leadTimeThuCong ?? k.leadTime}N)</option>
                                      <option value="history">Trung bình lịch sử đơn hàng</option>
                                    </select>
                                  </label>
                                </>
                              )}
                            </div>

                            <button
                              type="button"
                              onClick={() => onSelectPart(part)}
                              className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700"
                            >
                              <Info className="w-3.5 h-3.5" />
                              Xem hồ sơ phụ tùng & biểu đồ
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Parts Request Fulfillment Log for Stockout Rate */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3.5 border-b border-zinc-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-zinc-900">
              Nhật ký đáp ứng yêu cầu phụ tùng (Dữ liệu tính Stockout Rate)
            </h2>
            <p className="text-xs text-zinc-500">
              Tổng cộng {state.requests.length} yêu cầu · Thiếu hàng:{' '}
              {state.requests.filter((r) => !r.duocDapUngDayDu).length} lần
            </p>
          </div>
        </div>
        <div className="overflow-x-auto max-h-64">
          <table className="w-full text-xs text-left">
            <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Mã YC</th>
                <th className="px-4 py-2.5 font-semibold">Phụ tùng</th>
                <th className="px-4 py-2.5 font-semibold">Phiếu sửa chữa</th>
                <th className="px-4 py-2.5 font-semibold text-right">Yêu cầu</th>
                <th className="px-4 py-2.5 font-semibold text-right">Đáp ứng</th>
                <th className="px-4 py-2.5 font-semibold">Kết quả</th>
                <th className="px-4 py-2.5 font-semibold">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {state.requests.slice(0, 12).map((req) => (
                <tr key={req.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-2.5 font-mono font-semibold text-zinc-900">
                    {req.maYeuCau}
                  </td>
                  <td className="px-4 py-2.5 font-mono text-zinc-700">{req.phuTungId}</td>
                  <td className="px-4 py-2.5 font-mono text-zinc-700">{req.maPhieuSuaChua}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums">
                    {req.soLuongYeuCau}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums font-bold">
                    {req.soLuongDapUng}
                  </td>
                  <td className="px-4 py-2.5">
                    {req.duocDapUngDayDu ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700 font-semibold">
                        <Check className="w-3.5 h-3.5" /> Đáp ứng đủ
                      </span>
                    ) : (
                      <span className="text-red-700 font-semibold">Thiếu hàng (Stockout)</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-600">{req.ghiChu}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

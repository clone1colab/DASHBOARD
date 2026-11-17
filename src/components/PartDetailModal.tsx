import React from 'react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import type { HydratedPart, NhapXuatKho } from '../types/inventory';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  getStatusMeta,
  getTransactionTypeLabel,
} from '../lib/format';

interface PartDetailModalProps {
  part: HydratedPart | null;
  transactions: NhapXuatKho[];
  onClose: () => void;
  onCreateTransaction?: (partId: string, type: 'NHAP_KHO' | 'XUAT_KHO') => void;
}

export function PartDetailModal({
  part,
  transactions,
  onClose,
  onCreateTransaction,
}: PartDetailModalProps) {
  if (!part) return null;

  const k = part.kpi;
  const statusMeta = getStatusMeta(k.trangThai);
  const partTx = transactions
    .filter((t) => t.phuTungId === part.id)
    .sort((a, b) => new Date(a.ngayGiaoDich).getTime() - new Date(b.ngayGiaoDich).getTime());

  const chartData = partTx.map((t) => ({
    ngay: formatDate(t.ngayGiaoDich),
    tonKho: t.tonSauGiaoDich,
    rop: k.rop,
    safetyStock: k.safetyStock,
    loai: getTransactionTypeLabel(t.loaiGiaoDich),
  }));

  const recentTxDesc = [...partTx].reverse();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60">
      <div className="bg-white border border-zinc-200 rounded-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 flex items-start justify-between gap-4 bg-zinc-50">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <span className="font-mono font-semibold text-zinc-900">{part.maPhuTung}</span>
              <span aria-hidden="true">·</span>
              <span>{part.loaiPhuTung}</span>
              <span aria-hidden="true">·</span>
              <span>Đơn vị: {part.donViTinh}</span>
              <span aria-hidden="true">·</span>
              <span>NCC: {part.nhaCungCap?.tenNCC ?? part.nhaCungCapId}</span>
            </div>
            <h2 className="text-xl font-bold text-zinc-900 mt-1">{part.tenPhuTung}</h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-xs font-semibold ${statusMeta.bgClass} ${statusMeta.textClass} ${statusMeta.borderClass}`}
            >
              {k.trangThai === 'DU_HANG' ? (
                <CheckCircle2 className="w-3.5 h-3.5" />
              ) : (
                <AlertTriangle className="w-3.5 h-3.5" />
              )}
              {statusMeta.label}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-zinc-500 hover:text-zinc-900 rounded-lg hover:bg-zinc-200/60"
              aria-label="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Quick Stock & Action Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="p-3 rounded-lg border border-zinc-200 bg-zinc-50/70">
              <div className="text-xs text-zinc-500">Tồn hiện tại</div>
              <div className="text-lg font-bold font-mono tabular-nums text-zinc-900 mt-0.5">
                {formatNumber(k.tonHienTai)} {part.donViTinh}
              </div>
            </div>
            <div className="p-3 rounded-lg border border-zinc-200 bg-zinc-50/70">
              <div className="text-xs text-zinc-500">Tồn khả dụng</div>
              <div className="text-lg font-bold font-mono tabular-nums text-zinc-900 mt-0.5">
                {formatNumber(k.tonKhaDung)} {part.donViTinh}
              </div>
            </div>
            <div className="p-3 rounded-lg border border-zinc-200 bg-zinc-50/70">
              <div className="text-xs text-zinc-500">Đang đặt (PO)</div>
              <div className="text-lg font-bold font-mono tabular-nums text-amber-700 mt-0.5">
                +{formatNumber(k.soLuongDangDat)}
              </div>
            </div>
            <div className="p-3 rounded-lg border border-zinc-200 bg-zinc-50/70">
              <div className="text-xs text-zinc-500">Inventory Position</div>
              <div className="text-lg font-bold font-mono tabular-nums text-zinc-900 mt-0.5">
                {formatNumber(k.inventoryPosition)} {part.donViTinh}
              </div>
            </div>
            <div className="p-3 rounded-lg border border-zinc-200 bg-zinc-50/70">
              <div className="text-xs text-zinc-500">Reorder Point (ROP)</div>
              <div className="text-lg font-bold font-mono tabular-nums text-orange-700 mt-0.5">
                {formatNumber(k.rop, 1)} {part.donViTinh}
              </div>
            </div>
            <div className="p-3 rounded-lg border border-zinc-200 bg-zinc-50/70">
              <div className="text-xs text-zinc-500">Safety Stock</div>
              <div className="text-lg font-bold font-mono tabular-nums text-zinc-900 mt-0.5">
                {formatNumber(k.safetyStock)} {part.donViTinh}
              </div>
            </div>
          </div>

          {onCreateTransaction && (
            <div className="flex flex-wrap items-center justify-between gap-3 py-3 px-4 rounded-lg border border-zinc-200 bg-white">
              <div className="text-xs text-zinc-600">
                Giá nhập: <strong className="font-mono text-zinc-900">{formatCurrency(part.giaNhap)}</strong>
                <span className="mx-2 text-zinc-300">|</span>
                Giá xuất tham khảo:{' '}
                <strong className="font-mono text-zinc-900">{formatCurrency(part.giaXuatThamKhao)}</strong>
                <span className="mx-2 text-zinc-300">|</span>
                Giá trị tồn:{' '}
                <strong className="font-mono text-zinc-900">{formatCurrency(k.giaTriTonKho)}</strong>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onCreateTransaction(part.id, 'NHAP_KHO')}
                  className="px-3 py-1.5 rounded-lg border border-zinc-300 hover:bg-zinc-50 text-xs font-semibold text-zinc-800"
                >
                  Nhập kho mã này
                </button>
                <button
                  type="button"
                  onClick={() => onCreateTransaction(part.id, 'XUAT_KHO')}
                  className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-xs font-semibold text-white"
                >
                  Xuất kho mã này
                </button>
              </div>
            </div>
          )}

          {/* KPI Calculation Verification Grid */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-orange-600" />
              <h3 className="text-sm font-bold text-zinc-900">
                Chi tiết công thức & Dữ liệu tính KPI (Kỳ phân tích {k.kpiWindowDays} ngày)
              </h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3.5 rounded-lg border border-zinc-200 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-700">
                    A. Average Daily Demand (ADD)
                  </span>
                  <span className="font-mono text-sm font-bold text-zinc-900 tabular-nums">
                    {k.add} {part.donViTinh}/ngày
                  </span>
                </div>
                <div className="text-xs font-mono text-zinc-600 mt-1.5 bg-zinc-50 px-2.5 py-1.5 rounded">
                  {k.addFormula}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">
                  Nhu cầu tối đa/ngày ghi nhận: {k.nhuCauToiDaNgay} {part.donViTinh} (không tính giao dịch điều chỉnh)
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-zinc-200 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-700">B. Lead Time (LT)</span>
                  <span className="font-mono text-sm font-bold text-zinc-900 tabular-nums">
                    {k.leadTime} ngày
                  </span>
                </div>
                <div className="text-xs font-mono text-zinc-600 mt-1.5 bg-zinc-50 px-2.5 py-1.5 rounded">
                  Nguồn: {k.leadTimeNguon} · Mẫu đơn hàng: {k.leadTimeSampleCount}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">
                  Lead Time tối đa: {k.leadTimeToiDa} ngày
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-zinc-200 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-700">C. Safety Stock (SS)</span>
                  <span className="font-mono text-sm font-bold text-zinc-900 tabular-nums">
                    {k.safetyStock} {part.donViTinh}
                  </span>
                </div>
                <div className="text-xs font-mono text-zinc-600 mt-1.5 bg-zinc-50 px-2.5 py-1.5 rounded">
                  {k.safetyStockFormula}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">
                  Phương pháp: {k.safetyStockNguon}
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-zinc-200 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-700">D. Reorder Point (ROP)</span>
                  <span className="font-mono text-sm font-bold text-orange-700 tabular-nums">
                    {k.rop} {part.donViTinh}
                  </span>
                </div>
                <div className="text-xs font-mono text-zinc-600 mt-1.5 bg-zinc-50 px-2.5 py-1.5 rounded">
                  {k.ropFormula}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">
                  Vị thế tồn kho (IP) = {k.tonHienTai} + {k.soLuongDangDat} - {k.soLuongGiuCho} ={' '}
                  <strong className="font-mono text-zinc-800">{k.inventoryPosition}</strong>
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-zinc-200 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-700">
                    E. Economic Order Quantity (EOQ)
                  </span>
                  <span
                    className={`font-mono text-sm font-bold tabular-nums ${
                      k.eoqDuDuLieu ? 'text-zinc-900' : 'text-amber-700'
                    }`}
                  >
                    {k.eoqThongBao}
                  </span>
                </div>
                <div className="text-xs font-mono text-zinc-600 mt-1.5 bg-zinc-50 px-2.5 py-1.5 rounded">
                  {k.eoqFormula}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">
                  D = {k.annualDemandD}/năm · S = {formatCurrency(part.chiPhiDatHang)} · H ={' '}
                  {formatCurrency(part.chiPhiLuuKhoNam)}
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-zinc-200 bg-white">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-zinc-700">
                    F. Reorder Quantity (ROQ) & Vòng quay
                  </span>
                  <span className="font-mono text-sm font-bold text-zinc-900 tabular-nums">
                    Đề xuất: {k.roq} {part.donViTinh}
                  </span>
                </div>
                <div className="text-xs font-mono text-zinc-600 mt-1.5 bg-zinc-50 px-2.5 py-1.5 rounded">
                  {k.roqFormula}
                </div>
                <div className="text-[11px] text-zinc-500 mt-1">
                  Turnover ({k.kpiWindowDays}d):{' '}
                  {k.inventoryTurnover !== null ? `${k.inventoryTurnover} vòng` : '—'} · DOH:{' '}
                  {k.doh !== null ? `${k.doh} ngày` : '—'}
                </div>
              </div>
            </div>
          </div>

          {/* Stock Movement Chart */}
          <div className="border border-zinc-200 rounded-lg p-4 bg-white">
            <h3 className="text-sm font-bold text-zinc-900 mb-3">
              Biểu đồ biến động tồn kho theo giao dịch
            </h3>
            {chartData.length > 0 ? (
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                    <XAxis dataKey="ngay" tick={{ fontSize: 11, fill: '#71717A' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#71717A' }} />
                    <Tooltip
                      contentStyle={{
                        fontSize: 12,
                        borderRadius: 8,
                        borderColor: '#E4E4E7',
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="tonKho"
                      name="Tồn sau giao dịch"
                      stroke="#EA580C"
                      fill="#FFEDD5"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="rop"
                      name="Ngưỡng ROP"
                      stroke="#D97706"
                      fill="none"
                      strokeDasharray="4 4"
                      strokeWidth={1.5}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-zinc-500">
                Chưa có giao dịch phát sinh cho phụ tùng này.
              </div>
            )}
          </div>

          {/* Transaction History */}
          <div className="border border-zinc-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-200 text-sm font-bold text-zinc-900">
              Lịch sử nhập – xuất – điều chỉnh ({recentTxDesc.length})
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Thời gian</th>
                    <th className="px-4 py-2.5 font-semibold">Mã GD</th>
                    <th className="px-4 py-2.5 font-semibold">Loại</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Số lượng</th>
                    <th className="px-4 py-2.5 font-semibold text-right">Tồn sau GD</th>
                    <th className="px-4 py-2.5 font-semibold">Chứng từ</th>
                    <th className="px-4 py-2.5 font-semibold">Lý do / Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {recentTxDesc.map((tx) => (
                    <tr key={tx.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-2.5 tabular-nums text-zinc-600 whitespace-nowrap">
                        {formatDateTime(tx.ngayGiaoDich)}
                      </td>
                      <td className="px-4 py-2.5 font-mono font-medium text-zinc-900 whitespace-nowrap">
                        {tx.maGiaoDich}
                      </td>
                      <td className="px-4 py-2.5 font-medium whitespace-nowrap">
                        <span
                          className={
                            tx.loaiGiaoDich === 'NHAP_KHO'
                              ? 'text-emerald-700'
                              : tx.loaiGiaoDich === 'XUAT_KHO'
                              ? 'text-orange-700'
                              : 'text-zinc-700'
                          }
                        >
                          {getTransactionTypeLabel(tx.loaiGiaoDich)}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums font-semibold">
                        {tx.loaiGiaoDich === 'NHAP_KHO'
                          ? `+${tx.soLuong}`
                          : tx.loaiGiaoDich === 'XUAT_KHO'
                          ? `-${tx.soLuong}`
                          : tx.soLuong >= 0
                          ? `+${tx.soLuong}`
                          : tx.soLuong}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-zinc-900">
                        {tx.tonSauGiaoDich}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-zinc-600 whitespace-nowrap">
                        {tx.maChungTu}
                      </td>
                      <td className="px-4 py-2.5 text-zinc-600">{tx.lyDo}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

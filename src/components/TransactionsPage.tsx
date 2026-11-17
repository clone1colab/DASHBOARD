import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  SlidersHorizontal,
} from 'lucide-react';
import type { AppStateResponse, TransactionType } from '../types/inventory';
import {
  formatDateTime,
  formatNumber,
  getStatusMeta,
  getTransactionTypeLabel,
} from '../lib/format';

interface TransactionsPageProps {
  state: AppStateResponse;
  preselectedPartId?: string | null;
  preselectedMode?: TransactionType;
  onCreateTransaction: (payload: {
    phuTungId: string;
    loaiGiaoDich: TransactionType;
    soLuong: number;
    ngayGiaoDich?: string;
    nhaCungCapId?: string;
    maChungTu?: string;
    lyDo?: string;
    dieuChinhMode?: 'delta' | 'set_actual';
  }) => Promise<{
    oldStock: number;
    newStock: number;
    autoProposalCreated: { maDeXuat: string; soLuongDeXuat: number } | null;
  }>;
  onRecordShortageRequest: (payload: {
    phuTungId: string;
    maPhieuSuaChua: string;
    soLuongYeuCau: number;
    soLuongDapUng: number;
    ghiChu?: string;
  }) => Promise<void>;
}

export function TransactionsPage({
  state,
  preselectedPartId,
  preselectedMode,
  onCreateTransaction,
  onRecordShortageRequest,
}: TransactionsPageProps) {
  const [mode, setMode] = useState<TransactionType>(preselectedMode || 'XUAT_KHO');
  const [phuTungId, setPhuTungId] = useState<string>(
    preselectedPartId || state.parts[0]?.id || 'PT001'
  );
  const [soLuong, setSoLuong] = useState<number>(6);
  const [ngayGiaoDich, setNgayGiaoDich] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [nhaCungCapId, setNhaCungCapId] = useState<string>('');
  const [maChungTu, setMaChungTu] = useState<string>('PBH-2026-001');
  const [lyDo, setLyDo] = useState<string>('');
  const [dieuChinhMode, setDieuChinhMode] = useState<'delta' | 'set_actual'>('set_actual');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
    canLogShortage?: boolean;
  } | null>(null);
  const [txTypeFilter, setTxTypeFilter] = useState<'ALL' | TransactionType>('ALL');

  useEffect(() => {
    if (preselectedPartId) setPhuTungId(preselectedPartId);
  }, [preselectedPartId]);

  useEffect(() => {
    if (preselectedMode) setMode(preselectedMode);
  }, [preselectedMode]);

  const selectedPart = useMemo(
    () => state.parts.find((p) => p.id === phuTungId) || state.parts[0],
    [state.parts, phuTungId]
  );

  useEffect(() => {
    if (selectedPart && !nhaCungCapId) {
      setNhaCungCapId(selectedPart.nhaCungCapId);
    }
  }, [selectedPart, nhaCungCapId]);

  const previewStock = useMemo(() => {
    if (!selectedPart) return { afterStock: 0, afterIp: 0, triggersRop: false };
    const qty = Number(soLuong) || 0;
    let delta = 0;
    if (mode === 'NHAP_KHO') delta = qty;
    else if (mode === 'XUAT_KHO') delta = -qty;
    else delta = dieuChinhMode === 'set_actual' ? qty - selectedPart.tonHienTai : qty;

    const afterStock = selectedPart.tonHienTai + delta;
    const afterIp =
      afterStock + selectedPart.kpi.soLuongDangDat - selectedPart.kpi.soLuongGiuCho;
    const triggersRop = afterIp <= selectedPart.kpi.rop;
    return { afterStock, afterIp, triggersRop };
  }, [selectedPart, mode, soLuong, dieuChinhMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPart) return;
    setFeedback(null);
    setSubmitting(true);
    try {
      const result = await onCreateTransaction({
        phuTungId: selectedPart.id,
        loaiGiaoDich: mode,
        soLuong: Number(soLuong),
        ngayGiaoDich,
        nhaCungCapId: mode === 'NHAP_KHO' ? nhaCungCapId || selectedPart.nhaCungCapId : undefined,
        maChungTu: maChungTu.trim(),
        lyDo:
          lyDo.trim() ||
          (mode === 'NHAP_KHO'
            ? 'Nhập kho bổ sung'
            : mode === 'XUAT_KHO'
            ? 'Xuất phụ tùng sửa chữa / bảo hành'
            : 'Điều chỉnh tồn kho theo kiểm kê'),
        dieuChinhMode: mode === 'DIEU_CHINH' ? dieuChinhMode : undefined,
      });

      let msg = `Đã ghi nhận ${getTransactionTypeLabel(mode)} thành công. Tồn kho ${selectedPart.maPhuTung}: ${result.oldStock} → ${result.newStock} ${selectedPart.donViTinh}.`;
      if (result.autoProposalCreated) {
        msg += ` Hệ thống đã tự động phát sinh cảnh báo chạm ROP và tạo đề xuất ${result.autoProposalCreated.maDeXuat} (${result.autoProposalCreated.soLuongDeXuat} ${selectedPart.donViTinh}).`;
      }
      setFeedback({ type: 'success', message: msg });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Giao dịch thất bại.';
      setFeedback({
        type: 'error',
        message: msg,
        canLogShortage: mode === 'XUAT_KHO' && msg.includes('vượt tồn kho khả dụng'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogShortage = async () => {
    if (!selectedPart) return;
    setSubmitting(true);
    try {
      await onRecordShortageRequest({
        phuTungId: selectedPart.id,
        maPhieuSuaChua: maChungTu || 'PSC-THIEU',
        soLuongYeuCau: Number(soLuong),
        soLuongDapUng: selectedPart.kpi.tonKhaDung,
        ghiChu: `Thiếu hàng khi xuất kho (Tồn khả dụng ${selectedPart.kpi.tonKhaDung} < Yêu cầu ${soLuong})`,
      });
      setFeedback({
        type: 'success',
        message: `Đã ghi nhận phiếu thiếu hàng (${selectedPart.maPhuTung}) để cập nhật chỉ số Stockout Rate.`,
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err instanceof Error ? err.message : 'Không thể ghi nhận phiếu thiếu hàng.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const partMap = useMemo(
    () => new Map(state.parts.map((p) => [p.id, p])),
    [state.parts]
  );

  const filteredTx = useMemo(() => {
    return state.transactions.filter(
      (t) => txTypeFilter === 'ALL' || t.loaiGiaoDich === txTypeFilter
    );
  }, [state.transactions, txTypeFilter]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
          Nghiệp vụ Nhập kho – Xuất kho – Điều chỉnh
        </h1>
        <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
          Mỗi giao dịch sẽ tự động cập nhật tồn kho, tính lại các chỉ số KPI và kích hoạt cảnh báo ROP nếu cần
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Form Panel */}
        <div className="lg:col-span-5 bg-white border border-zinc-200 rounded-xl overflow-hidden">
          {/* Mode Tabs */}
          <div className="grid grid-cols-3 border-b border-zinc-200 bg-zinc-50">
            <button
              type="button"
              onClick={() => {
                setMode('XUAT_KHO');
                setMaChungTu('PBH-2026-001');
                setFeedback(null);
              }}
              className={`py-3 px-2 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                mode === 'XUAT_KHO'
                  ? 'border-orange-600 text-orange-700 bg-white'
                  : 'border-transparent text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              Xuất kho
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('NHAP_KHO');
                setMaChungTu('PO-2026-NEW');
                setFeedback(null);
              }}
              className={`py-3 px-2 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                mode === 'NHAP_KHO'
                  ? 'border-emerald-600 text-emerald-700 bg-white'
                  : 'border-transparent text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <ArrowDownLeft className="w-3.5 h-3.5" />
              Nhập kho
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('DIEU_CHINH');
                setMaChungTu('KK-2026-001');
                setFeedback(null);
              }}
              className={`py-3 px-2 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-colors ${
                mode === 'DIEU_CHINH'
                  ? 'border-zinc-900 text-zinc-900 bg-white'
                  : 'border-transparent text-zinc-600 hover:text-zinc-900'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Điều chỉnh
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
            {feedback && (
              <div
                className={`p-3 rounded-lg border text-xs leading-relaxed ${
                  feedback.type === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-red-50 border-red-200 text-red-800'
                }`}
              >
                <div className="flex items-start gap-2">
                  {feedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  )}
                  <span>{feedback.message}</span>
                </div>
                {feedback.canLogShortage && (
                  <button
                    type="button"
                    onClick={handleLogShortage}
                    className="mt-2 px-3 py-1.5 rounded bg-red-700 hover:bg-red-800 text-white font-semibold"
                  >
                    Ghi nhận yêu cầu thiếu hàng (Stockout Rate)
                  </button>
                )}
              </div>
            )}

            <div>
              <label className="block font-semibold text-zinc-700 mb-1">
                Chọn phụ tùng *
              </label>
              <select
                value={phuTungId}
                onChange={(e) => {
                  const nextId = e.target.value;
                  setPhuTungId(nextId);
                  const found = state.parts.find((p) => p.id === nextId);
                  if (found) setNhaCungCapId(found.nhaCungCapId);
                }}
                className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white font-medium text-zinc-900"
              >
                {state.parts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.maPhuTung} — {p.tenPhuTung} (Tồn: {p.tonHienTai} {p.donViTinh})
                  </option>
                ))}
              </select>
            </div>

            {selectedPart && (
              <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <span className="text-zinc-500">Tồn khả dụng</span>
                  <div className="font-mono font-bold text-zinc-900 text-sm">
                    {selectedPart.kpi.tonKhaDung} {selectedPart.donViTinh}
                  </div>
                </div>
                <div>
                  <span className="text-zinc-500">ROP / SS</span>
                  <div className="font-mono font-bold text-orange-700 text-sm">
                    {selectedPart.kpi.rop} / {selectedPart.kpi.safetyStock}
                  </div>
                </div>
                <div>
                  <span className="text-zinc-500">Trạng thái</span>
                  <div
                    className={`font-semibold text-xs ${
                      getStatusMeta(selectedPart.kpi.trangThai).textClass
                    }`}
                  >
                    {getStatusMeta(selectedPart.kpi.trangThai).label}
                  </div>
                </div>
              </div>
            )}

            {mode === 'DIEU_CHINH' && (
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Kiểu điều chỉnh kiểm kê
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDieuChinhMode('set_actual')}
                    className={`py-2 px-3 rounded-lg border font-semibold ${
                      dieuChinhMode === 'set_actual'
                        ? 'border-zinc-900 bg-zinc-900 text-white'
                        : 'border-zinc-200 bg-white text-zinc-700'
                    }`}
                  >
                    Nhập số tồn thực tế
                  </button>
                  <button
                    type="button"
                    onClick={() => setDieuChinhMode('delta')}
                    className={`py-2 px-3 rounded-lg border font-semibold ${
                      dieuChinhMode === 'delta'
                        ? 'border-zinc-900 bg-zinc-900 text-white'
                        : 'border-zinc-200 bg-white text-zinc-700'
                    }`}
                  >
                    Nhập chênh lệch (+/-)
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  {mode === 'DIEU_CHINH' && dieuChinhMode === 'set_actual'
                    ? 'Số lượng thực tế *'
                    : mode === 'DIEU_CHINH'
                    ? 'Chênh lệch (+/-) *'
                    : mode === 'NHAP_KHO'
                    ? 'Số lượng nhập *'
                    : 'Số lượng xuất *'}
                </label>
                <input
                  type="number"
                  required
                  min={mode === 'DIEU_CHINH' && dieuChinhMode === 'delta' ? undefined : mode === 'DIEU_CHINH' ? 0 : 1}
                  value={soLuong}
                  onChange={(e) => setSoLuong(Number(e.target.value))}
                  className="w-full h-10 px-3 rounded-lg border border-zinc-200 font-mono font-bold text-zinc-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  {mode === 'NHAP_KHO'
                    ? 'Ngày nhận hàng *'
                    : mode === 'XUAT_KHO'
                    ? 'Ngày xuất kho *'
                    : 'Ngày điều chỉnh *'}
                </label>
                <input
                  type="date"
                  required
                  value={ngayGiaoDich}
                  onChange={(e) => setNgayGiaoDich(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-zinc-200 font-mono"
                />
              </div>
            </div>

            {mode === 'NHAP_KHO' && (
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Nhà cung cấp
                </label>
                <select
                  value={nhaCungCapId}
                  onChange={(e) => setNhaCungCapId(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-zinc-200 bg-white"
                >
                  {state.suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.maNCC} - {s.tenNCC}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block font-semibold text-zinc-700 mb-1">
                {mode === 'NHAP_KHO'
                  ? 'Mã đơn hàng / Phiếu nhập'
                  : mode === 'XUAT_KHO'
                  ? 'Mã phiếu bảo hành hoặc sửa chữa *'
                  : 'Mã biên bản kiểm kê'}
              </label>
              <input
                type="text"
                required={mode === 'XUAT_KHO'}
                value={maChungTu}
                onChange={(e) => setMaChungTu(e.target.value)}
                placeholder={
                  mode === 'XUAT_KHO' ? 'VD: PBH-1205 hoặc PSC-2350' : 'VD: PO-2026-020'
                }
                className="w-full h-10 px-3 rounded-lg border border-zinc-200 font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 mb-1">
                {mode === 'DIEU_CHINH'
                  ? 'Lý do điều chỉnh tồn kho *'
                  : mode === 'XUAT_KHO'
                  ? 'Lý do sử dụng'
                  : 'Ghi chú nhập hàng'}
              </label>
              <textarea
                rows={2}
                required={mode === 'DIEU_CHINH'}
                value={lyDo}
                onChange={(e) => setLyDo(e.target.value)}
                placeholder={
                  mode === 'DIEU_CHINH'
                    ? 'Bắt buộc ghi rõ lý do (VD: Kiểm kê định kỳ phát hiện lệch 1 bộ hỏng)'
                    : mode === 'XUAT_KHO'
                    ? 'VD: Thay má phanh xe Vision bảo hành 12.000km'
                    : 'VD: Hàng giao đủ chứng từ, đạt chất lượng'
                }
                className="w-full p-3 rounded-lg border border-zinc-200"
              />
            </div>

            {/* Live Impact Preview */}
            {selectedPart && (
              <div className="p-3 rounded-lg border border-zinc-200 bg-zinc-50 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-zinc-600">
                  <span>Tồn kho dự kiến sau giao dịch:</span>
                  <span
                    className={`font-mono font-bold ${
                      previewStock.afterStock < 0 ? 'text-red-700' : 'text-zinc-900'
                    }`}
                  >
                    {selectedPart.tonHienTai} → {previewStock.afterStock} {selectedPart.donViTinh}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-zinc-600">
                  <span>Inventory Position dự kiến:</span>
                  <span className="font-mono font-bold text-zinc-900">
                    {previewStock.afterIp} {selectedPart.donViTinh} (ROP: {selectedPart.kpi.rop})
                  </span>
                </div>
                {previewStock.triggersRop && (
                  <div className="text-[11px] text-amber-800 font-semibold pt-1">
                    Lưu ý: Sau giao dịch này, IP ≤ ROP → Hệ thống sẽ tự động bật cảnh báo và tạo đề xuất đặt hàng chờ duyệt.
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className={`w-full h-10 rounded-lg font-bold text-white transition-colors disabled:opacity-50 ${
                mode === 'NHAP_KHO'
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : mode === 'XUAT_KHO'
                  ? 'bg-orange-600 hover:bg-orange-700'
                  : 'bg-zinc-900 hover:bg-zinc-800'
              }`}
            >
              {submitting
                ? 'Đang xử lý...'
                : mode === 'NHAP_KHO'
                ? 'Xác nhận nhập kho'
                : mode === 'XUAT_KHO'
                ? 'Xác nhận xuất kho'
                : 'Xác nhận điều chỉnh tồn kho'}
            </button>
          </form>
        </div>

        {/* Transaction Ledger */}
        <div className="lg:col-span-7 bg-white border border-zinc-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-zinc-900">
                Sổ nhật ký Nhập – Xuất – Điều chỉnh ({filteredTx.length})
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Giao dịch điều chỉnh được tách riêng và không tính vào nhu cầu tiêu thụ (ADD)
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-lg">
              {(
                [
                  { id: 'ALL', label: 'Tất cả' },
                  { id: 'NHAP_KHO', label: 'Nhập' },
                  { id: 'XUAT_KHO', label: 'Xuất' },
                  { id: 'DIEU_CHINH', label: 'Điều chỉnh' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setTxTypeFilter(tab.id)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                    txTypeFilter === tab.id
                      ? 'bg-white text-zinc-900 shadow-sm'
                      : 'text-zinc-600 hover:text-zinc-900'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto max-h-[640px]">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200 sticky top-0">
                <tr>
                  <th className="px-4 py-3 font-semibold">Thời gian</th>
                  <th className="px-4 py-3 font-semibold">Mã GD</th>
                  <th className="px-4 py-3 font-semibold">Phụ tùng</th>
                  <th className="px-4 py-3 font-semibold">Loại</th>
                  <th className="px-4 py-3 font-semibold text-right">SL</th>
                  <th className="px-4 py-3 font-semibold text-right">Tồn sau</th>
                  <th className="px-4 py-3 font-semibold">Chứng từ & Lý do</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredTx.map((tx) => {
                  const p = partMap.get(tx.phuTungId);
                  return (
                    <tr key={tx.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3 tabular-nums text-zinc-500 whitespace-nowrap">
                        {formatDateTime(tx.ngayGiaoDich)}
                      </td>
                      <td className="px-4 py-3 font-mono font-semibold text-zinc-900 whitespace-nowrap">
                        {tx.maGiaoDich}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-zinc-900">
                          {p?.maPhuTung ?? tx.phuTungId}
                        </div>
                        <div className="text-[11px] text-zinc-500 truncate max-w-[160px]">
                          {p?.tenPhuTung}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap font-semibold">
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
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-bold">
                        {tx.loaiGiaoDich === 'NHAP_KHO'
                          ? `+${tx.soLuong}`
                          : tx.loaiGiaoDich === 'XUAT_KHO'
                          ? `-${tx.soLuong}`
                          : tx.soLuong >= 0
                          ? `+${tx.soLuong}`
                          : tx.soLuong}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-900">
                        {formatNumber(tx.tonSauGiaoDich)}
                      </td>
                      <td className="px-4 py-3 min-w-[180px]">
                        <div className="font-mono text-zinc-800 font-medium">{tx.maChungTu}</div>
                        <div className="text-[11px] text-zinc-500">{tx.lyDo}</div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

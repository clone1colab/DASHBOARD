import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import type {
  AppStateResponse,
  HydratedPart,
  InventoryStatus,
  PhuTung,
  UserRole,
} from '../types/inventory';
import { formatCurrency, formatNumber, getStatusMeta } from '../lib/format';

interface PartsPageProps {
  state: AppStateResponse;
  role: UserRole;
  searchQuery: string;
  onSelectPart: (part: HydratedPart) => void;
  onCreatePart: (payload: Partial<PhuTung>) => Promise<void>;
  onUpdatePart: (id: string, payload: Partial<PhuTung>) => Promise<void>;
  onDeletePart: (id: string) => Promise<void>;
}

const DEFAULT_CATEGORIES = [
  'Hệ thống phanh',
  'Động cơ & Truyền động',
  'Dầu nhớt & Lọc',
  'Điện & Đánh lửa',
  'Lốp & Vành',
  'Phụ kiện thân vỏ',
];

export function PartsPage({
  state,
  role,
  searchQuery,
  onSelectPart,
  onCreatePart,
  onUpdatePart,
  onDeletePart,
}: PartsPageProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | InventoryStatus>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPart, setEditingPart] = useState<HydratedPart | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [form, setForm] = useState({
    maPhuTung: '',
    tenPhuTung: '',
    loaiPhuTung: DEFAULT_CATEGORIES[0],
    donViTinh: 'Cái',
    giaNhap: 80000,
    giaXuatThamKhao: 120000,
    nhaCungCapId: state.suppliers[0]?.id || 'NCC01',
    tonDauKy: 20,
    soLuongGiuCho: 0,
    phuongPhapSS: 'manual' as 'manual' | 'auto',
    safetyStockThuCong: 5,
    phuongPhapLT: 'manual' as 'manual' | 'history',
    leadTimeThuCong: 5,
    chiPhiDatHang: '150000',
    chiPhiLuuKhoNam: '24000',
    phuongPhapROQ: 'eoq' as 'eoq' | 'target',
    mucTonMucTieu: '40',
    quyCachDongGoi: 5,
    soLuongDatToiThieu: 10,
  });

  const categories = useMemo(() => {
    const set = new Set(DEFAULT_CATEGORIES);
    for (const p of state.parts) set.add(p.loaiPhuTung);
    return Array.from(set);
  }, [state.parts]);

  const filteredParts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return state.parts.filter((p) => {
      if (categoryFilter !== 'ALL' && p.loaiPhuTung !== categoryFilter) return false;
      if (statusFilter !== 'ALL' && p.kpi.trangThai !== statusFilter) return false;
      if (!q) return true;
      return (
        p.maPhuTung.toLowerCase().includes(q) ||
        p.tenPhuTung.toLowerCase().includes(q) ||
        p.loaiPhuTung.toLowerCase().includes(q) ||
        (p.nhaCungCap?.tenNCC.toLowerCase().includes(q) ?? false)
      );
    });
  }, [state.parts, categoryFilter, statusFilter, searchQuery]);

  const openAddModal = () => {
    setEditingPart(null);
    setErrorMsg(null);
    setForm({
      maPhuTung: `PT0${state.parts.length + 1}`,
      tenPhuTung: '',
      loaiPhuTung: DEFAULT_CATEGORIES[0],
      donViTinh: 'Cái',
      giaNhap: 80000,
      giaXuatThamKhao: 120000,
      nhaCungCapId: state.suppliers[0]?.id || 'NCC01',
      tonDauKy: 20,
      soLuongGiuCho: 0,
      phuongPhapSS: 'manual',
      safetyStockThuCong: 5,
      phuongPhapLT: 'manual',
      leadTimeThuCong: 5,
      chiPhiDatHang: '150000',
      chiPhiLuuKhoNam: '24000',
      phuongPhapROQ: 'eoq',
      mucTonMucTieu: '40',
      quyCachDongGoi: 5,
      soLuongDatToiThieu: 10,
    });
    setModalOpen(true);
  };

  const openEditModal = (part: HydratedPart, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPart(part);
    setErrorMsg(null);
    setForm({
      maPhuTung: part.maPhuTung,
      tenPhuTung: part.tenPhuTung,
      loaiPhuTung: part.loaiPhuTung,
      donViTinh: part.donViTinh,
      giaNhap: part.giaNhap,
      giaXuatThamKhao: part.giaXuatThamKhao,
      nhaCungCapId: part.nhaCungCapId,
      tonDauKy: part.tonDauKy,
      soLuongGiuCho: part.soLuongGiuCho,
      phuongPhapSS: part.phuongPhapSS,
      safetyStockThuCong: part.safetyStockThuCong ?? part.kpi.safetyStock,
      phuongPhapLT: part.phuongPhapLT,
      leadTimeThuCong: part.leadTimeThuCong ?? part.kpi.leadTime,
      chiPhiDatHang: part.chiPhiDatHang !== null ? String(part.chiPhiDatHang) : '',
      chiPhiLuuKhoNam: part.chiPhiLuuKhoNam !== null ? String(part.chiPhiLuuKhoNam) : '',
      phuongPhapROQ: part.phuongPhapROQ,
      mucTonMucTieu: part.mucTonMucTieu !== null ? String(part.mucTonMucTieu) : '',
      quyCachDongGoi: part.quyCachDongGoi,
      soLuongDatToiThieu: part.soLuongDatToiThieu,
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSubmitting(true);
    try {
      const payload: Partial<PhuTung> = {
        maPhuTung: form.maPhuTung,
        tenPhuTung: form.tenPhuTung,
        loaiPhuTung: form.loaiPhuTung,
        donViTinh: form.donViTinh,
        giaNhap: Number(form.giaNhap),
        giaXuatThamKhao: Number(form.giaXuatThamKhao),
        nhaCungCapId: form.nhaCungCapId,
        tonDauKy: Number(form.tonDauKy),
        soLuongGiuCho: Number(form.soLuongGiuCho),
        chiPhiDatHang: form.chiPhiDatHang ? Number(form.chiPhiDatHang) : null,
        chiPhiLuuKhoNam: form.chiPhiLuuKhoNam ? Number(form.chiPhiLuuKhoNam) : null,
        phuongPhapROQ: form.phuongPhapROQ,
        mucTonMucTieu: form.mucTonMucTieu ? Number(form.mucTonMucTieu) : null,
        quyCachDongGoi: Number(form.quyCachDongGoi),
        soLuongDatToiThieu: Number(form.soLuongDatToiThieu),
      };

      // Only attach threshold changes if new part OR Manager role
      if (!editingPart || role === 'QUAN_LY') {
        payload.phuongPhapSS = form.phuongPhapSS;
        payload.safetyStockThuCong =
          form.phuongPhapSS === 'manual' ? Number(form.safetyStockThuCong) : null;
        payload.phuongPhapLT = form.phuongPhapLT;
        payload.leadTimeThuCong =
          form.phuongPhapLT === 'manual' ? Number(form.leadTimeThuCong) : null;
      }

      if (editingPart) {
        await onUpdatePart(editingPart.id, payload);
      } else {
        await onCreatePart(payload);
      }
      setModalOpen(false);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Có lỗi xảy ra.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
            Danh mục phụ tùng ({filteredParts.length})
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
            Nhấn vào từng mã phụ tùng để xem chi tiết KPI, công thức kiểm tra và biểu đồ biến động tồn kho
          </p>
        </div>

        <button
          type="button"
          onClick={openAddModal}
          className="h-10 px-4 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm phụ tùng mới</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="bg-white border border-zinc-200 rounded-xl p-3.5 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-zinc-600 whitespace-nowrap">
            Loại phụ tùng:
          </label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-9 px-3 rounded-lg border border-zinc-200 bg-zinc-50 text-xs font-medium text-zinc-800 focus:outline-none focus:border-orange-500"
          >
            <option value="ALL">Tất cả loại</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1 p-1 bg-zinc-100 rounded-lg overflow-x-auto">
          {(
            [
              { id: 'ALL', label: 'Tất cả' },
              { id: 'DU_HANG', label: 'Đủ hàng' },
              { id: 'CAN_DAT_HANG', label: 'Cần đặt hàng' },
              { id: 'DUOI_SAFETY_STOCK', label: 'Dưới Safety Stock' },
              { id: 'HET_HANG', label: 'Hết hàng' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                statusFilter === tab.id
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-600 hover:text-zinc-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Parts Table */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Mã PT</th>
                <th className="px-4 py-3 font-semibold">Tên phụ tùng & Nhà cung cấp</th>
                <th className="px-4 py-3 font-semibold">Loại / ĐVT</th>
                <th className="px-4 py-3 font-semibold text-right">Giá nhập</th>
                <th className="px-4 py-3 font-semibold text-right">Giá xuất TK</th>
                <th className="px-4 py-3 font-semibold text-right">Tồn đầu kỳ</th>
                <th className="px-4 py-3 font-semibold text-right">Tồn hiện tại</th>
                <th className="px-4 py-3 font-semibold text-right">Safety Stock</th>
                <th className="px-4 py-3 font-semibold text-right">ROP</th>
                <th className="px-4 py-3 font-semibold text-right">Lead Time</th>
                <th className="px-4 py-3 font-semibold text-right">EOQ</th>
                <th className="px-4 py-3 font-semibold">Trạng thái</th>
                <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {filteredParts.map((part) => {
                const k = part.kpi;
                const statusMeta = getStatusMeta(k.trangThai);
                return (
                  <tr
                    key={part.id}
                    onClick={() => onSelectPart(part)}
                    className="hover:bg-zinc-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-mono font-bold text-zinc-900 whitespace-nowrap">
                      {part.maPhuTung}
                    </td>
                    <td className="px-4 py-3 min-w-[200px]">
                      <div className="font-semibold text-zinc-900">{part.tenPhuTung}</div>
                      <div className="text-[11px] text-zinc-500 truncate max-w-[240px]">
                        {part.nhaCungCap?.tenNCC ?? part.nhaCungCapId}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-zinc-600">
                      <div>{part.loaiPhuTung}</div>
                      <div className="text-[11px] text-zinc-400">ĐVT: {part.donViTinh}</div>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-700 whitespace-nowrap">
                      {formatCurrency(part.giaNhap)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-700 whitespace-nowrap">
                      {formatCurrency(part.giaXuatThamKhao)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-500">
                      {formatNumber(part.tonDauKy)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-zinc-900">
                      {formatNumber(part.tonHienTai)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-700">
                      {formatNumber(k.safetyStock)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-orange-700">
                      {formatNumber(k.rop, 1)}
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-600 whitespace-nowrap">
                      {k.leadTime} ngày
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-700 whitespace-nowrap">
                      {k.eoq !== null ? formatNumber(k.eoq) : 'Chưa đủ DL'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[11px] font-semibold ${statusMeta.bgClass} ${statusMeta.textClass} ${statusMeta.borderClass}`}
                      >
                        {k.trangThai === 'DU_HANG' ? (
                          <CheckCircle2 className="w-3 h-3" />
                        ) : (
                          <AlertTriangle className="w-3 h-3" />
                        )}
                        {statusMeta.label}
                      </span>
                    </td>
                    <td
                      className="px-4 py-3 text-right whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onSelectPart(part)}
                          className="p-1.5 rounded text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100"
                          title="Xem chi tiết KPI"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => openEditModal(part, e)}
                          className="p-1.5 rounded text-zinc-500 hover:text-orange-700 hover:bg-orange-50"
                          title="Chỉnh sửa"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        {role === 'QUAN_LY' && (
                          <button
                            type="button"
                            onClick={() => {
                              onDeletePart(part.id);
                            }}
                            className="p-1.5 rounded text-zinc-500 hover:text-red-700 hover:bg-red-50"
                            title="Xóa mã phụ tùng"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredParts.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-4 py-10 text-center text-zinc-500">
                    Không tìm thấy phụ tùng phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60">
          <div className="bg-white border border-zinc-200 rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden shadow-xl">
            <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between bg-zinc-50">
              <h2 className="text-base font-bold text-zinc-900">
                {editingPart
                  ? `Chỉnh sửa phụ tùng ${editingPart.maPhuTung}`
                  : 'Thêm phụ tùng mới vào danh mục'}
              </h2>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1.5 text-zinc-500 hover:text-zinc-900 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              {errorMsg && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Mã phụ tùng *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={Boolean(editingPart)}
                    value={form.maPhuTung}
                    onChange={(e) => setForm({ ...form, maPhuTung: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 font-mono uppercase disabled:bg-zinc-100"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Tên phụ tùng *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.tenPhuTung}
                    onChange={(e) => setForm({ ...form, tenPhuTung: e.target.value })}
                    placeholder="VD: Má phanh đĩa trước Vision"
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Loại phụ tùng</label>
                  <select
                    value={form.loaiPhuTung}
                    onChange={(e) => setForm({ ...form, loaiPhuTung: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Đơn vị tính</label>
                  <input
                    type="text"
                    required
                    value={form.donViTinh}
                    onChange={(e) => setForm({ ...form, donViTinh: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Nhà cung cấp</label>
                  <select
                    value={form.nhaCungCapId}
                    onChange={(e) => setForm({ ...form, nhaCungCapId: e.target.value })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white"
                  >
                    {state.suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.maNCC} - {s.tenNCC}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Giá nhập (đ)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={form.giaNhap}
                    onChange={(e) => setForm({ ...form, giaNhap: Number(e.target.value) })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Giá xuất tham khảo (đ)
                  </label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={form.giaXuatThamKhao}
                    onChange={(e) =>
                      setForm({ ...form, giaXuatThamKhao: Number(e.target.value) })
                    }
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">Tồn đầu kỳ</label>
                  <input
                    type="number"
                    min={0}
                    disabled={Boolean(editingPart)}
                    value={form.tonDauKy}
                    onChange={(e) => setForm({ ...form, tonDauKy: Number(e.target.value) })}
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 font-mono disabled:bg-zinc-100"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-zinc-700 mb-1">
                    Số lượng giữ chỗ
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.soLuongGiuCho}
                    onChange={(e) =>
                      setForm({ ...form, soLuongGiuCho: Number(e.target.value) })
                    }
                    className="w-full h-9 px-3 rounded-lg border border-zinc-200 font-mono"
                  />
                </div>
              </div>

              {/* KPI Parameters */}
              <div className="pt-3 border-t border-zinc-200">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-zinc-900">
                    Thông số quản trị tồn kho & Chi phí EOQ
                  </span>
                  {editingPart && role !== 'QUAN_LY' && (
                    <span className="text-[11px] text-amber-700 font-medium">
                      Chuyển sang vai trò Quản lý để sửa Safety Stock / Lead Time
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">
                      Phương pháp Safety Stock
                    </label>
                    <div className="flex gap-2">
                      <select
                        disabled={Boolean(editingPart && role !== 'QUAN_LY')}
                        value={form.phuongPhapSS}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            phuongPhapSS: e.target.value as 'manual' | 'auto',
                          })
                        }
                        className="flex-1 h-9 px-3 rounded-lg border border-zinc-200 bg-white disabled:bg-zinc-100"
                      >
                        <option value="manual">Nhập thủ công</option>
                        <option value="auto">Tự động (Max×MaxLT - Avg×AvgLT)</option>
                      </select>
                      {form.phuongPhapSS === 'manual' && (
                        <input
                          type="number"
                          min={0}
                          disabled={Boolean(editingPart && role !== 'QUAN_LY')}
                          value={form.safetyStockThuCong}
                          onChange={(e) =>
                            setForm({ ...form, safetyStockThuCong: Number(e.target.value) })
                          }
                          className="w-24 h-9 px-3 rounded-lg border border-zinc-200 font-mono disabled:bg-zinc-100"
                        />
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">
                      Lead Time giao hàng (ngày)
                    </label>
                    <div className="flex gap-2">
                      <select
                        disabled={Boolean(editingPart && role !== 'QUAN_LY')}
                        value={form.phuongPhapLT}
                        onChange={(e) =>
                          setForm({
                            ...form,
                            phuongPhapLT: e.target.value as 'manual' | 'history',
                          })
                        }
                        className="flex-1 h-9 px-3 rounded-lg border border-zinc-200 bg-white disabled:bg-zinc-100"
                      >
                        <option value="manual">Nhập thủ công</option>
                        <option value="history">Trung bình lịch sử đơn hàng</option>
                      </select>
                      {form.phuongPhapLT === 'manual' && (
                        <input
                          type="number"
                          min={0}
                          disabled={Boolean(editingPart && role !== 'QUAN_LY')}
                          value={form.leadTimeThuCong}
                          onChange={(e) =>
                            setForm({ ...form, leadTimeThuCong: Number(e.target.value) })
                          }
                          className="w-24 h-9 px-3 rounded-lg border border-zinc-200 font-mono disabled:bg-zinc-100"
                        />
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">
                      Chi phí mỗi lần đặt hàng S (đ/lần)
                    </label>
                    <input
                      type="number"
                      min={0}
                      placeholder="Để trống nếu chưa có"
                      value={form.chiPhiDatHang}
                      onChange={(e) => setForm({ ...form, chiPhiDatHang: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg border border-zinc-200 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">
                      Chi phí lưu kho/đơn vị/năm H (đ)
                    </label>
                    <input
                      type="number"
                      min={0}
                      placeholder="Để trống nếu chưa có"
                      value={form.chiPhiLuuKhoNam}
                      onChange={(e) => setForm({ ...form, chiPhiLuuKhoNam: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg border border-zinc-200 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-4">
                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">
                      Phương pháp ROQ
                    </label>
                    <select
                      value={form.phuongPhapROQ}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          phuongPhapROQ: e.target.value as 'eoq' | 'target',
                        })
                      }
                      className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white"
                    >
                      <option value="eoq">Theo EOQ</option>
                      <option value="target">Mức tồn mục tiêu</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">
                      Mức tồn mục tiêu
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={form.mucTonMucTieu}
                      onChange={(e) => setForm({ ...form, mucTonMucTieu: e.target.value })}
                      className="w-full h-9 px-3 rounded-lg border border-zinc-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">
                      Quy cách đóng gói
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={form.quyCachDongGoi}
                      onChange={(e) =>
                        setForm({ ...form, quyCachDongGoi: Number(e.target.value) })
                      }
                      className="w-full h-9 px-3 rounded-lg border border-zinc-200 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-zinc-700 mb-1">
                      Đặt tối thiểu (MOQ)
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={form.soLuongDatToiThieu}
                      onChange={(e) =>
                        setForm({ ...form, soLuongDatToiThieu: Number(e.target.value) })
                      }
                      className="w-full h-9 px-3 rounded-lg border border-zinc-200 font-mono"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="h-9 px-4 rounded-lg border border-zinc-200 text-zinc-700 font-semibold hover:bg-zinc-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="h-9 px-4 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-semibold"
                >
                  {submitting ? 'Đang lưu...' : editingPart ? 'Lưu thay đổi' : 'Thêm phụ tùng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

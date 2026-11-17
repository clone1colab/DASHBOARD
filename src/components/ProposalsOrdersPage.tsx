import React, { useState } from 'react';
import {
  Check,
  CheckCircle2,
  ClipboardCheck,
  FilePlus2,
  PackageCheck,
  Pencil,
  ShoppingCart,
  X,
  XCircle,
} from 'lucide-react';
import type { AppStateResponse, HydratedProposal, UserRole } from '../types/inventory';
import {
  formatCurrency,
  formatDate,
  formatNumber,
  getOrderStatusLabel,
  getProposalStatusLabel,
} from '../lib/format';

interface ProposalsOrdersPageProps {
  state: AppStateResponse;
  role: UserRole;
  onCreateProposal: (payload: {
    phuTungId: string;
    soLuongDeXuat: number;
    nhaCungCapId?: string;
    ghiChu?: string;
  }) => Promise<void>;
  onUpdateProposal: (
    id: string,
    payload: { soLuongDeXuat?: number; nhaCungCapId?: string; ghiChu?: string }
  ) => Promise<void>;
  onApproveProposal: (id: string) => Promise<void>;
  onRejectProposal: (id: string, lyDoTuChoi: string) => Promise<void>;
  onConvertProposalToOrder: (id: string) => Promise<void>;
  onReceiveOrder: (id: string) => Promise<void>;
  onCancelOrder: (id: string) => Promise<void>;
}

export function ProposalsOrdersPage({
  state,
  role,
  onCreateProposal,
  onUpdateProposal,
  onApproveProposal,
  onRejectProposal,
  onConvertProposalToOrder,
  onReceiveOrder,
  onCancelOrder,
}: ProposalsOrdersPageProps) {
  const [tab, setTab] = useState<'proposals' | 'orders'>('proposals');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editQty, setEditQty] = useState<number>(10);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(
    null
  );

  const [newProp, setNewProp] = useState({
    phuTungId: state.parts[0]?.id || 'PT001',
    soLuongDeXuat: state.parts[0]?.kpi.roq || 20,
    nhaCungCapId: state.parts[0]?.nhaCungCapId || 'NCC01',
    ghiChu: '',
  });

  const filteredProposals = state.proposals.filter(
    (p) => statusFilter === 'ALL' || p.trangThai === statusFilter
  );

  const runAction = async (id: string, fn: () => Promise<void>, successMsg: string) => {
    setFeedback(null);
    setBusyId(id);
    try {
      await fn();
      setFeedback({ type: 'success', msg: successMsg });
    } catch (err) {
      setFeedback({
        type: 'error',
        msg: err instanceof Error ? err.message : 'Thao tác thất bại.',
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveEditQty = async (prop: HydratedProposal) => {
    await runAction(
      prop.id,
      () => onUpdateProposal(prop.id, { soLuongDeXuat: editQty }),
      `Đã cập nhật số lượng đề xuất ${prop.maDeXuat} thành ${editQty}.`
    );
    setEditingId(null);
  };

  const handleConfirmReject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingId) return;
    const id = rejectingId;
    await runAction(
      id,
      () => onRejectProposal(id, rejectReason),
      'Đã từ chối đề xuất đặt hàng.'
    );
    setRejectingId(null);
    setRejectReason('');
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await runAction(
      'create',
      () => onCreateProposal(newProp),
      'Đã tạo đề xuất đặt hàng mới ở trạng thái Chờ duyệt.'
    );
    setCreateOpen(false);
  };

  const pendingCount = state.proposals.filter((p) => p.trangThai === 'CHO_DUYET').length;
  const activeOrdersCount = state.orders.filter((o) => o.trangThai === 'DANG_DAT').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
            Đề xuất đặt hàng & Đơn đặt hàng (PO)
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
            Quy trình phê duyệt: Tạo đề xuất → Quản lý duyệt → Phát hành PO → Nhận hàng tự động nhập kho
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            const firstPart = state.parts[0];
            if (firstPart) {
              setNewProp({
                phuTungId: firstPart.id,
                soLuongDeXuat: Math.max(firstPart.soLuongDatToiThieu, firstPart.kpi.roq || 10),
                nhaCungCapId: firstPart.nhaCungCapId,
                ghiChu: '',
              });
            }
            setCreateOpen(true);
          }}
          className="h-10 px-4 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 transition-colors whitespace-nowrap shrink-0 self-start"
        >
          <FilePlus2 className="w-4 h-4" />
          <span>Tạo đề xuất thủ công</span>
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between gap-3 ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          <span>{feedback.msg}</span>
          <button type="button" onClick={() => setFeedback(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Section Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center p-1 bg-white border border-zinc-200 rounded-lg">
          <button
            type="button"
            onClick={() => setTab('proposals')}
            className={`px-4 py-2 text-xs font-bold rounded-md transition-colors flex items-center gap-2 ${
              tab === 'proposals'
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" />
            <span>Đề xuất đặt hàng ({state.proposals.length})</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] rounded bg-amber-500 text-zinc-950 font-mono font-bold">
                {pendingCount} chờ duyệt
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab('orders')}
            className={`px-4 py-2 text-xs font-bold rounded-md transition-colors flex items-center gap-2 ${
              tab === 'orders'
                ? 'bg-zinc-900 text-white'
                : 'text-zinc-600 hover:text-zinc-900'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Đơn đặt hàng NCC ({state.orders.length})</span>
            {activeOrdersCount > 0 && (
              <span className="px-1.5 py-0.5 text-[10px] rounded bg-orange-600 text-white font-mono font-bold">
                {activeOrdersCount} đang đặt
              </span>
            )}
          </button>
        </div>

        {tab === 'proposals' && (
          <div className="inline-flex items-center gap-1 p-1 bg-white border border-zinc-200 rounded-lg">
            {[
              { id: 'ALL', label: 'Tất cả' },
              { id: 'CHO_DUYET', label: 'Chờ duyệt' },
              { id: 'DA_DUYET', label: 'Đã duyệt' },
              { id: 'DA_TAO_DON', label: 'Đã tạo đơn' },
              { id: 'TU_CHOI', label: 'Từ chối' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => setStatusFilter(st.id)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                  statusFilter === st.id
                    ? 'bg-zinc-100 text-zinc-900'
                    : 'text-zinc-500 hover:text-zinc-900'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Proposals Table */}
      {tab === 'proposals' && (
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
          {role !== 'QUAN_LY' && (
            <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-800 font-medium">
              Bạn đang ở vai trò Nhân viên kho: có thể tạo mới và điều chỉnh số lượng đề xuất đang chờ duyệt. Để Duyệt / Từ chối / Phát hành PO, vui lòng chuyển sang vai trò Quản lý ở thanh bên trái.
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200">
                <tr>
                  <th className="px-3.5 py-3 font-semibold">Mã đề xuất</th>
                  <th className="px-3.5 py-3 font-semibold">Mã PT</th>
                  <th className="px-3.5 py-3 font-semibold">Tên phụ tùng</th>
                  <th className="px-3.5 py-3 font-semibold text-right">Tồn hiện tại</th>
                  <th className="px-3.5 py-3 font-semibold text-right">IP</th>
                  <th className="px-3.5 py-3 font-semibold text-right">ROP</th>
                  <th className="px-3.5 py-3 font-semibold text-right">SS</th>
                  <th className="px-3.5 py-3 font-semibold text-right">EOQ</th>
                  <th className="px-3.5 py-3 font-semibold text-right">SL đề xuất</th>
                  <th className="px-3.5 py-3 font-semibold">Nhà cung cấp</th>
                  <th className="px-3.5 py-3 font-semibold text-right">Giá trị dự kiến</th>
                  <th className="px-3.5 py-3 font-semibold">Trạng thái</th>
                  <th className="px-3.5 py-3 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredProposals.map((prop) => {
                  const st = getProposalStatusLabel(prop.trangThai);
                  const part = prop.phuTung;
                  const isEditing = editingId === prop.id;
                  const currentStock = part ? part.tonHienTai : prop.tonHienTaiLucTao;
                  const currentIp = part ? part.kpi.inventoryPosition : prop.inventoryPositionLucTao;
                  const currentRop = part ? part.kpi.rop : prop.ropLucTao;
                  const currentSs = part ? part.kpi.safetyStock : prop.safetyStockLucTao;
                  const currentEoq = part ? part.kpi.eoq : prop.eoqThamKhao;

                  return (
                    <tr key={prop.id} className="hover:bg-zinc-50">
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <div className="font-mono font-bold text-zinc-900">{prop.maDeXuat}</div>
                        <div className="text-[11px] text-zinc-400">
                          {formatDate(prop.ngayTao)}
                        </div>
                      </td>
                      <td className="px-3.5 py-3 font-mono font-semibold text-zinc-900 whitespace-nowrap">
                        {part?.maPhuTung ?? prop.phuTungId}
                      </td>
                      <td className="px-3.5 py-3 min-w-[160px]">
                        <div className="font-medium text-zinc-900">{part?.tenPhuTung}</div>
                        <div className="text-[11px] text-zinc-400 truncate max-w-[200px]">
                          {prop.ghiChu}
                        </div>
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono tabular-nums font-semibold">
                        {formatNumber(currentStock)}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono tabular-nums">
                        {formatNumber(currentIp)}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono tabular-nums text-orange-700 font-semibold">
                        {formatNumber(currentRop, 1)}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono tabular-nums">
                        {formatNumber(currentSs)}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono tabular-nums text-zinc-600">
                        {currentEoq !== null ? formatNumber(currentEoq) : '—'}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono tabular-nums">
                        {isEditing ? (
                          <div className="inline-flex items-center gap-1">
                            <input
                              type="number"
                              min={1}
                              value={editQty}
                              onChange={(e) => setEditQty(Number(e.target.value))}
                              className="w-16 h-7 px-2 rounded border border-orange-500 text-right font-mono font-bold"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveEditQty(prop)}
                              className="p-1 bg-emerald-600 text-white rounded"
                              title="Lưu"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="p-1 bg-zinc-200 text-zinc-700 rounded"
                              title="Hủy"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <span className="font-bold text-zinc-900">
                            {formatNumber(prop.soLuongDeXuat)} {part?.donViTinh}
                          </span>
                        )}
                      </td>
                      <td className="px-3.5 py-3 max-w-[160px] truncate text-zinc-700">
                        {prop.nhaCungCap?.maNCC ?? prop.nhaCungCapId}
                      </td>
                      <td className="px-3.5 py-3 text-right font-mono tabular-nums font-semibold text-zinc-900 whitespace-nowrap">
                        {formatCurrency(prop.giaTriDuKien)}
                      </td>
                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-semibold ${st.bgClass} ${st.textClass}`}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {prop.trangThai === 'CHO_DUYET' && !isEditing && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(prop.id);
                                setEditQty(prop.soLuongDeXuat);
                              }}
                              className="p-1.5 rounded border border-zinc-200 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-50"
                              title="Sửa số lượng đề xuất"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {prop.trangThai === 'CHO_DUYET' && role === 'QUAN_LY' && (
                            <>
                              <button
                                type="button"
                                disabled={busyId === prop.id}
                                onClick={() =>
                                  runAction(
                                    prop.id,
                                    () => onApproveProposal(prop.id),
                                    `Đã phê duyệt đề xuất ${prop.maDeXuat}.`
                                  )
                                }
                                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold inline-flex items-center gap-1"
                              >
                                <CheckCircle2 className="w-3 h-3" />
                                Duyệt
                              </button>
                              <button
                                type="button"
                                disabled={busyId === prop.id}
                                onClick={() => setRejectingId(prop.id)}
                                className="px-2.5 py-1 rounded border border-red-200 text-red-700 hover:bg-red-50 font-semibold inline-flex items-center gap-1"
                              >
                                <XCircle className="w-3 h-3" />
                                Từ chối
                              </button>
                            </>
                          )}

                          {prop.trangThai === 'DA_DUYET' && role === 'QUAN_LY' && (
                            <button
                              type="button"
                              disabled={busyId === prop.id}
                              onClick={() =>
                                runAction(
                                  prop.id,
                                  () => onConvertProposalToOrder(prop.id),
                                  `Đã chuyển đề xuất ${prop.maDeXuat} thành Đơn đặt hàng.`
                                )
                              }
                              className="px-2.5 py-1 rounded bg-orange-600 hover:bg-orange-700 text-white font-semibold inline-flex items-center gap-1"
                            >
                              <ShoppingCart className="w-3 h-3" />
                              Tạo đơn đặt hàng
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filteredProposals.length === 0 && (
                  <tr>
                    <td colSpan={13} className="px-4 py-10 text-center text-zinc-500">
                      Không có đề xuất đặt hàng nào trong trạng thái này.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Orders Table */}
      {tab === 'orders' && (
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Mã đơn hàng</th>
                  <th className="px-4 py-3 font-semibold">Nhà cung cấp</th>
                  <th className="px-4 py-3 font-semibold">Chi tiết phụ tùng đặt</th>
                  <th className="px-4 py-3 font-semibold">Ngày đặt</th>
                  <th className="px-4 py-3 font-semibold">Dự kiến giao</th>
                  <th className="px-4 py-3 font-semibold text-right">Lead Time thực tế</th>
                  <th className="px-4 py-3 font-semibold text-right">Tổng giá trị</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái</th>
                  <th className="px-4 py-3 font-semibold text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {state.orders.map((order) => {
                  const st = getOrderStatusLabel(order.trangThai);
                  return (
                    <tr key={order.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3 font-mono font-bold text-zinc-900 whitespace-nowrap">
                        {order.maDonHang}
                      </td>
                      <td className="px-4 py-3 text-zinc-700 max-w-[200px] truncate">
                        {order.nhaCungCap?.tenNCC ?? order.nhaCungCapId}
                      </td>
                      <td className="px-4 py-3">
                        {order.chiTiet.map((item) => (
                          <div key={item.id} className="text-zinc-800">
                            <span className="font-mono font-semibold">
                              {item.phuTung?.maPhuTung ?? item.phuTungId}
                            </span>
                            {' · '}
                            {item.phuTung?.tenPhuTung} —{' '}
                            <strong className="font-mono">
                              {item.soLuongDat} {item.phuTung?.donViTinh}
                            </strong>
                          </div>
                        ))}
                      </td>
                      <td className="px-4 py-3 tabular-nums text-zinc-600 whitespace-nowrap">
                        {formatDate(order.ngayDat)}
                      </td>
                      <td className="px-4 py-3 tabular-nums whitespace-nowrap">
                        <span
                          className={
                            order.isOverdue
                              ? 'text-red-700 font-bold'
                              : order.isDueSoon
                              ? 'text-amber-700 font-semibold'
                              : 'text-zinc-600'
                          }
                        >
                          {formatDate(order.ngayGiaoDuKien)}
                          {order.isOverdue && ' (Trễ hạn)'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-700">
                        {order.leadTimeThucTe ? `${order.leadTimeThucTe} ngày` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-zinc-900 whitespace-nowrap">
                        {formatCurrency(order.tongGiaTri)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-block px-2 py-0.5 rounded font-semibold ${st.bgClass} ${st.textClass}`}
                        >
                          {st.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {order.trangThai === 'DANG_DAT' && (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              disabled={busyId === order.id}
                              onClick={() =>
                                runAction(
                                  order.id,
                                  () => onReceiveOrder(order.id),
                                  `Đã nhận hàng đơn ${order.maDonHang}, tự động tạo giao dịch nhập kho và cập nhật tồn kho + KPI.`
                                )
                              }
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold inline-flex items-center gap-1.5"
                            >
                              <PackageCheck className="w-3.5 h-3.5" />
                              Đánh dấu đã nhận
                            </button>
                            {role === 'QUAN_LY' && (
                              <button
                                type="button"
                                disabled={busyId === order.id}
                                onClick={() =>
                                  runAction(
                                    order.id,
                                    () => onCancelOrder(order.id),
                                    `Đã hủy đơn hàng ${order.maDonHang}.`
                                  )
                                }
                                className="px-2.5 py-1.5 rounded-lg border border-zinc-200 text-zinc-600 hover:text-red-700 hover:bg-red-50 font-semibold"
                              >
                                Hủy
                              </button>
                            )}
                          </div>
                        )}
                        {order.trangThai === 'DA_NHAN' && (
                          <span className="text-[11px] text-zinc-400">
                            Nhận ngày {formatDate(order.ngayNhanThucTe)}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reject Reason Modal */}
      {rejectingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60">
          <form
            onSubmit={handleConfirmReject}
            className="bg-white border border-zinc-200 rounded-xl w-full max-w-md p-5 space-y-4 shadow-xl"
          >
            <h3 className="text-base font-bold text-zinc-900">Từ chối đề xuất đặt hàng</h3>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1">
                Lý do từ chối
              </label>
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="VD: Chờ gom đơn chung nhà cung cấp vào đầu tuần sau"
                className="w-full p-3 rounded-lg border border-zinc-200 text-xs"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRejectingId(null)}
                className="px-4 py-2 rounded-lg border border-zinc-200 text-xs font-semibold text-zinc-700"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-xs font-semibold text-white"
              >
                Xác nhận từ chối
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Create Manual Proposal Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/60">
          <form
            onSubmit={handleCreateSubmit}
            className="bg-white border border-zinc-200 rounded-xl w-full max-w-lg p-5 space-y-4 text-xs shadow-xl"
          >
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
              <h3 className="text-base font-bold text-zinc-900">Tạo đề xuất đặt hàng mới</h3>
              <button type="button" onClick={() => setCreateOpen(false)}>
                <X className="w-5 h-5 text-zinc-400" />
              </button>
            </div>

            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Phụ tùng</label>
              <select
                value={newProp.phuTungId}
                onChange={(e) => {
                  const p = state.parts.find((item) => item.id === e.target.value);
                  setNewProp({
                    ...newProp,
                    phuTungId: e.target.value,
                    soLuongDeXuat: p ? Math.max(p.soLuongDatToiThieu, p.kpi.roq || 10) : 10,
                    nhaCungCapId: p?.nhaCungCapId || newProp.nhaCungCapId,
                  });
                }}
                className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white"
              >
                {state.parts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.maPhuTung} - {p.tenPhuTung} (Tồn: {p.tonHienTai}, ROP: {p.kpi.rop})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">
                  Số lượng đề xuất đặt
                </label>
                <input
                  type="number"
                  min={1}
                  required
                  value={newProp.soLuongDeXuat}
                  onChange={(e) =>
                    setNewProp({ ...newProp, soLuongDeXuat: Number(e.target.value) })
                  }
                  className="w-full h-9 px-3 rounded-lg border border-zinc-200 font-mono font-bold"
                />
              </div>
              <div>
                <label className="block font-semibold text-zinc-700 mb-1">Nhà cung cấp</label>
                <select
                  value={newProp.nhaCungCapId}
                  onChange={(e) => setNewProp({ ...newProp, nhaCungCapId: e.target.value })}
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

            <div>
              <label className="block font-semibold text-zinc-700 mb-1">Ghi chú đề xuất</label>
              <textarea
                rows={2}
                value={newProp.ghiChu}
                onChange={(e) => setNewProp({ ...newProp, ghiChu: e.target.value })}
                placeholder="VD: Chuẩn bị phụ tùng cho chiến dịch bảo dưỡng cuối tháng"
                className="w-full p-2.5 rounded-lg border border-zinc-200"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-zinc-200">
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="px-4 py-2 rounded-lg border border-zinc-200 font-semibold text-zinc-700"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-orange-600 hover:bg-orange-700 font-semibold text-white"
              >
                Gửi đề xuất chờ duyệt
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

import type { InventoryStatus, ProposalStatus, PurchaseOrderStatus, TransactionType } from '../types/inventory';

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return `${Math.round(value).toLocaleString('vi-VN')} đ`;
}

export function formatNumber(value: number | null | undefined, decimals = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';
  return value.toLocaleString('vi-VN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function getStatusMeta(status: InventoryStatus): {
  label: string;
  textClass: string;
  bgClass: string;
  borderClass: string;
} {
  switch (status) {
    case 'DU_HANG':
      return {
        label: 'Đủ hàng',
        textClass: 'text-emerald-700',
        bgClass: 'bg-emerald-50',
        borderClass: 'border-emerald-200',
      };
    case 'CAN_DAT_HANG':
      return {
        label: 'Cần đặt hàng',
        textClass: 'text-amber-700',
        bgClass: 'bg-amber-50',
        borderClass: 'border-amber-200',
      };
    case 'DUOI_SAFETY_STOCK':
      return {
        label: 'Dưới tồn kho an toàn',
        textClass: 'text-orange-700',
        bgClass: 'bg-orange-50',
        borderClass: 'border-orange-200',
      };
    case 'HET_HANG':
      return {
        label: 'Hết hàng',
        textClass: 'text-red-700',
        bgClass: 'bg-red-50',
        borderClass: 'border-red-200',
      };
  }
}

export function getProposalStatusLabel(status: ProposalStatus): {
  label: string;
  textClass: string;
  bgClass: string;
} {
  switch (status) {
    case 'CHO_DUYET':
      return { label: 'Chờ duyệt', textClass: 'text-amber-800', bgClass: 'bg-amber-50' };
    case 'DA_DUYET':
      return { label: 'Đã duyệt', textClass: 'text-emerald-800', bgClass: 'bg-emerald-50' };
    case 'TU_CHOI':
      return { label: 'Từ chối', textClass: 'text-red-800', bgClass: 'bg-red-50' };
    case 'DA_TAO_DON':
      return { label: 'Đã tạo đơn', textClass: 'text-zinc-700', bgClass: 'bg-zinc-100' };
  }
}

export function getOrderStatusLabel(status: PurchaseOrderStatus): {
  label: string;
  textClass: string;
  bgClass: string;
} {
  switch (status) {
    case 'DANG_DAT':
      return { label: 'Đang đặt hàng', textClass: 'text-amber-800', bgClass: 'bg-amber-50' };
    case 'DA_NHAN':
      return { label: 'Đã nhận hàng', textClass: 'text-emerald-800', bgClass: 'bg-emerald-50' };
    case 'DA_HUY':
      return { label: 'Đã hủy', textClass: 'text-zinc-600', bgClass: 'bg-zinc-100' };
  }
}

export function getTransactionTypeLabel(type: TransactionType): string {
  switch (type) {
    case 'NHAP_KHO':
      return 'Nhập kho';
    case 'XUAT_KHO':
      return 'Xuất kho';
    case 'DIEU_CHINH':
      return 'Điều chỉnh';
  }
}

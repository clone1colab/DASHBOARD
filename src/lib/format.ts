import type { SheetDecisionStatus, TransactionType } from '../types/inventory';

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
    second: '2-digit',
  });
}

export function getSheetStatusMeta(status: SheetDecisionStatus): {
  textClass: string;
  bgClass: string;
  borderClass: string;
} {
  switch (status) {
    case 'HET_HANG':
      return {
        textClass: 'text-red-800',
        bgClass: 'bg-red-50',
        borderClass: 'border-red-300',
      };
    case 'DAT_NGAY':
      return {
        textClass: 'text-red-700',
        bgClass: 'bg-red-50',
        borderClass: 'border-red-200',
      };
    case 'CHUAN_BI_DAT':
      return {
        textClass: 'text-amber-800',
        bgClass: 'bg-amber-50',
        borderClass: 'border-amber-300',
      };
    case 'DU_HANG':
      return {
        textClass: 'text-emerald-700',
        bgClass: 'bg-emerald-50',
        borderClass: 'border-emerald-200',
      };
  }
}

export function getTransactionTypeLabel(type: TransactionType): string {
  return type === 'NHAP_NCC' ? 'NHAP_NCC (Nhập NCC)' : 'XUAT_SUA_CHUA (Xuất sửa chữa)';
}

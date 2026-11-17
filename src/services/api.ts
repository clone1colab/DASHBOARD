import type {
  AppStateResponse,
  DashboardPeriodFilter,
  KpiWindowDays,
  PhuTung,
  UserRole,
} from '../types/inventory';

export interface UserContext {
  role: UserRole;
  name: string;
}

async function requestJson<T>(
  url: string,
  options: RequestInit = {},
  user?: UserContext
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (user) {
    headers['x-user-role'] = user.role;
    headers['x-user-name'] = encodeURIComponent(user.name);
  }
  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Lỗi máy chủ (${res.status})`);
  }
  return data as T;
}

export const api = {
  getState(period: DashboardPeriodFilter, kpiDays: KpiWindowDays) {
    return requestJson<AppStateResponse>(`/api/state?period=${period}&kpiDays=${kpiDays}`);
  },

  createPart(payload: Partial<PhuTung>, user: UserContext) {
    return requestJson<{ ok: boolean; part: PhuTung }>(
      '/api/parts',
      { method: 'POST', body: JSON.stringify(payload) },
      user
    );
  },

  updatePart(id: string, payload: Partial<PhuTung>, user: UserContext) {
    return requestJson<{ ok: boolean; part: PhuTung }>(
      `/api/parts/${id}`,
      { method: 'PUT', body: JSON.stringify(payload) },
      user
    );
  },

  deletePart(id: string, user: UserContext) {
    return requestJson<{ ok: boolean }>(`/api/parts/${id}`, { method: 'DELETE' }, user);
  },

  createTransaction(
    payload: {
      phuTungId: string;
      loaiGiaoDich: 'NHAP_KHO' | 'XUAT_KHO' | 'DIEU_CHINH';
      soLuong: number;
      ngayGiaoDich?: string;
      nhaCungCapId?: string;
      maChungTu?: string;
      lyDo?: string;
      dieuChinhMode?: 'delta' | 'set_actual';
    },
    user: UserContext
  ) {
    return requestJson<{
      ok: boolean;
      oldStock: number;
      newStock: number;
      autoProposalCreated: { maDeXuat: string; soLuongDeXuat: number } | null;
    }>('/api/transactions', { method: 'POST', body: JSON.stringify(payload) }, user);
  },

  createPartRequest(
    payload: {
      phuTungId: string;
      maPhieuSuaChua: string;
      soLuongYeuCau: number;
      soLuongDapUng: number;
      ghiChu?: string;
    },
    user: UserContext
  ) {
    return requestJson<{ ok: boolean }>(
      '/api/requests',
      { method: 'POST', body: JSON.stringify(payload) },
      user
    );
  },

  createProposal(
    payload: {
      phuTungId: string;
      soLuongDeXuat: number;
      nhaCungCapId?: string;
      ghiChu?: string;
    },
    user: UserContext
  ) {
    return requestJson<{ ok: boolean }>(
      '/api/proposals',
      { method: 'POST', body: JSON.stringify(payload) },
      user
    );
  },

  updateProposal(
    id: string,
    payload: { soLuongDeXuat?: number; nhaCungCapId?: string; ghiChu?: string },
    user: UserContext
  ) {
    return requestJson<{ ok: boolean }>(
      `/api/proposals/${id}`,
      { method: 'PUT', body: JSON.stringify(payload) },
      user
    );
  },

  approveProposal(id: string, user: UserContext) {
    return requestJson<{ ok: boolean }>(
      `/api/proposals/${id}/approve`,
      { method: 'POST' },
      user
    );
  },

  rejectProposal(id: string, lyDoTuChoi: string, user: UserContext) {
    return requestJson<{ ok: boolean }>(
      `/api/proposals/${id}/reject`,
      { method: 'POST', body: JSON.stringify({ lyDoTuChoi }) },
      user
    );
  },

  convertProposalToOrder(id: string, user: UserContext) {
    return requestJson<{ ok: boolean }>(
      `/api/proposals/${id}/convert-to-order`,
      { method: 'POST' },
      user
    );
  },

  receiveOrder(id: string, user: UserContext) {
    return requestJson<{ ok: boolean }>(
      `/api/orders/${id}/receive`,
      { method: 'POST' },
      user
    );
  },

  cancelOrder(id: string, user: UserContext) {
    return requestJson<{ ok: boolean }>(
      `/api/orders/${id}/cancel`,
      { method: 'POST' },
      user
    );
  },

  markAlertsRead() {
    return requestJson<{ ok: boolean }>('/api/alerts/mark-read', { method: 'POST' });
  },

  resolveAlert(id: string) {
    return requestJson<{ ok: boolean }>(`/api/alerts/${id}/resolve`, { method: 'POST' });
  },

  createSupplier(
    payload: {
      maNCC: string;
      tenNCC: string;
      nguoiLienHe: string;
      soDienThoai: string;
      email: string;
      diaChi: string;
      leadTimeMacDinh: number;
      ghiChu: string;
    },
    user: UserContext
  ) {
    return requestJson<{ ok: boolean }>(
      '/api/suppliers',
      { method: 'POST', body: JSON.stringify(payload) },
      user
    );
  },

  updateConfig(payload: Record<string, unknown>, user: UserContext) {
    return requestJson<{ ok: boolean }>(
      '/api/config',
      { method: 'PUT', body: JSON.stringify(payload) },
      user
    );
  },

  syncGoogleSheets(user: UserContext) {
    return requestJson<{ ok: boolean }>(
      '/api/integrations/sheets-sync',
      { method: 'POST' },
      user
    );
  },

  testEmailAlert(user: UserContext) {
    return requestJson<{ ok: boolean }>(
      '/api/integrations/test-email',
      { method: 'POST' },
      user
    );
  },

  resetDemo(user: UserContext) {
    return requestJson<{ ok: boolean }>('/api/demo/reset', { method: 'POST' }, user);
  },
};

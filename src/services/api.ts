import type { GoogleSheetReferenceResponse } from '../types/inventory';

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error || `Lỗi máy chủ (HTTP ${res.status})`
    );
  }
  return data as T;
}

export const api = {
  getSheetReference: () =>
    requestJson<GoogleSheetReferenceResponse>('/api/sheets/reference'),
};

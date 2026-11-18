import React, { useState } from 'react';
import {
  CheckCircle2,
  Database,
  ExternalLink,
  FileSpreadsheet,
  Flame,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import type { SheetsStateResponse } from '../types/inventory';
import { formatDateTime } from '../lib/format';

interface SettingsSyncPageProps {
  state: SheetsStateResponse | null;
  onSyncNow: () => Promise<void>;
}

export function SettingsSyncPage({ state, onSyncNow }: SettingsSyncPageProps) {
  const [busy, setBusy] = useState(false);

  const spreadsheetId =
    state?.spreadsheetId || '1ymcTmAv-OM19iTKy925DBrifHDlHM60Dof4Svj32YLs';
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  const sys = state?.systemStatus;

  const handleSync = async () => {
    setBusy(true);
    try {
      await onSyncNow();
    } finally {
      setBusy(false);
    }
  };

  const sheetModeLabel =
    sys?.sheetsReadMode === 'SERVICE_ACCOUNT_RO'
      ? 'Google Sheets API Chỉ đọc (Service Account)'
      : 'Google Sheets Chỉ đọc công khai (gviz)';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
            Firebase Firestore & Đồng Bộ Google Sheets
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
            Kết nối tự động bằng <strong>Firebase tích hợp sẵn trong Google AI Studio</strong> · Không cần nhập bất kỳ Secret Value nào
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <a
            href={sheetUrl}
            target="_blank"
            rel="noreferrer"
            className="h-9 px-3.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 inline-flex items-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Mở Google Sheets (Gốc)
          </a>
          <button
            type="button"
            disabled={busy}
            onClick={handleSync}
            className="h-9 px-4 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
            Làm mới Google Sheets
          </button>
        </div>
      </div>

      {/* Live Diagnostics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-700">
            <Flame className="w-4 h-4 text-orange-600" />
            Firebase Firestore (Thời gian thực)
          </div>
          <div className="text-xs text-emerald-700 font-semibold flex items-start gap-1.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
            <span>Đã kết nối tự động · Đồng bộ tức thì mọi thiết bị</span>
          </div>
          <div className="text-[11px] text-zinc-500 space-y-0.5 font-mono break-all">
            <div>Project: {sys?.firebaseProjectId || '—'}</div>
            <div>DB: {sys?.firestoreDatabaseId || '—'}</div>
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-700">
            <FileSpreadsheet className="w-4 h-4 text-orange-600" />
            Google Sheets (Chỉ đọc)
          </div>
          <div className="text-xs text-zinc-800 font-semibold">{sheetModeLabel}</div>
          <div className="text-[11px] text-zinc-500 leading-relaxed">
            Đọc Danh mục phụ tùng, THAM SO và nạp dữ liệu nền ban đầu (GD001–GD027) vào Firestore 1 lần duy nhất. Không ghi ngược lên Sheets.
          </div>
        </div>

        <div className="bg-white border border-zinc-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-zinc-700">
            <Database className="w-4 h-4 text-orange-600" />
            Số liệu đang đồng bộ
          </div>
          <div className="text-xs text-zinc-700 space-y-1">
            <div>
              Danh mục đang quản lý:{' '}
              <strong className="font-mono">{state?.items.length ?? 0}</strong> mã phụ tùng
            </div>
            <div>
              Tổng giao dịch lịch sử:{' '}
              <strong className="font-mono">{state?.transactions.length ?? 0}</strong> phiếu
            </div>
            <div className="text-[11px] text-zinc-500">
              Đọc Google Sheets gần nhất: {formatDateTime(state?.syncedAt)}
            </div>
          </div>
        </div>
      </div>

      {/* Architecture & Security Overview */}
      <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4 text-xs leading-relaxed text-zinc-700">
        <div className="flex items-center gap-2 border-b border-zinc-200 pb-2.5">
          <ShieldCheck className="w-4 h-4 text-orange-600 shrink-0" />
          <h2 className="text-sm font-bold text-zinc-900">
            Cơ chế hoạt động & đồng bộ không cần Secret Value
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200 space-y-1.5">
            <div className="font-bold text-zinc-900">1. Không cần Secret Value</div>
            <p className="text-zinc-600">
              Cấu hình kết nối nằm sẵn trong <code className="font-mono">firebase-applet-config.json</code> do Google AI Studio cấp tự động. Khi bạn chạy trên AI Studio hay deploy lên Vercel đều không cần tự tạo biến bí mật database.
            </p>
          </div>
          <div className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200 space-y-1.5">
            <div className="font-bold text-zinc-900">2. Đồng bộ đa thiết bị tức thì</div>
            <p className="text-zinc-600">
              Mọi phiếu nhập/xuất được ghi nguyên tử vào Firestore (<code className="font-mono">inventory_transactions</code>) và đẩy thời gian thực qua <code className="font-mono">onSnapshot</code> tới toàn bộ máy tính/điện thoại khác đang mở web.
            </p>
          </div>
          <div className="p-3.5 rounded-lg bg-zinc-50 border border-zinc-200 space-y-1.5">
            <div className="font-bold text-zinc-900">3. Bảo vệ dữ liệu sổ kho</div>
            <p className="text-zinc-600">
              Firestore Security Rules chỉ cho phép thêm giao dịch hợp lệ đúng cấu trúc, nghiêm cấm sửa hoặc xóa lịch sử giao dịch cũ, kiểm soát chống xuất âm kho và chống ghi trùng phiếu.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

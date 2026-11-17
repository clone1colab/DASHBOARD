import React, { useState } from 'react';
import {
  Check,
  Copy,
  Database,
  Mail,
  Plus,
  RefreshCw,
  RotateCcw,
  Truck,
} from 'lucide-react';
import type {
  AppStateResponse,
  KpiWindowDays,
  RoqMethod,
  UserRole,
} from '../types/inventory';
import { formatDateTime } from '../lib/format';

interface SettingsSyncPageProps {
  state: AppStateResponse;
  role: UserRole;
  onCreateSupplier: (payload: {
    maNCC: string;
    tenNCC: string;
    nguoiLienHe: string;
    soDienThoai: string;
    email: string;
    diaChi: string;
    leadTimeMacDinh: number;
    ghiChu: string;
  }) => Promise<void>;
  onUpdateConfig: (payload: Record<string, unknown>) => Promise<void>;
  onSyncGoogleSheets: () => Promise<void>;
  onResetDemo: () => Promise<void>;
}

const APPS_SCRIPT_SNIPPET = `function doPost(e) {
  var payload = JSON.parse(e.postData.contents);
  var ss = SpreadsheetApp.openById(payload.spreadsheetId);
  if (payload.action === 'SYNC_TIENTHU_INVENTORY') {
    var tables = payload.tables;
    Object.keys(tables).forEach(function(sheetName) {
      var sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
      sheet.clearContents();
      var rows = Array.isArray(tables[sheetName]) ? tables[sheetName] : [tables[sheetName]];
      if (rows.length > 0) {
        var headers = Object.keys(rows[0]);
        sheet.appendRow(headers);
        rows.forEach(function(r) {
          sheet.appendRow(headers.map(function(h) { return r[h] !== undefined ? String(r[h]) : ''; }));
        });
      }
    });
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  }
  if (payload.action === 'SEND_ALERT_EMAIL') {
    MailApp.sendEmail(payload.to, payload.subject, payload.body);
    return ContentService.createTextOutput(JSON.stringify({ ok: true })).setMimeType(ContentService.MimeType.JSON);
  }
}`;

export function SettingsSyncPage({
  state,
  role,
  onCreateSupplier,
  onUpdateConfig,
  onSyncGoogleSheets,
  onResetDemo,
}: SettingsSyncPageProps) {
  const cfg = state.config;
  const [kpiDays, setKpiDays] = useState<KpiWindowDays>(cfg.kyPhanTichMacDinh);
  const [roqMethod, setRoqMethod] = useState<RoqMethod>(cfg.phuongPhapROQMacDinh);
  const [spreadsheetId, setSpreadsheetId] = useState(cfg.googleSheetsConfig.spreadsheetId || '');
  const [appsScriptUrl, setAppsScriptUrl] = useState(cfg.googleSheetsConfig.appsScriptUrl || '');
  const [recipientEmail, setRecipientEmail] = useState(cfg.emailConfig.recipientEmail || '');
  const [emailWebhookUrl, setEmailWebhookUrl] = useState(
    cfg.emailConfig.appsScriptWebhookUrl || ''
  );

  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; msg: string } | null>(
    null
  );

  const [supplierFormOpen, setSupplierFormOpen] = useState(false);
  const [sup, setSup] = useState({
    maNCC: `NCC0${state.suppliers.length + 1}`,
    tenNCC: '',
    nguoiLienHe: '',
    soDienThoai: '',
    email: '',
    diaChi: '',
    leadTimeMacDinh: 5,
    ghiChu: '',
  });

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setBusy(true);
    try {
      await onUpdateConfig({
        kyPhanTichMacDinh: kpiDays,
        phuongPhapROQMacDinh: roqMethod,
        googleSheetsConfig: { spreadsheetId, appsScriptUrl },
        emailConfig: { recipientEmail, appsScriptWebhookUrl: emailWebhookUrl },
      });
      setFeedback({ type: 'success', msg: 'Đã lưu cấu hình KPI và thông số kết nối.' });
    } catch (err) {
      setFeedback({
        type: 'error',
        msg: err instanceof Error ? err.message : 'Không thể lưu cấu hình.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSyncSheets = async () => {
    setFeedback(null);
    setBusy(true);
    try {
      await onSyncGoogleSheets();
      setFeedback({
        type: 'success',
        msg: 'Đã đồng bộ dữ liệu 8 bảng lên Google Sheets thành công.',
      });
    } catch (err) {
      setFeedback({
        type: 'error',
        msg: err instanceof Error ? err.message : 'Đồng bộ Google Sheets thất bại.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFeedback(null);
    try {
      await onCreateSupplier(sup);
      setSupplierFormOpen(false);
      setSup({
        maNCC: `NCC0${state.suppliers.length + 2}`,
        tenNCC: '',
        nguoiLienHe: '',
        soDienThoai: '',
        email: '',
        diaChi: '',
        leadTimeMacDinh: 5,
        ghiChu: '',
      });
      setFeedback({ type: 'success', msg: 'Đã thêm nhà cung cấp mới.' });
    } catch (err) {
      setFeedback({
        type: 'error',
        msg: err instanceof Error ? err.message : 'Không thể thêm nhà cung cấp.',
      });
    } finally {
      setBusy(false);
    }
  };

  const copyScript = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_SNIPPET);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
            Nhà cung cấp, Cấu hình KPI & Đồng bộ Google Sheets
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
            Quản lý danh mục nhà cung cấp, cấu trúc 8 bảng dữ liệu chuẩn và tích hợp Google Apps Script
          </p>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={onResetDemo}
          className="h-9 px-3.5 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 text-xs font-semibold text-zinc-700 inline-flex items-center gap-1.5 self-start"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Khôi phục dữ liệu mẫu PT001
        </button>
      </div>

      {feedback && (
        <div
          className={`p-3.5 rounded-xl border text-xs font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {feedback.msg}
        </div>
      )}

      {/* Suppliers Section */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Truck className="w-4 h-4 text-orange-600" />
            <h2 className="text-sm font-bold text-zinc-900">
              Danh sách Nhà cung cấp (NHA_CUNG_CAP · {state.suppliers.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setSupplierFormOpen((v) => !v)}
            className="h-8 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Thêm NCC
          </button>
        </div>

        {supplierFormOpen && (
          <form
            onSubmit={handleAddSupplier}
            className="p-4 bg-zinc-50 border-b border-zinc-200 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs"
          >
            <input
              type="text"
              required
              placeholder="Mã NCC *"
              value={sup.maNCC}
              onChange={(e) => setSup({ ...sup, maNCC: e.target.value })}
              className="h-9 px-3 rounded-lg border border-zinc-200 bg-white font-mono"
            />
            <input
              type="text"
              required
              placeholder="Tên nhà cung cấp *"
              value={sup.tenNCC}
              onChange={(e) => setSup({ ...sup, tenNCC: e.target.value })}
              className="h-9 px-3 rounded-lg border border-zinc-200 bg-white sm:col-span-2"
            />
            <input
              type="number"
              min={1}
              placeholder="Lead Time mặc định (ngày)"
              value={sup.leadTimeMacDinh}
              onChange={(e) => setSup({ ...sup, leadTimeMacDinh: Number(e.target.value) })}
              className="h-9 px-3 rounded-lg border border-zinc-200 bg-white font-mono"
            />
            <input
              type="text"
              placeholder="Người liên hệ"
              value={sup.nguoiLienHe}
              onChange={(e) => setSup({ ...sup, nguoiLienHe: e.target.value })}
              className="h-9 px-3 rounded-lg border border-zinc-200 bg-white"
            />
            <input
              type="text"
              placeholder="Số điện thoại"
              value={sup.soDienThoai}
              onChange={(e) => setSup({ ...sup, soDienThoai: e.target.value })}
              className="h-9 px-3 rounded-lg border border-zinc-200 bg-white"
            />
            <input
              type="email"
              placeholder="Email"
              value={sup.email}
              onChange={(e) => setSup({ ...sup, email: e.target.value })}
              className="h-9 px-3 rounded-lg border border-zinc-200 bg-white"
            />
            <button
              type="submit"
              disabled={busy}
              className="h-9 px-4 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-semibold"
            >
              Lưu nhà cung cấp
            </button>
          </form>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Mã NCC</th>
                <th className="px-4 py-2.5 font-semibold">Tên nhà cung cấp</th>
                <th className="px-4 py-2.5 font-semibold">Liên hệ</th>
                <th className="px-4 py-2.5 font-semibold">Địa chỉ</th>
                <th className="px-4 py-2.5 font-semibold text-right">Lead Time mặc định</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {state.suppliers.map((s) => (
                <tr key={s.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-3 font-mono font-bold text-zinc-900">{s.maNCC}</td>
                  <td className="px-4 py-3 font-medium text-zinc-900">{s.tenNCC}</td>
                  <td className="px-4 py-3 text-zinc-600">
                    <div>{s.nguoiLienHe}</div>
                    <div className="text-[11px] text-zinc-400">
                      {s.soDienThoai} · {s.email}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-600">{s.diaChi}</td>
                  <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold">
                    {s.leadTimeMacDinh} ngày
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Config & Google Sheets Sync Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <form
          onSubmit={handleSaveConfig}
          className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4 text-xs"
        >
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-orange-600" />
              <h2 className="text-sm font-bold text-zinc-900">
                Cấu hình KPI & Kết nối Google Sheets / Email
              </h2>
            </div>
            {role !== 'QUAN_LY' && (
              <span className="text-[11px] text-amber-700 font-medium">
                Chỉ Quản lý được phép lưu cấu hình
              </span>
            )}
          </div>

          <div className="p-3 rounded-lg bg-zinc-50 border border-zinc-200 space-y-1">
            <div className="font-semibold text-zinc-800">
              Trạng thái đồng bộ Google Sheets:
            </div>
            <div
              className={`font-medium ${
                cfg.googleSheetsConfig.daKetNoi ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {cfg.googleSheetsConfig.trangThaiKetNoi}
            </div>
            {cfg.googleSheetsConfig.lanDongBoCuoi && (
              <div className="text-[11px] text-zinc-500">
                Lần đồng bộ thành công gần nhất:{' '}
                {formatDateTime(cfg.googleSheetsConfig.lanDongBoCuoi)}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-zinc-700 mb-1">
                Kỳ phân tích ADD mặc định
              </label>
              <select
                disabled={role !== 'QUAN_LY'}
                value={kpiDays}
                onChange={(e) => setKpiDays(Number(e.target.value) as KpiWindowDays)}
                className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white disabled:bg-zinc-100"
              >
                <option value={30}>30 ngày</option>
                <option value={60}>60 ngày</option>
                <option value={90}>90 ngày</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-zinc-700 mb-1">
                Phương pháp ROQ mặc định
              </label>
              <select
                disabled={role !== 'QUAN_LY'}
                value={roqMethod}
                onChange={(e) => setRoqMethod(e.target.value as RoqMethod)}
                className="w-full h-9 px-3 rounded-lg border border-zinc-200 bg-white disabled:bg-zinc-100"
              >
                <option value="eoq">Theo EOQ</option>
                <option value="target">Theo mức tồn mục tiêu</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 mb-1">
              Google Spreadsheet ID (từ URL Google Sheets của Tiến Thu)
            </label>
            <input
              type="text"
              disabled={role !== 'QUAN_LY'}
              value={spreadsheetId}
              onChange={(e) => setSpreadsheetId(e.target.value)}
              placeholder="VD: 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
              className="w-full h-9 px-3 rounded-lg border border-zinc-200 font-mono disabled:bg-zinc-100"
            />
          </div>

          <div>
            <label className="block font-semibold text-zinc-700 mb-1">
              Google Apps Script Web App URL (/exec)
            </label>
            <input
              type="url"
              disabled={role !== 'QUAN_LY'}
              value={appsScriptUrl}
              onChange={(e) => setAppsScriptUrl(e.target.value)}
              placeholder="https://script.google.com/macros/s/.../exec"
              className="w-full h-9 px-3 rounded-lg border border-zinc-200 font-mono disabled:bg-zinc-100"
            />
          </div>

          <div className="pt-2 border-t border-zinc-200 space-y-3">
            <div className="flex items-center gap-2 font-bold text-zinc-800">
              <Mail className="w-4 h-4 text-zinc-600" />
              <span>Cấu hình Email cảnh báo</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="email"
                disabled={role !== 'QUAN_LY'}
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
                placeholder="Email quản lý nhận cảnh báo"
                className="h-9 px-3 rounded-lg border border-zinc-200 disabled:bg-zinc-100"
              />
              <input
                type="url"
                disabled={role !== 'QUAN_LY'}
                value={emailWebhookUrl}
                onChange={(e) => setEmailWebhookUrl(e.target.value)}
                placeholder="Apps Script / Webhook gửi mail URL"
                className="h-9 px-3 rounded-lg border border-zinc-200 font-mono disabled:bg-zinc-100"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <button
              type="submit"
              disabled={busy || role !== 'QUAN_LY'}
              className="h-9 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white font-semibold"
            >
              Lưu cấu hình
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleSyncSheets}
              className="h-9 px-4 rounded-lg bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-semibold inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Kiểm tra & Đồng bộ Google Sheets
            </button>
          </div>
        </form>

        {/* Apps Script Guide & 8 Tables Schema */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 space-y-4 text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-200">
            <h2 className="text-sm font-bold text-zinc-900">
              Hướng dẫn kết nối Google Sheets & Cấu trúc 8 bảng
            </h2>
            <button
              type="button"
              onClick={copyScript}
              className="px-2.5 py-1 rounded border border-zinc-200 hover:bg-zinc-50 font-semibold inline-flex items-center gap-1"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Đã sao chép' : 'Sao chép Apps Script'}
            </button>
          </div>

          <ol className="list-decimal list-inside space-y-1.5 text-zinc-600 leading-relaxed">
            <li>Mở file Google Sheets của dự án Tiến Thu → Chọn <strong>Tiện ích mở rộng → Apps Script</strong>.</li>
            <li>Dán đoạn mã Web App bên dưới và chọn <strong>Triển khai (Deploy) → Ứng dụng web</strong> (Ai có quyền truy cập: Bất kỳ ai).</li>
            <li>Dán Spreadsheet ID và URL <code className="font-mono bg-zinc-100 px-1">/exec</code> vào biểu mẫu bên trái, sau đó nhấn <strong>Kiểm tra & Đồng bộ</strong>.</li>
          </ol>

          <pre className="p-3 rounded-lg bg-zinc-900 text-zinc-100 font-mono text-[11px] overflow-x-auto max-h-52">
            {APPS_SCRIPT_SNIPPET}
          </pre>

          <div className="pt-2 border-t border-zinc-200">
            <div className="font-bold text-zinc-800 mb-2">
              8 bảng dữ liệu đang lưu trữ bền vững trên máy chủ:
            </div>
            <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px] text-zinc-600">
              <div>• PHU_TUNG ({state.parts.length} dòng)</div>
              <div>• NHA_CUNG_CAP ({state.suppliers.length} dòng)</div>
              <div>• NHAP_XUAT_KHO ({state.transactions.length} dòng)</div>
              <div>• DON_DAT_HANG ({state.orders.length} dòng)</div>
              <div>• CHI_TIET_DON_HANG</div>
              <div>• DE_XUAT_DAT_HANG ({state.proposals.length} dòng)</div>
              <div>• CANH_BAO_TON_KHO ({state.alerts.length} dòng)</div>
              <div>• CAU_HINH_KPI (Đã lưu)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

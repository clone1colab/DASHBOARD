import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  X,
} from 'lucide-react';
import type {
  CatalogPart,
  ConnectionSyncState,
  GoogleSheetReferenceResponse,
  MergedInventoryItem,
  SheetsStateResponse,
  SheetTransaction,
  ThamSoOverride,
  TransactionType,
} from './types/inventory';
import { api } from './services/api';
import {
  ensureInitialSeedFromSheet,
  recordTransactionInFirestore,
  resetThamSoOverrideInFirestore,
  saveCatalogPartInFirestore,
  saveThamSoOverrideInFirestore,
  subscribeToInventoryCollections,
} from './services/firestoreInventory';
import { firebaseMetadata } from './lib/firebase';
import { buildFullInventoryState, mergeThamSo } from './lib/inventoryCalculator';
import { Layout, type NavTab } from './components/Layout';
import { DashboardPage } from './components/DashboardPage';
import { PartsPage } from './components/PartsPage';
import { TransactionsPage } from './components/TransactionsPage';
import { KpiAnalysisPage } from './components/KpiAnalysisPage';
import { SettingsSyncPage } from './components/SettingsSyncPage';
import { PartDetailModal } from './components/PartDetailModal';
import {
  ConfirmMutationModal,
  type MutationConfirmDetails,
} from './components/ConfirmMutationModal';
import { formatCurrency } from './lib/format';

const SHEET_REFRESH_MS = 30_000;

interface PendingMutationState {
  details: MutationConfirmDetails;
  execute: () => Promise<void>;
  cancel: () => void;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');
  const [searchQuery, setSearchQuery] = useState('');

  const [sheetRef, setSheetRef] = useState<GoogleSheetReferenceResponse | null>(null);
  const [firestoreTxs, setFirestoreTxs] = useState<SheetTransaction[] | null>(null);
  const [firestoreCustomParts, setFirestoreCustomParts] = useState<CatalogPart[]>([]);
  const [thamSoOverride, setThamSoOverride] = useState<ThamSoOverride | null>(null);
  const [seedReady, setSeedReady] = useState(false);

  const [loading, setLoading] = useState(true);
  const [syncState, setSyncState] = useState<ConnectionSyncState>('SYNCING');
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedPartCode, setSelectedPartCode] = useState<string | null>(null);
  const [txPreselectedPart, setTxPreselectedPart] = useState<string | null>(null);
  const [txPreselectedMode, setTxPreselectedMode] =
    useState<TransactionType>('XUAT_SUA_CHUA');

  const [toast, setToast] = useState<{
    type: 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);

  const [pendingMutation, setPendingMutation] =
    useState<PendingMutationState | null>(null);
  const [mutationBusy, setMutationBusy] = useState(false);

  const inFlightRef = useRef(false);
  const seededOnceRef = useRef(false);

  const syncSheetReference = useCallback(async (silent = false) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    if (!silent) {
      setSyncState('SYNCING');
    }
    try {
      const refData = await api.getSheetReference();
      setSheetRef(refData);

      if (!seededOnceRef.current) {
        seededOnceRef.current = true;
        await ensureInitialSeedFromSheet(refData.sheetInitialTransactions);
        setSeedReady(true);
      }

      setLoadError(null);
      setSyncState('CONNECTED_RW');
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : 'Không thể tải dữ liệu Google Sheets hoặc Firebase Firestore.';
      setLoadError(msg);
      setSyncState('DISCONNECTED');
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, []);

  // Initial load directly into Dashboard (no login) + real-time Firestore subscription
  useEffect(() => {
    syncSheetReference(false);

    const unsubscribe = subscribeToInventoryCollections({
      onTransactions: (txs) => {
        setFirestoreTxs(txs);
        setSyncState('CONNECTED_RW');
      },
      onCustomParts: (parts) => {
        setFirestoreCustomParts(parts);
      },
      onThamSoOverride: (override) => {
        setThamSoOverride(override);
      },
      onError: (err) => {
        setLoadError(err.message);
        setSyncState('DISCONNECTED');
      },
    });

    return () => unsubscribe();
  }, [syncSheetReference]);

  // Periodically refresh read-only Google Sheets catalog/THAM SO when tab is visible
  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        syncSheetReference(true);
      }
    }, SHEET_REFRESH_MS);

    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        syncSheetReference(true);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    window.addEventListener('focus', handleVisibilityOrFocus);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [syncSheetReference]);

  const state: SheetsStateResponse | null = useMemo(() => {
    if (!sheetRef) return null;
    const txs =
      firestoreTxs !== null
        ? firestoreTxs
        : sheetRef.sheetInitialTransactions;

    const effectiveThamSo = mergeThamSo(sheetRef.thamSo, thamSoOverride);

    return buildFullInventoryState({
      spreadsheetId: sheetRef.spreadsheetId,
      sheetsReadMode: sheetRef.sheetsReadMode,
      databaseMode: 'FIREBASE_FIRESTORE',
      databaseConfigured: true,
      firebaseProjectId: firebaseMetadata.projectId,
      firestoreDatabaseId: firebaseMetadata.firestoreDatabaseId,
      thamSoSource: thamSoOverride?.active ? 'FIRESTORE_OVERRIDE' : 'GOOGLE_SHEET',
      syncedAt: sheetRef.syncedAt,
      thamSo: effectiveThamSo,
      sheetCatalog: sheetRef.sheetCatalog,
      customParts: firestoreCustomParts,
      transactions: txs,
    });
  }, [sheetRef, firestoreTxs, firestoreCustomParts, thamSoOverride]);

  const selectedItem: MergedInventoryItem | null = useMemo(() => {
    if (!state || !selectedPartCode) return null;
    return (
      state.items.find((it) => it.catalog.maPhuTung === selectedPartCode) || null
    );
  }, [state, selectedPartCode]);

  const runWithConfirmation = <T,>(
    details: MutationConfirmDetails,
    action: () => Promise<T>
  ): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
      setPendingMutation({
        details,
        execute: async () => {
          setMutationBusy(true);
          try {
            const result = await action();
            setPendingMutation(null);
            resolve(result);
          } catch (err) {
            setPendingMutation(null);
            reject(err);
          } finally {
            setMutationBusy(false);
          }
        },
        cancel: () => {
          setPendingMutation(null);
          reject(new Error('Người dùng đã hủy thao tác lưu dữ liệu.'));
        },
      });
    });
  };

  const urgentCount = useMemo(() => {
    if (!state) return 0;
    return state.kpis.soLoaiCanDatNgay;
  }, [state]);

  if ((loading || (!seedReady && firestoreTxs === null)) && !state) {
    return (
      <div className="min-h-screen bg-[#F6F7F9] flex items-center justify-center p-6">
        <div className="bg-white border border-zinc-200 rounded-xl p-6 max-w-sm w-full text-center space-y-3">
          <div className="w-8 h-8 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-sm font-bold text-zinc-900">
            Đang kết nối Google Sheets & Firebase Tiến Thu...
          </div>
          <div className="text-xs text-zinc-500">
            Đang đọc danh mục từ Google Sheets & đồng bộ thời gian thực từ Firestore
          </div>
        </div>
      </div>
    );
  }

  if (loadError && !state) {
    return (
      <div className="min-h-screen bg-[#F6F7F9] flex items-center justify-center p-6">
        <div className="bg-white border border-red-200 rounded-xl p-6 max-w-md w-full text-center space-y-3">
          <AlertTriangle className="w-8 h-8 text-red-600 mx-auto" />
          <div className="text-sm font-bold text-zinc-900">
            Không thể tải dữ liệu tồn kho
          </div>
          <div className="text-xs text-zinc-600 leading-relaxed">{loadError}</div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => syncSheetReference(false)}
              className="h-10 px-4 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Thử kết nối lại
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!state) return null;

  return (
    <Layout
      activeTab={activeTab}
      onTabChange={setActiveTab}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      syncState={syncState}
      lastSyncedAt={state.syncedAt}
      onSyncNow={() => syncSheetReference(false)}
      urgentCount={urgentCount}
      onQuickTransaction={() => {
        setTxPreselectedMode('XUAT_SUA_CHUA');
        setActiveTab('transactions');
      }}
    >
      {/* Connection Error Banner when cached state exists */}
      {loadError && (
        <div className="mb-4 p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            <span>
              <strong>Lỗi đồng bộ dữ liệu:</strong> {loadError}
            </span>
          </div>
          <button
            type="button"
            onClick={() => syncSheetReference(false)}
            className="px-3 py-1 rounded bg-red-700 hover:bg-red-800 text-white font-semibold shrink-0"
          >
            Làm mới ngay
          </button>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div
          className={`mb-5 p-3.5 rounded-xl border text-xs font-medium flex items-center justify-between gap-3 ${
            toast.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : toast.type === 'warning'
              ? 'bg-amber-50 border-amber-300 text-amber-900'
              : 'bg-emerald-50 border-emerald-200 text-emerald-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
            )}
            <span>{toast.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="p-1 text-zinc-500 hover:text-zinc-900"
            aria-label="Đóng thông báo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {activeTab === 'dashboard' && (
        <DashboardPage
          state={state}
          searchQuery={searchQuery}
          onSelectItem={(it) => setSelectedPartCode(it.catalog.maPhuTung)}
        />
      )}

      {activeTab === 'parts' && (
        <PartsPage
          state={state}
          searchQuery={searchQuery}
          onSelectItem={(it) => setSelectedPartCode(it.catalog.maPhuTung)}
          onUpdatePart={(maPhuTung, payload) => {
            const existingPart = state.items.find(
              (it) => it.catalog.maPhuTung === maPhuTung
            );
            return runWithConfirmation(
              {
                title: 'Xác nhận cập nhật thông tin phụ tùng',
                description:
                  'Thông tin chỉnh sửa sẽ được lưu vào Firebase Firestore và đồng bộ tức thì tới mọi thiết bị (không làm thay đổi Google Sheets gốc).',
                sheetName: 'Firebase Firestore (catalog_parts_custom)',
                details: [
                  { label: 'Mã phụ tùng', value: maPhuTung },
                  { label: 'Tên phụ tùng', value: payload.tenPhuTung },
                  { label: 'Định mức tối thiểu', value: String(payload.dinhMucToiThieu) },
                  { label: 'Giá nhập tham chiếu', value: formatCurrency(payload.giaNhapThamChieu) },
                  { label: 'Giá bán tham chiếu', value: formatCurrency(payload.giaBanThamChieu) },
                ],
                confirmLabel: 'Xác nhận lưu vào Firebase',
              },
              async () => {
                setSyncState('SYNCING');
                try {
                  await saveCatalogPartInFirestore({
                    isCreate: false,
                    maPhuTung,
                    tenPhuTung: payload.tenPhuTung,
                    donViTinh: payload.donViTinh,
                    dinhMucToiThieu: payload.dinhMucToiThieu,
                    ghiChu: payload.ghiChu,
                    nhomPhuTung: payload.nhomPhuTung ?? existingPart?.catalog.nhomPhuTung ?? '',
                    giaNhapThamChieu: payload.giaNhapThamChieu,
                    giaBanThamChieu: payload.giaBanThamChieu,
                    maNhaCungCapMacDinh: payload.maNhaCungCapMacDinh,
                    leadTimeRieng: payload.leadTimeRieng,
                    tonDauKy: existingPart?.catalog.tonDauKy ?? 0,
                    slDangDatChuaNhan:
                      payload.slDangDatChuaNhan ?? existingPart?.catalog.slDangDatChuaNhan ?? 0,
                  });
                  setSyncState('CONNECTED_RW');
                  setToast({
                    type: 'success',
                    text: `Đã lưu cập nhật phụ tùng ${maPhuTung} vào Firebase Firestore.`,
                  });
                } catch (err) {
                  setSyncState('SAVE_ERROR');
                  throw err;
                }
              }
            );
          }}
          onCreatePart={(payload) => {
            const exists = state.items.some(
              (it) =>
                it.catalog.maPhuTung.toUpperCase() === payload.maPhuTung.trim().toUpperCase()
            );
            return runWithConfirmation(
              {
                title: 'Xác nhận thêm phụ tùng mới',
                description:
                  'Phụ tùng mới sẽ được lưu vào Firebase Firestore để theo dõi tồn kho trên mọi thiết bị.',
                sheetName: 'Firebase Firestore (catalog_parts_custom)',
                details: [
                  { label: 'Mã phụ tùng', value: payload.maPhuTung.toUpperCase() },
                  { label: 'Tên phụ tùng', value: payload.tenPhuTung },
                  { label: 'Đơn vị tính', value: payload.donViTinh },
                  { label: 'Giá nhập TK', value: formatCurrency(payload.giaNhapThamChieu) },
                  { label: 'Tồn đầu kỳ', value: String(payload.tonDauKy) },
                ],
                confirmLabel: 'Xác nhận thêm vào Firebase',
              },
              async () => {
                if (exists) {
                  throw new Error(`Mã phụ tùng "${payload.maPhuTung.toUpperCase()}" đã tồn tại.`);
                }
                setSyncState('SYNCING');
                try {
                  await saveCatalogPartInFirestore({
                    isCreate: true,
                    maPhuTung: payload.maPhuTung,
                    tenPhuTung: payload.tenPhuTung,
                    donViTinh: payload.donViTinh,
                    dinhMucToiThieu: payload.dinhMucToiThieu,
                    ghiChu: payload.ghiChu,
                    nhomPhuTung: payload.nhomPhuTung,
                    giaNhapThamChieu: payload.giaNhapThamChieu,
                    giaBanThamChieu: payload.giaBanThamChieu,
                    maNhaCungCapMacDinh: payload.maNhaCungCapMacDinh,
                    leadTimeRieng: payload.leadTimeRieng,
                    tonDauKy: payload.tonDauKy,
                    slDangDatChuaNhan: 0,
                  });
                  setSyncState('CONNECTED_RW');
                  setToast({
                    type: 'success',
                    text: `Đã thêm phụ tùng ${payload.maPhuTung.toUpperCase()} vào Firebase Firestore.`,
                  });
                } catch (err) {
                  setSyncState('SAVE_ERROR');
                  throw err;
                }
              }
            );
          }}
        />
      )}

      {activeTab === 'transactions' && (
        <TransactionsPage
          state={state}
          searchQuery={searchQuery}
          preselectedPartCode={txPreselectedPart}
          preselectedMode={txPreselectedMode}
          onInbound={(payload) =>
            runWithConfirmation(
              {
                title: 'Xác nhận lưu phiếu Nhập kho (NHAP_NCC)',
                description:
                  'Phiếu nhập sẽ được lưu vĩnh viễn vào Firebase Firestore, đồng bộ tức thì tới mọi thiết bị và tự động tính lại chỉ số tồn kho.',
                sheetName: 'Firebase Firestore (inventory_transactions)',
                details: [
                  { label: 'Mã phụ tùng', value: payload.maPhuTung },
                  { label: 'Số lượng nhập', value: `+${payload.soLuong}` },
                  { label: 'Đơn giá nhập', value: formatCurrency(payload.donGia) },
                  { label: 'Ngày giao dịch', value: payload.ngayGiaoDichIso },
                  { label: 'Nhà cung cấp', value: payload.maNhaCungCap },
                  { label: 'Người thực hiện', value: payload.nhanVienThucHien },
                ],
                confirmLabel: 'Xác nhận lưu phiếu nhập',
              },
              async () => {
                setSyncState('SYNCING');
                try {
                  const res = await recordTransactionInFirestore({
                    loaiGiaoDich: 'NHAP_NCC',
                    maPhuTung: payload.maPhuTung,
                    soLuong: payload.soLuong,
                    ngayGiaoDichIso: payload.ngayGiaoDichIso,
                    donGiaGiaoDich: payload.donGia,
                    maNhaCungCap: payload.maNhaCungCap,
                    nhanVienThucHien: payload.nhanVienThucHien,
                    maDonDatHang: payload.maDonDatHang,
                    ghiChu: payload.ghiChu,
                    clientRequestId: payload.clientRequestId,
                  });
                  setSyncState('CONNECTED_RW');
                  setToast({
                    type: 'success',
                    text: `Đã lưu phiếu nhập ${res.transactionCode} vào Firebase Firestore.`,
                  });
                  return res;
                } catch (err) {
                  setSyncState('SAVE_ERROR');
                  throw err;
                }
              }
            )
          }
          onOutbound={(payload) => {
            const targetItem = state.items.find(
              (it) => it.catalog.maPhuTung === payload.maPhuTung
            );
            return runWithConfirmation(
              {
                title: 'Xác nhận lưu phiếu Xuất kho (XUAT_SUA_CHUA)',
                description:
                  'Phiếu xuất sẽ được lưu vĩnh viễn vào Firebase Firestore, đồng bộ tức thì tới mọi thiết bị và tự động tính lại số ngày tồn kho.',
                sheetName: 'Firebase Firestore (inventory_transactions)',
                details: [
                  { label: 'Mã phụ tùng', value: payload.maPhuTung },
                  { label: 'Số lượng xuất', value: `-${payload.soLuong}` },
                  { label: 'Ngày giao dịch', value: payload.ngayGiaoDichIso },
                  { label: 'Người thực hiện', value: payload.nhanVienThucHien },
                  ...(payload.ghiChu
                    ? [{ label: 'Ghi chú', value: payload.ghiChu }]
                    : []),
                ],
                confirmLabel: 'Xác nhận lưu phiếu xuất',
              },
              async () => {
                setSyncState('SYNCING');
                try {
                  const res = await recordTransactionInFirestore({
                    loaiGiaoDich: 'XUAT_SUA_CHUA',
                    maPhuTung: payload.maPhuTung,
                    soLuong: payload.soLuong,
                    ngayGiaoDichIso: payload.ngayGiaoDichIso,
                    donGiaGiaoDich: null,
                    maNhaCungCap: '',
                    nhanVienThucHien: payload.nhanVienThucHien,
                    ghiChu: payload.ghiChu,
                    clientRequestId: payload.clientRequestId,
                    availableStock: targetItem?.indicator.tonHienTai,
                  });
                  setSyncState('CONNECTED_RW');
                  setToast({
                    type: 'success',
                    text: `Đã lưu phiếu xuất ${res.transactionCode} vào Firebase Firestore.`,
                  });
                  return res;
                } catch (err) {
                  setSyncState('SAVE_ERROR');
                  throw err;
                }
              }
            );
          }}
        />
      )}

      {activeTab === 'kpi' && (
        <KpiAnalysisPage
          state={state}
          onSelectItem={(it) => setSelectedPartCode(it.catalog.maPhuTung)}
          onSaveThamSo={(payload) =>
            runWithConfirmation(
              {
                title: 'Xác nhận cập nhật tham số vận hành (THAM SO)',
                description:
                  'Tham số mới sẽ được lưu vào Firebase Firestore, đồng bộ mọi thiết bị và tự động tính lại toàn bộ chỉ số ROP, Safety Stock và đề xuất đặt hàng.',
                sheetName: 'Firebase Firestore (system_metadata/tham_so_override)',
                details: [
                  {
                    label: 'Kỳ thống kê',
                    value: `${payload.tuNgayIso} → ${payload.denNgayIso}`,
                  },
                  { label: 'Ngày xem báo cáo', value: payload.ngayXemBaoCaoIso },
                  {
                    label: 'Lead Time mặc định',
                    value: `${payload.leadTimeMacDinh} ngày`,
                  },
                  {
                    label: 'Dự trữ mong muốn',
                    value: `${payload.soNgayDuTruMongMuon} ngày`,
                  },
                  {
                    label: 'Cảnh báo trước',
                    value: `${payload.soNgayCanhBaoTruoc} ngày`,
                  },
                ],
                confirmLabel: 'Lưu tham số vào Firebase',
              },
              async () => {
                setSyncState('SYNCING');
                try {
                  await saveThamSoOverrideInFirestore(payload);
                  setSyncState('CONNECTED_RW');
                  setToast({
                    type: 'success',
                    text: 'Đã cập nhật tham số vận hành trên Firebase Firestore và tính lại toàn bộ chỉ số.',
                  });
                } catch (err) {
                  setSyncState('SAVE_ERROR');
                  throw err;
                }
              }
            )
          }
          onResetThamSo={() =>
            runWithConfirmation(
              {
                title: 'Khôi phục tham số theo Google Sheets',
                description:
                  'Hệ thống sẽ tắt ghi đè trên web và sử dụng lại trực tiếp các giá trị từ sheet THAM SO trên Google Sheets.',
                sheetName: 'Firebase Firestore (system_metadata/tham_so_override)',
                details: [
                  {
                    label: 'Kỳ Google Sheets',
                    value: `${sheetRef?.thamSo.tuNgay ?? ''} – ${sheetRef?.thamSo.denNgay ?? ''}`,
                  },
                  {
                    label: 'Lead Time mặc định',
                    value: `${sheetRef?.thamSo.leadTimeMacDinh ?? 7} ngày`,
                  },
                ],
                confirmLabel: 'Khôi phục theo Google Sheets',
              },
              async () => {
                if (!sheetRef) return;
                setSyncState('SYNCING');
                try {
                  await resetThamSoOverrideInFirestore(sheetRef.thamSo);
                  setSyncState('CONNECTED_RW');
                  setToast({
                    type: 'success',
                    text: 'Đã khôi phục tham số vận hành về giá trị gốc của Google Sheets.',
                  });
                } catch (err) {
                  setSyncState('SAVE_ERROR');
                  throw err;
                }
              }
            )
          }
        />
      )}

      {activeTab === 'settings' && (
        <SettingsSyncPage
          state={state}
          onSyncNow={() => syncSheetReference(false)}
        />
      )}

      <PartDetailModal
        item={selectedItem}
        transactions={state.transactions}
        onClose={() => setSelectedPartCode(null)}
        onCreateTransaction={(maPhuTung, type) => {
          setSelectedPartCode(null);
          setTxPreselectedPart(maPhuTung);
          setTxPreselectedMode(type);
          setActiveTab('transactions');
        }}
      />

      {/* Explicit Confirmation Modal before saving to Firestore */}
      <ConfirmMutationModal
        pending={pendingMutation?.details ?? null}
        busy={mutationBusy}
        onConfirm={() => pendingMutation?.execute()}
        onCancel={() => pendingMutation?.cancel()}
      />
    </Layout>
  );
}

export type UserRole = 'NHAN_VIEN_KHO' | 'QUAN_LY';

export type InventoryStatus =
  | 'DU_HANG'
  | 'CAN_DAT_HANG'
  | 'DUOI_SAFETY_STOCK'
  | 'HET_HANG';

export type TransactionType = 'NHAP_KHO' | 'XUAT_KHO' | 'DIEU_CHINH';

export type ProposalStatus = 'CHO_DUYET' | 'DA_DUYET' | 'TU_CHOI' | 'DA_TAO_DON';

export type PurchaseOrderStatus = 'DANG_DAT' | 'DA_NHAN' | 'DA_HUY';

export type AlertType =
  | 'CHAM_ROP'
  | 'DUOI_SAFETY_STOCK'
  | 'HET_HANG'
  | 'DE_XUAT_CHO_DUYET'
  | 'DON_HANG_TRE_HAN';

export type AlertSeverity = 'TRUNG_BINH' | 'CAO' | 'KHAN_CAP';

export type DashboardPeriodFilter = 'day' | 'month' | 'quarter' | 'year';

export type KpiWindowDays = 30 | 60 | 90;

export type RoqMethod = 'eoq' | 'target';

export interface NhaCungCap {
  id: string;
  maNCC: string;
  tenNCC: string;
  nguoiLienHe: string;
  soDienThoai: string;
  email: string;
  diaChi: string;
  leadTimeMacDinh: number;
  ghiChu: string;
}

export interface PhuTung {
  id: string;
  maPhuTung: string;
  tenPhuTung: string;
  loaiPhuTung: string;
  donViTinh: string;
  giaNhap: number;
  giaXuatThamKhao: number;
  nhaCungCapId: string;
  tonDauKy: number;
  tonHienTai: number;
  soLuongGiuCho: number;
  phuongPhapSS: 'manual' | 'auto';
  safetyStockThuCong: number | null;
  phuongPhapLT: 'manual' | 'history';
  leadTimeThuCong: number | null;
  chiPhiDatHang: number | null; // S
  chiPhiLuuKhoNam: number | null; // H
  phuongPhapROQ: RoqMethod;
  mucTonMucTieu: number | null;
  quyCachDongGoi: number;
  soLuongDatToiThieu: number;
  ngayTao: string;
  ngayCapNhat: string;
}

export interface NhapXuatKho {
  id: string;
  maGiaoDich: string;
  phuTungId: string;
  loaiGiaoDich: TransactionType;
  soLuong: number; // positive for NHAP_KHO/XUAT_KHO, signed delta for DIEU_CHINH
  tonSauGiaoDich: number;
  donGia: number;
  ngayGiaoDich: string; // ISO string
  nhaCungCapId?: string;
  maChungTu: string; // Ma don hang / Ma phieu bao hanh-sua chua / Ma kiem ke
  lyDo: string;
  nguoiThucHien: string;
  vaiTro: UserRole;
}

export interface DonDatHang {
  id: string;
  maDonHang: string;
  nhaCungCapId: string;
  deXuatId?: string;
  ngayDat: string;
  ngayGiaoDuKien: string;
  ngayNhanThucTe?: string;
  leadTimeThucTe?: number;
  tongGiaTri: number;
  trangThai: PurchaseOrderStatus;
  nguoiTao: string;
  ghiChu: string;
}

export interface ChiTietDonHang {
  id: string;
  donDatHangId: string;
  phuTungId: string;
  soLuongDat: number;
  soLuongDaNhan: number;
  donGia: number;
  thanhTien: number;
}

export interface DeXuatDatHang {
  id: string;
  maDeXuat: string;
  phuTungId: string;
  nhaCungCapId: string;
  soLuongDeXuat: number;
  phuongPhapTinh: RoqMethod | 'manual';
  tonHienTaiLucTao: number;
  inventoryPositionLucTao: number;
  ropLucTao: number;
  safetyStockLucTao: number;
  eoqThamKhao: number | null;
  giaTriDuKien: number;
  trangThai: ProposalStatus;
  nguonTao: 'TU_DONG' | 'THU_CONG';
  nguoiTao: string;
  ngayTao: string;
  nguoiDuyet?: string;
  ngayDuyet?: string;
  lyDoTuChoi?: string;
  ghiChu: string;
}

export interface CanhBaoTonKho {
  id: string;
  loaiCanhBao: AlertType;
  mucDo: AlertSeverity;
  phuTungId?: string;
  deXuatId?: string;
  donDatHangId?: string;
  tieuDe: string;
  noiDung: string;
  thoiGianPhatSinh: string;
  daDoc: boolean;
  daXuLy: boolean;
}

export interface YeuCauPhuTung {
  id: string;
  maYeuCau: string;
  phuTungId: string;
  maPhieuSuaChua: string;
  soLuongYeuCau: number;
  soLuongDapUng: number;
  duocDapUngDayDu: boolean;
  ngayYeuCau: string;
  ghiChu: string;
}

export interface EmailIntegrationConfig {
  daCauHinh: boolean;
  recipientEmail: string;
  appsScriptWebhookUrl: string;
  lanGuiCuoi?: string;
}

export interface GoogleSheetsConfig {
  daKetNoi: boolean;
  spreadsheetId: string;
  appsScriptUrl: string;
  lanDongBoCuoi?: string;
  trangThaiKetNoi: string;
}

export interface CauHinhKPI {
  kyPhanTichMacDinh: KpiWindowDays;
  phuongPhapROQMacDinh: RoqMethod;
  emailConfig: EmailIntegrationConfig;
  googleSheetsConfig: GoogleSheetsConfig;
}

export interface LichSuThaoTac {
  id: string;
  thoiGian: string;
  nguoiThucHien: string;
  vaiTro: UserRole;
  hanhDong: string;
  doiTuong: string;
  chiTiet: string;
}

export interface DatabaseSchema {
  PHU_TUNG: PhuTung[];
  NHA_CUNG_CAP: NhaCungCap[];
  NHAP_XUAT_KHO: NhapXuatKho[];
  DON_DAT_HANG: DonDatHang[];
  CHI_TIET_DON_HANG: ChiTietDonHang[];
  DE_XUAT_DAT_HANG: DeXuatDatHang[];
  CANH_BAO_TON_KHO: CanhBaoTonKho[];
  YEU_CAU_PHU_TUNG: YeuCauPhuTung[];
  CAU_HINH_KPI: CauHinhKPI;
  LICH_SU_THAO_TAC: LichSuThaoTac[];
}

export interface PartKpiBreakdown {
  phuTungId: string;
  kpiWindowDays: KpiWindowDays;
  // Stock & Position
  tonHienTai: number;
  tonKhaDung: number;
  soLuongDangDat: number;
  soLuongGiuCho: number;
  inventoryPosition: number;
  giaTriTonKho: number;
  // A. Average Daily Demand
  tongTieuThuTrongKy: number;
  add: number;
  nhuCauToiDaNgay: number;
  addFormula: string;
  // B. Lead Time
  leadTime: number;
  leadTimeToiDa: number;
  leadTimeNguon: 'Thủ công' | 'Trung bình lịch sử đơn hàng' | 'Mặc định nhà cung cấp';
  leadTimeSampleCount: number;
  // C. Safety Stock
  safetyStock: number;
  safetyStockNguon: 'Thủ công' | 'Tự động (Max - Avg)';
  safetyStockFormula: string;
  // D. Reorder Point
  rop: number;
  ropFormula: string;
  // E. EOQ
  annualDemandD: number;
  eoq: number | null;
  eoqDuDuLieu: boolean;
  eoqThongBao: string;
  eoqFormula: string;
  // F. ROQ
  roq: number;
  roqPhuongPhap: RoqMethod;
  roqFormula: string;
  // Turnover & DOH per part
  giaVonXuatTrongKy: number;
  inventoryTurnover: number | null;
  doh: number | null;
  // Status flags
  trangThai: InventoryStatus;
  canDatHang: boolean;
  duoiSafetyStock: boolean;
  hetHang: boolean;
}

export interface HydratedPart extends PhuTung {
  nhaCungCap?: NhaCungCap;
  kpi: PartKpiBreakdown;
}

export interface HydratedProposal extends DeXuatDatHang {
  phuTung?: HydratedPart;
  nhaCungCap?: NhaCungCap;
}

export interface HydratedOrder extends DonDatHang {
  nhaCungCap?: NhaCungCap;
  chiTiet: Array<ChiTietDonHang & { phuTung?: PhuTung }>;
  isOverdue: boolean;
  isDueSoon: boolean;
}

export interface DashboardTimeSeriesPoint {
  label: string;
  dateKey: string;
  nhap: number;
  xuat: number;
  tonCuoiKy: number;
}

export interface TopUsedPartPoint {
  phuTungId: string;
  maPhuTung: string;
  tenPhuTung: string;
  soLuongSuDung: number;
  giaTriSuDung: number;
}

export interface StatusDistributionPoint {
  status: InventoryStatus;
  label: string;
  count: number;
  color: string;
}

export interface DashboardSummary {
  periodFilter: DashboardPeriodFilter;
  periodLabel: string;
  periodDays: number;
  kpiWindowDays: KpiWindowDays;
  // 10 Dashboard KPIs
  tongMaPhuTung: number;
  tongSoLuongTon: number;
  tongGiaTriTonKho: number;
  soPhuTungCanDatHang: number;
  soPhuTungHetHang: number;
  soPhuTungDuoiSafetyStock: number;
  tongNhapTrongKy: number;
  tongXuatTrongKy: number;
  giaVonXuatTrongKy: number;
  giaTriTonBinhQuan: number;
  inventoryTurnover: number | null;
  inventoryTurnoverFormula: string;
  doh: number | null;
  dohFormula: string;
  tongGiaTriDeXuatDatHang: number;
  // Stockout Rate (5.I)
  tongYeuCauPhuTung: number;
  soLanThieuHang: number;
  stockoutRate: number | null;
  stockoutFormula: string;
  // Charts
  nhapXuatTonSeries: DashboardTimeSeriesPoint[];
  top5SuDung: TopUsedPartPoint[];
  phanBoTrangThai: StatusDistributionPoint[];
  xuHuongTieuThu: Array<{ label: string; tieuThu: number; trungBinh: number }>;
}

export interface AppStateResponse {
  parts: HydratedPart[];
  suppliers: NhaCungCap[];
  transactions: NhapXuatKho[];
  proposals: HydratedProposal[];
  orders: HydratedOrder[];
  alerts: CanhBaoTonKho[];
  requests: YeuCauPhuTung[];
  config: CauHinhKPI;
  auditLogs: LichSuThaoTac[];
  dashboard: DashboardSummary;
  serverTime: string;
}

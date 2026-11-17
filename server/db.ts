import fs from 'node:fs';
import path from 'node:path';
import type {
  CanhBaoTonKho,
  DatabaseSchema,
  DeXuatDatHang,
  LichSuThaoTac,
  UserRole,
} from '../src/types/inventory.ts';
import { hydrateDatabase } from './kpiEngine.ts';

const IS_VERCEL = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = IS_VERCEL
  ? path.join('/tmp', 'tienthu_inventory_data')
  : path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'tienthu_db.json');

function daysAgoIso(days: number, hour = 9, minute = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

function daysFromNowIso(days: number, hour = 17): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

export function createSeedDatabase(): DatabaseSchema {
  const nowIso = new Date().toISOString();

  const suppliers = [
    {
      id: 'NCC01',
      maNCC: 'NCC-HONDA',
      tenNCC: 'Công ty TNHH Phụ tùng Honda Việt Nam (Miền Trung)',
      nguoiLienHe: 'Nguyễn Minh Tuấn',
      soDienThoai: '0905 214 889',
      email: 'kinhdoanh.pt@hondamientrung.vn',
      diaChi: 'KCN Hòa Khánh, Liên Chiểu, Đà Nẵng',
      leadTimeMacDinh: 5,
      ghiChu: 'Nhà cung cấp chính hãng má phanh, lọc gió, bộ truyền động',
    },
    {
      id: 'NCC02',
      maNCC: 'NCC-NHOT',
      tenNCC: 'Nhà phân phối Dầu nhớt & Hóa chất Tiến Phát',
      nguoiLienHe: 'Trần Thị Thu Hà',
      soDienThoai: '0913 482 110',
      email: 'orders@tienphatlube.vn',
      diaChi: '148 Tôn Đức Thắng, Cẩm Lệ, Đà Nẵng',
      leadTimeMacDinh: 3,
      ghiChu: 'Giao hàng nhanh trong nội thành và khu vực miền Trung',
    },
    {
      id: 'NCC03',
      maNCC: 'NCC-DIEN',
      tenNCC: 'Công ty CP Thiết bị Điện & Ắc quy Thành Công',
      nguoiLienHe: 'Lê Quốc Bảo',
      soDienThoai: '0988 732 456',
      email: 'baogia@acquythanhcong.vn',
      diaChi: '72 Nguyễn Văn Linh, Hải Châu, Đà Nẵng',
      leadTimeMacDinh: 4,
      ghiChu: 'Chuyên bugi NGK, ắc quy GS, bóng đèn LED chính hãng',
    },
    {
      id: 'NCC04',
      maNCC: 'NCC-LOP',
      tenNCC: 'Tổng kho Săm lốp & Dây curoa Miền Trung',
      nguoiLienHe: 'Phạm Văn Hùng',
      soDienThoai: '0903 655 321',
      email: 'sales@kholopmientrung.vn',
      diaChi: '295 Điện Biên Phủ, Thanh Khê, Đà Nẵng',
      leadTimeMacDinh: 6,
      ghiChu: 'Lốp IRC, Chengshin và dây curoa Bando',
    },
  ];

  const parts = [
    {
      id: 'PT001',
      maPhuTung: 'PT001',
      tenPhuTung: 'Má phanh xe máy',
      loaiPhuTung: 'Hệ thống phanh',
      donViTinh: 'Bộ',
      giaNhap: 85000,
      giaXuatThamKhao: 135000,
      nhaCungCapId: 'NCC01',
      tonDauKy: 20,
      tonHienTai: 20, // Demo requirement: 20 bộ ban đầu
      soLuongGiuCho: 0,
      phuongPhapSS: 'manual' as const,
      safetyStockThuCong: 5, // Demo requirement: SS = 5
      phuongPhapLT: 'manual' as const,
      leadTimeThuCong: 5, // Demo requirement: LT = 5 -> ROP = 2*5 + 5 = 15
      chiPhiDatHang: 150000,
      chiPhiLuuKhoNam: 24000,
      phuongPhapROQ: 'eoq' as const,
      mucTonMucTieu: 45,
      quyCachDongGoi: 5,
      soLuongDatToiThieu: 10,
      ngayTao: daysAgoIso(45),
      ngayCapNhat: nowIso,
    },
    {
      id: 'PT002',
      maPhuTung: 'PT002',
      tenPhuTung: 'Dầu nhớt tổng hợp 10W-40 (0.8L)',
      loaiPhuTung: 'Dầu nhớt & Lọc',
      donViTinh: 'Chai',
      giaNhap: 92000,
      giaXuatThamKhao: 145000,
      nhaCungCapId: 'NCC02',
      tonDauKy: 70,
      tonHienTai: 68,
      soLuongGiuCho: 0,
      phuongPhapSS: 'auto' as const,
      safetyStockThuCong: null,
      phuongPhapLT: 'manual' as const,
      leadTimeThuCong: 3,
      chiPhiDatHang: 120000,
      chiPhiLuuKhoNam: 18000,
      phuongPhapROQ: 'eoq' as const,
      mucTonMucTieu: 120,
      quyCachDongGoi: 12,
      soLuongDatToiThieu: 24,
      ngayTao: daysAgoIso(60),
      ngayCapNhat: nowIso,
    },
    {
      id: 'PT003',
      maPhuTung: 'PT003',
      tenPhuTung: 'Bugi NGK Iridium CR8EGP',
      loaiPhuTung: 'Điện & Đánh lửa',
      donViTinh: 'Cái',
      giaNhap: 78000,
      giaXuatThamKhao: 125000,
      nhaCungCapId: 'NCC03',
      tonDauKy: 30,
      tonHienTai: 18,
      soLuongGiuCho: 2,
      phuongPhapSS: 'manual' as const,
      safetyStockThuCong: 8,
      phuongPhapLT: 'manual' as const,
      leadTimeThuCong: 4,
      chiPhiDatHang: 100000,
      chiPhiLuuKhoNam: 16000,
      phuongPhapROQ: 'eoq' as const,
      mucTonMucTieu: 50,
      quyCachDongGoi: 10,
      soLuongDatToiThieu: 20,
      ngayTao: daysAgoIso(50),
      ngayCapNhat: nowIso,
    },
    {
      id: 'PT004',
      maPhuTung: 'PT004',
      tenPhuTung: 'Lọc gió động cơ Air Blade / Vario',
      loaiPhuTung: 'Dầu nhớt & Lọc',
      donViTinh: 'Cái',
      giaNhap: 65000,
      giaXuatThamKhao: 110000,
      nhaCungCapId: 'NCC01',
      tonDauKy: 22,
      tonHienTai: 6,
      soLuongGiuCho: 0,
      phuongPhapSS: 'manual' as const,
      safetyStockThuCong: 10,
      phuongPhapLT: 'manual' as const,
      leadTimeThuCong: 5,
      chiPhiDatHang: 140000,
      chiPhiLuuKhoNam: 15000,
      phuongPhapROQ: 'target' as const,
      mucTonMucTieu: 40,
      quyCachDongGoi: 5,
      soLuongDatToiThieu: 15,
      ngayTao: daysAgoIso(50),
      ngayCapNhat: nowIso,
    },
    {
      id: 'PT005',
      maPhuTung: 'PT005',
      tenPhuTung: 'Bộ nhông sên dĩa Wave / Future',
      loaiPhuTung: 'Động cơ & Truyền động',
      donViTinh: 'Bộ',
      giaNhap: 245000,
      giaXuatThamKhao: 360000,
      nhaCungCapId: 'NCC01',
      tonDauKy: 24,
      tonHienTai: 26,
      soLuongGiuCho: 0,
      phuongPhapSS: 'manual' as const,
      safetyStockThuCong: 8,
      phuongPhapLT: 'history' as const,
      leadTimeThuCong: 5,
      chiPhiDatHang: 180000,
      chiPhiLuuKhoNam: 42000,
      phuongPhapROQ: 'eoq' as const,
      mucTonMucTieu: 45,
      quyCachDongGoi: 5,
      soLuongDatToiThieu: 10,
      ngayTao: daysAgoIso(60),
      ngayCapNhat: nowIso,
    },
    {
      id: 'PT006',
      maPhuTung: 'PT006',
      tenPhuTung: 'Dây curoa truyền động Bando SH / Lead',
      loaiPhuTung: 'Động cơ & Truyền động',
      donViTinh: 'Sợi',
      giaNhap: 310000,
      giaXuatThamKhao: 465000,
      nhaCungCapId: 'NCC04',
      tonDauKy: 12,
      tonHienTai: 0,
      soLuongGiuCho: 0,
      phuongPhapSS: 'manual' as const,
      safetyStockThuCong: 5,
      phuongPhapLT: 'manual' as const,
      leadTimeThuCong: 6,
      chiPhiDatHang: 200000,
      chiPhiLuuKhoNam: 55000,
      phuongPhapROQ: 'eoq' as const,
      mucTonMucTieu: 25,
      quyCachDongGoi: 5,
      soLuongDatToiThieu: 10,
      ngayTao: daysAgoIso(45),
      ngayCapNhat: nowIso,
    },
    {
      id: 'PT007',
      maPhuTung: 'PT007',
      tenPhuTung: 'Lốp không săm 90/90-14 IRC',
      loaiPhuTung: 'Lốp & Vành',
      donViTinh: 'Cái',
      giaNhap: 410000,
      giaXuatThamKhao: 590000,
      nhaCungCapId: 'NCC04',
      tonDauKy: 18,
      tonHienTai: 22,
      soLuongGiuCho: 1,
      phuongPhapSS: 'manual' as const,
      safetyStockThuCong: 6,
      phuongPhapLT: 'manual' as const,
      leadTimeThuCong: 6,
      chiPhiDatHang: 220000,
      chiPhiLuuKhoNam: 68000,
      phuongPhapROQ: 'target' as const,
      mucTonMucTieu: 30,
      quyCachDongGoi: 2,
      soLuongDatToiThieu: 6,
      ngayTao: daysAgoIso(55),
      ngayCapNhat: nowIso,
    },
    {
      id: 'PT008',
      maPhuTung: 'PT008',
      tenPhuTung: 'Ắc quy khô GS GTZ6V 12V-5Ah',
      loaiPhuTung: 'Điện & Đánh lửa',
      donViTinh: 'Cái',
      giaNhap: 290000,
      giaXuatThamKhao: 420000,
      nhaCungCapId: 'NCC03',
      tonDauKy: 16,
      tonHienTai: 19,
      soLuongGiuCho: 0,
      phuongPhapSS: 'auto' as const,
      safetyStockThuCong: null,
      phuongPhapLT: 'history' as const,
      leadTimeThuCong: 4,
      chiPhiDatHang: 150000,
      chiPhiLuuKhoNam: 45000,
      phuongPhapROQ: 'eoq' as const,
      mucTonMucTieu: 30,
      quyCachDongGoi: 5,
      soLuongDatToiThieu: 10,
      ngayTao: daysAgoIso(60),
      ngayCapNhat: nowIso,
    },
    {
      id: 'PT009',
      maPhuTung: 'PT009',
      tenPhuTung: 'Bóng đèn LED pha H4 12V',
      loaiPhuTung: 'Điện & Đánh lửa',
      donViTinh: 'Cái',
      giaNhap: 115000,
      giaXuatThamKhao: 185000,
      nhaCungCapId: 'NCC03',
      tonDauKy: 28,
      tonHienTai: 32,
      soLuongGiuCho: 0,
      phuongPhapSS: 'manual' as const,
      safetyStockThuCong: 6,
      phuongPhapLT: 'manual' as const,
      leadTimeThuCong: 4,
      chiPhiDatHang: 110000,
      chiPhiLuuKhoNam: null, // Intentionally missing H to demonstrate Section 5.E check
      phuongPhapROQ: 'target' as const,
      mucTonMucTieu: 40,
      quyCachDongGoi: 5,
      soLuongDatToiThieu: 10,
      ngayTao: daysAgoIso(40),
      ngayCapNhat: nowIso,
    },
    {
      id: 'PT010',
      maPhuTung: 'PT010',
      tenPhuTung: 'Bố ba càng ly hợp xe tay ga',
      loaiPhuTung: 'Động cơ & Truyền động',
      donViTinh: 'Bộ',
      giaNhap: 195000,
      giaXuatThamKhao: 295000,
      nhaCungCapId: 'NCC01',
      tonDauKy: 18,
      tonHienTai: 11,
      soLuongGiuCho: 0,
      phuongPhapSS: 'manual' as const,
      safetyStockThuCong: 5,
      phuongPhapLT: 'manual' as const,
      leadTimeThuCong: 5,
      chiPhiDatHang: 160000,
      chiPhiLuuKhoNam: 36000,
      phuongPhapROQ: 'eoq' as const,
      mucTonMucTieu: 30,
      quyCachDongGoi: 5,
      soLuongDatToiThieu: 10,
      ngayTao: daysAgoIso(45),
      ngayCapNhat: nowIso,
    },
  ];

  // Transactions spanning last 30 days so PT001 has EXACTLY 60 outbound units in 30 days -> ADD = 2.0/ngày
  // And PT001 inbound = 60, outbound = 60, tonDauKy = 20 -> tonHienTai = 20!
  const transactions = [
    // PT001 - Má phanh xe máy (total outbound in last 30d = 60 -> ADD = 2/ngày)
    {
      id: 'GD-001',
      maGiaoDich: 'NK-2026-001',
      phuTungId: 'PT001',
      loaiGiaoDich: 'NHAP_KHO' as const,
      soLuong: 30,
      tonSauGiaoDich: 50,
      donGia: 85000,
      ngayGiaoDich: daysAgoIso(28, 8, 30),
      nhaCungCapId: 'NCC01',
      maChungTu: 'PO-2026-008',
      lyDo: 'Nhập bổ sung định kỳ đầu tháng',
      nguoiThucHien: 'Trần Văn Nam',
      vaiTro: 'NHAN_VIEN_KHO' as const,
    },
    {
      id: 'GD-002',
      maGiaoDich: 'XK-2026-001',
      phuTungId: 'PT001',
      loaiGiaoDich: 'XUAT_KHO' as const,
      soLuong: 14,
      tonSauGiaoDich: 36,
      donGia: 85000,
      ngayGiaoDich: daysAgoIso(24, 14, 15),
      maChungTu: 'PBH-1102',
      lyDo: 'Thay má phanh bảo dưỡng định kỳ 12.000km',
      nguoiThucHien: 'Trần Văn Nam',
      vaiTro: 'NHAN_VIEN_KHO' as const,
    },
    {
      id: 'GD-003',
      maGiaoDich: 'XK-2026-002',
      phuTungId: 'PT001',
      loaiGiaoDich: 'XUAT_KHO' as const,
      soLuong: 16,
      tonSauGiaoDich: 20,
      donGia: 85000,
      ngayGiaoDich: daysAgoIso(18, 10, 45),
      maChungTu: 'PSC-2241',
      lyDo: 'Sửa chữa hệ thống phanh trước/sau',
      nguoiThucHien: 'Trần Văn Nam',
      vaiTro: 'NHAN_VIEN_KHO' as const,
    },
    {
      id: 'GD-004',
      maGiaoDich: 'NK-2026-002',
      phuTungId: 'PT001',
      loaiGiaoDich: 'NHAP_KHO' as const,
      soLuong: 30,
      tonSauGiaoDich: 50,
      donGia: 85000,
      ngayGiaoDich: daysAgoIso(15, 9, 15),
      nhaCungCapId: 'NCC01',
      maChungTu: 'PO-2026-012',
      lyDo: 'Nhập hàng theo đơn đặt hàng PO-2026-012',
      nguoiThucHien: 'Trần Văn Nam',
      vaiTro: 'NHAN_VIEN_KHO' as const,
    },
    {
      id: 'GD-005',
      maGiaoDich: 'XK-2026-003',
      phuTungId: 'PT001',
      loaiGiaoDich: 'XUAT_KHO' as const,
      soLuong: 15,
      tonSauGiaoDich: 35,
      donGia: 85000,
      ngayGiaoDich: daysAgoIso(9, 15, 20),
      maChungTu: 'PSC-2298',
      lyDo: 'Xuất lắp đặt xưởng dịch vụ khu A',
      nguoiThucHien: 'Trần Văn Nam',
      vaiTro: 'NHAN_VIEN_KHO' as const,
    },
    {
      id: 'GD-006',
      maGiaoDich: 'XK-2026-004',
      phuTungId: 'PT001',
      loaiGiaoDich: 'XUAT_KHO' as const,
      soLuong: 15,
      tonSauGiaoDich: 20,
      donGia: 85000,
      ngayGiaoDich: daysAgoIso(2, 16, 10),
      maChungTu: 'PBH-1189',
      lyDo: 'Thay má phanh xe khách bảo hành tuần',
      nguoiThucHien: 'Trần Văn Nam',
      vaiTro: 'NHAN_VIEN_KHO' as const,
    },

    // PT002 - Dầu nhớt (fast mover: 120 in 30d -> ADD = 4/ngày)
    {
      id: 'GD-007',
      maGiaoDich: 'NK-2026-003',
      phuTungId: 'PT002',
      loaiGiaoDich: 'NHAP_KHO' as const,
      soLuong: 120,
      tonSauGiaoDich: 140,
      donGia: 92000,
      ngayGiaoDich: daysAgoIso(22, 9, 0),
      nhaCungCapId: 'NCC02',
      maChungTu: 'PO-2026-010',
      lyDo: 'Nhập lô dầu nhớt tháng',
      nguoiThucHien: 'Trần Văn Nam',
      vaiTro: 'NHAN_VIEN_KHO' as const,
    },
    {
      id: 'GD-008',
      maGiaoDich: 'XK-2026-005',
      phuTungId: 'PT002',
      loaiGiaoDich: 'XUAT_KHO' as const,
      soLuong: 48,
      tonSauGiaoDich: 92,
      donGia: 92000,
      ngayGiaoDich: daysAgoIso(14, 11, 30),
      maChungTu: 'PBH-1140',
      lyDo: 'Thay nhớt bảo dưỡng xe số & xe ga',
      nguoiThucHien: 'Trần Văn Nam',
      vaiTro: 'NHAN_VIEN_KHO' as const,
    },
    {
      id: 'GD-009',
      maGiaoDich: 'XK-2026-006',
      phuTungId: 'PT002',
      loaiGiaoDich: 'XUAT_KHO' as const,
      soLuong: 42,
      tonSauGiaoDich: 50,
      donGia: 92000,
      ngayGiaoDich: daysAgoIso(6, 15, 0),
      maChungTu: 'PSC-2315',
      lyDo: 'Xuất nhớt bảo dưỡng tuần 2',
      nguoiThucHien: 'Trần Văn Nam',
      vaiTro: 'NHAN_VIEN_KHO' as const,
    },
    {
      id: 'GD-010',
      maGiaoDich: 'NK-2026-004',
      phuTungId: 'PT002',
      loaiGiaoDich: 'NHAP_KHO' as const,
      soLuong: 48,
      tonSauGiaoDich: 98,
      donGia: 92000,
      ngayGiaoDich: daysAgoIso(4, 10, 0),
      nhaCungCapId: 'NCC02',
      maChungTu: 'PO-2026-016',
      lyDo: 'Bổ sung dầu nhớt 10W-40',
      nguoiThucHien: 'Trần Văn Nam',
      vaiTro: 'NHAN_VIEN_KHO' as const,
    },
    {
      id: 'GD-011',
      maGiaoDich: 'XK-2026-007',
      phuTungId: 'PT002',
      loaiGiaoDich: 'XUAT_KHO' as const,
      soLuong: 30,
      tonSauGiaoDich: 68,
      donGia: 92000,
      ngayGiaoDich: daysAgoIso(1, 16, 40),
      maChungTu: 'PBH-1201',
      lyDo: 'Thay nhớt định kỳ cuối tuần',
      nguoiThucHien: 'Trần Văn Nam',
      vaiTro: 'NHAN_VIEN_KHO' as const,
    },

    // PT003 - Bugi NGK (90 in 30d -> ADD = 3/ngày, LT=4, SS=8 -> ROP=20, IP=18-2=16 <= 20)
    {
      id: 'GD-012',
      maGiaoDich: 'NK-2026-005',
      phuTungId: 'PT003',
      loaiGiaoDich: 'NHAP_KHO' as const,
      soLuong: 80,
      tonSauGiaoDich: 108,
      donGia: 78000,
      ngayGiaoDich: daysAgoIso(25, 8, 45),
      nhaCungCapId: 'NCC03',
      maChungTu: 'PO-2026-009',
      lyDo: 'Nhập lô Bugi NGK đầu kỳ',
      nguoiThucHien: 'Trần Văn Nam',
      vaiTro: 'NHAN_VIEN_KHO' as const,
    },
    {
      id: 'GD-013',
      maGiaoDich: 'XK-2026-008',
      phuTungId: 'PT003',
      loaiGiaoDich: 'XUAT_KHO' as const,
      soLuong: 45,
      tonSauGiaoDich: 63,
      donGia: 78000,
      ngayGiaoDich: daysAgoIso(16, 13, 10),
      maChungTu: 'PSC-2260',
      lyDo: 'Thay bugi kiểm tra đánh lửa',
      nguoiThucHien: 'Trần Văn Nam',
      vaiTro: 'NHAN_VIEN_KHO' as const,
    },
    {
      id: 'GD-014',
      maGiaoDich: 'XK-2026-009',
      phuTungId: 'PT003',
      loaiGiaoDich: 'XUAT_KHO' as const,
      soLuong: 45,
      tonSauGiaoDich: 18,
      donGia: 78000,
      ngayGiaoDich: daysAgoIso(3, 14, 30),
      maChungTu: 'PBH-1174',
      lyDo: 'Thay bugi bảo dưỡng hệ thống phun xăng FI',
      nguoiThucHien: 'Trần Văn Nam',
      vaiTro: 'NHAN_VIEN_KHO' as const,
    },

    // PT004 - Lọc gió (45 in 30d -> ADD = 1.5/ngày, LT=5, SS=10 -> ROP=17.5, ton=6 < SS=10)
    {
      id: 'GD-015',
      maGiaoDich: 'NK-2026-006',
      phuTungId: 'PT004',
      loaiGiaoDich: 'NHAP_KHO' as const,
      soLuong: 30,
      tonSauGiaoDich: 51,
      donGia: 65000,
      ngayGiaoDich: daysAgoIso(20, 9, 20),
      nhaCungCapId: 'NCC01',
      maChungTu: 'PO-2026-011',
      lyDo: 'Nhập lọc gió Air Blade / Vario',
      nguoiThucHien: 'Trần Văn Nam',
      vaiTro: 'NHAN_VIEN_KHO' as const,
    },
    {
      id: 'GD-016',
      maGiaoDich: 'XK-2026-010',
      phuTungId: 'PT004',
      loaiGiaoDich: 'XUAT_KHO' as const,
      soLuong: 25,
      tonSauGiaoDich: 26,
      donGia: 65000,
      ngayGiaoDich: daysAgoIso(11, 10, 0),
      maChungTu: 'PSC-2280',
      lyDo: 'Vệ sinh và thay mới lọc gió xe tay ga',
      nguoiThucHien: 'Trần Văn Nam',
      vaiTro: 'NHAN_VIEN_KHO' as const,
    },
    {
      id: 'GD-017',
      maGiaoDich: 'XK-2026-011',
      phuTungId: 'PT004',
      loaiGiaoDich: 'XUAT_KHO' as const,
      soLuong: 20,
      tonSauGiaoDich: 6,
      donGia: 65000,
      ngayGiaoDich: daysAgoIso(2, 11, 15),
      maChungTu: 'PBH-1192',
      lyDo: 'Xuất thay lọc gió đợt bảo dưỡng lớn',
      nguoiThucHien: 'Trần Văn Nam',
      vaiTro: 'NHAN_VIEN_KHO' as const,
    },

    // PT005 - Nhông sên dĩa (30 in 30d -> ADD = 1/ngày)
    {
      id: 'GD-018',
      maGiaoDich: 'NK-2026-007',
      phuTungId: 'PT005',
      loaiGiaoDich: 'NHAP_KHO' as const,
      soLuong: 32,
      tonSauGiaoDich: 56,
      donGia: 245000,
      ngayGiaoDich: daysAgoIso(19, 10, 30),
      nhaCungCapId: 'NCC01',
      maChungTu: 'PO-2026-013',
      lyDo: 'Nhập bộ nhông sên dĩa chính hãng',
      nguoiThucHien: 'Trần Văn Nam',
      vaiTro: 'NHAN_VIEN_KHO' as const,
    },
    {
      id: 'GD-019',
      maGiaoDich: 'XK-2026-012',
      phuTungId: 'PT005',
      loaiGiaoDich: 'XUAT_KHO' as const,
      soLuong: 30,
      tonSauGiaoDich: 26,
      donGia: 245000,
      ngayGiaoDich: daysAgoIso(7, 14, 0),
      maChungTu: 'PSC-2304',
      lyDo: 'Thay nhông sên dĩa xe số',
      nguoiThucHien: 'Trần Văn Nam',
      vaiTro: 'NHAN_VIEN_KHO' as const,
    },

    // PT006 - Dây curoa (24 in 30d -> ADD = 0.8/ngày, ton = 0 HET_HANG)
    {
      id: 'GD-020',
      maGiaoDich: 'NK-2026-008',
      phuTungId: 'PT006',
      loaiGiaoDich: 'NHAP_KHO' as const,
      soLuong: 12,
      tonSauGiaoDich: 24,
      donGia: 310000,
      ngayGiaoDich: daysAgoIso(21, 9, 0),
      nhaCungCapId: 'NCC04',
      maChungTu: 'PO-2026-007',
      lyDo: 'Nhập dây curoa Bando',
      nguoiThucHien: 'Trần Văn Nam',
      vaiTro: 'NHAN_VIEN_KHO' as const,
    },
    {
      id: 'GD-021',
      maGiaoDich: 'XK-2026-013',
      phuTungId: 'PT006',
      loaiGiaoDich: 'XUAT_KHO' as const,
      soLuong: 24,
      tonSauGiaoDich: 0,
      donGia: 310000,
      ngayGiaoDich: daysAgoIso(5, 16, 0),
      maChungTu: 'PSC-2320',
      lyDo: 'Thay dây curoa định kỳ 24.000km cho SH & Lead',
      nguoiThucHien: 'Trần Văn Nam',
      vaiTro: 'NHAN_VIEN_KHO' as const,
    },

    // PT007 - Lốp IRC (21 in 30d -> ADD = 0.7/ngày)
    {
      id: 'GD-022',
      maGiaoDich: 'NK-2026-009',
      phuTungId: 'PT007',
      loaiGiaoDich: 'NHAP_KHO' as const,
      soLuong: 25,
      tonSauGiaoDich: 43,
      donGia: 410000,
      ngayGiaoDich: daysAgoIso(17, 8, 30),
      nhaCungCapId: 'NCC04',
      maChungTu: 'PO-2026-014',
      lyDo: 'Nhập lốp không săm IRC',
      nguoiThucHien: 'Trần Văn Nam',
      vaiTro: 'NHAN_VIEN_KHO' as const,
    },
    {
      id: 'GD-023',
      maGiaoDich: 'XK-2026-014',
      phuTungId: 'PT007',
      loaiGiaoDich: 'XUAT_KHO' as const,
      soLuong: 21,
      tonSauGiaoDich: 22,
      donGia: 410000,
      ngayGiaoDich: daysAgoIso(4, 15, 30),
      maChungTu: 'PSC-2332',
      lyDo: 'Thay lốp sau xe tay ga',
      nguoiThucHien: 'Trần Văn Nam',
      vaiTro: 'NHAN_VIEN_KHO' as const,
    },

    // PT008 - Ắc quy GS (24 in 30d -> ADD = 0.8/ngày)
    {
      id: 'GD-024',
      maGiaoDich: 'NK-2026-010',
      phuTungId: 'PT008',
      loaiGiaoDich: 'NHAP_KHO' as const,
      soLuong: 27,
      tonSauGiaoDich: 43,
      donGia: 290000,
      ngayGiaoDich: daysAgoIso(12, 9, 45),
      nhaCungCapId: 'NCC03',
      maChungTu: 'PO-2026-015',
      lyDo: 'Nhập ắc quy GS chính hãng',
      nguoiThucHien: 'Trần Văn Nam',
      vaiTro: 'NHAN_VIEN_KHO' as const,
    },
    {
      id: 'GD-025',
      maGiaoDich: 'XK-2026-015',
      phuTungId: 'PT008',
      loaiGiaoDich: 'XUAT_KHO' as const,
      soLuong: 24,
      tonSauGiaoDich: 19,
      donGia: 290000,
      ngayGiaoDich: daysAgoIso(3, 10, 15),
      maChungTu: 'PBH-1180',
      lyDo: 'Thay ắc quy bảo hành & sửa chữa',
      nguoiThucHien: 'Trần Văn Nam',
      vaiTro: 'NHAN_VIEN_KHO' as const,
    },

    // PT009 - Bóng đèn LED (18 in 30d -> ADD = 0.6/ngày)
    {
      id: 'GD-026',
      maGiaoDich: 'NK-2026-011',
      phuTungId: 'PT009',
      loaiGiaoDich: 'NHAP_KHO' as const,
      soLuong: 22,
      tonSauGiaoDich: 50,
      donGia: 115000,
      ngayGiaoDich: daysAgoIso(16, 10, 0),
      nhaCungCapId: 'NCC03',
      maChungTu: 'PO-2026-011B',
      lyDo: 'Nhập bóng đèn LED pha H4',
      nguoiThucHien: 'Trần Văn Nam',
      vaiTro: 'NHAN_VIEN_KHO' as const,
    },
    {
      id: 'GD-027',
      maGiaoDich: 'XK-2026-016',
      phuTungId: 'PT009',
      loaiGiaoDich: 'XUAT_KHO' as const,
      soLuong: 18,
      tonSauGiaoDich: 32,
      donGia: 115000,
      ngayGiaoDich: daysAgoIso(5, 11, 20),
      maChungTu: 'PSC-2326',
      lyDo: 'Thay bóng đèn pha khách sửa chữa',
      nguoiThucHien: 'Trần Văn Nam',
      vaiTro: 'NHAN_VIEN_KHO' as const,
    },

    // PT010 - Bố ba càng (30 in 30d -> ADD = 1/ngày, LT=5, SS=5 -> ROP=10... wait make 36 in 30d -> ADD=1.2, LT=5, SS=6? Let's make 30 in 30d -> ADD=1, LT=7 or SS=8 -> ROP=13, ton=11 <= 13!)
    {
      id: 'GD-028',
      maGiaoDich: 'NK-2026-012',
      phuTungId: 'PT010',
      loaiGiaoDich: 'NHAP_KHO' as const,
      soLuong: 29,
      tonSauGiaoDich: 47,
      donGia: 195000,
      ngayGiaoDich: daysAgoIso(22, 11, 0),
      nhaCungCapId: 'NCC01',
      maChungTu: 'PO-2026-010B',
      lyDo: 'Nhập bố ba càng ly hợp',
      nguoiThucHien: 'Trần Văn Nam',
      vaiTro: 'NHAN_VIEN_KHO' as const,
    },
    {
      id: 'GD-029',
      maGiaoDich: 'XK-2026-017',
      phuTungId: 'PT010',
      loaiGiaoDich: 'XUAT_KHO' as const,
      soLuong: 36,
      tonSauGiaoDich: 11,
      donGia: 195000,
      ngayGiaoDich: daysAgoIso(4, 14, 45),
      maChungTu: 'PSC-2339',
      lyDo: 'Thay bố ba càng xe tay ga rung đầu',
      nguoiThucHien: 'Trần Văn Nam',
      vaiTro: 'NHAN_VIEN_KHO' as const,
    },
  ];

  // Orders: 2 received orders (for historical Lead Time) + 1 active PO in transit for PT005
  const orders = [
    {
      id: 'PO-001',
      maDonHang: 'PO-2026-012',
      nhaCungCapId: 'NCC01',
      ngayDat: daysAgoIso(20, 9, 0),
      ngayGiaoDuKien: daysAgoIso(15, 17, 0),
      ngayNhanThucTe: daysAgoIso(15, 9, 15),
      leadTimeThucTe: 5,
      tongGiaTri: 2550000,
      trangThai: 'DA_NHAN' as const,
      nguoiTao: 'Nguyễn Thị Lan (Quản lý)',
      ghiChu: 'Đơn nhập PT001 đầu tháng, giao đúng hạn',
    },
    {
      id: 'PO-002',
      maDonHang: 'PO-2026-015',
      nhaCungCapId: 'NCC03',
      ngayDat: daysAgoIso(16, 10, 0),
      ngayGiaoDuKien: daysAgoIso(12, 17, 0),
      ngayNhanThucTe: daysAgoIso(12, 9, 45),
      leadTimeThucTe: 4,
      tongGiaTri: 7830000,
      trangThai: 'DA_NHAN' as const,
      nguoiTao: 'Nguyễn Thị Lan (Quản lý)',
      ghiChu: 'Đơn nhập Ắc quy GS',
    },
    {
      id: 'PO-003',
      maDonHang: 'PO-2026-019',
      nhaCungCapId: 'NCC01',
      ngayDat: daysAgoIso(3, 10, 0),
      ngayGiaoDuKien: daysFromNowIso(2, 17),
      tongGiaTri: 3675000,
      trangThai: 'DANG_DAT' as const,
      nguoiTao: 'Nguyễn Thị Lan (Quản lý)',
      ghiChu: 'Đơn bổ sung Bộ nhông sên dĩa Wave / Future đang vận chuyển',
    },
  ];

  const orderItems = [
    {
      id: 'CTPO-001',
      donDatHangId: 'PO-001',
      phuTungId: 'PT001',
      soLuongDat: 30,
      soLuongDaNhan: 30,
      donGia: 85000,
      thanhTien: 2550000,
    },
    {
      id: 'CTPO-002',
      donDatHangId: 'PO-002',
      phuTungId: 'PT008',
      soLuongDat: 27,
      soLuongDaNhan: 27,
      donGia: 290000,
      thanhTien: 7830000,
    },
    {
      id: 'CTPO-003',
      donDatHangId: 'PO-003',
      phuTungId: 'PT005',
      soLuongDat: 15,
      soLuongDaNhan: 0,
      donGia: 245000,
      thanhTien: 3675000,
    },
  ];

  // Proposals: 1 approved ready to convert (PT010) + auto evaluator will populate PT003/PT004/PT006
  const proposals: DeXuatDatHang[] = [
    {
      id: 'DX-001',
      maDeXuat: 'DX-2026-001',
      phuTungId: 'PT010',
      nhaCungCapId: 'NCC01',
      soLuongDeXuat: 65,
      phuongPhapTinh: 'eoq',
      tonHienTaiLucTao: 11,
      inventoryPositionLucTao: 11,
      ropLucTao: 11,
      safetyStockLucTao: 5,
      eoqThamKhao: 62,
      giaTriDuKien: 65 * 195000,
      trangThai: 'DA_DUYET',
      nguonTao: 'TU_DONG',
      nguoiTao: 'Hệ thống tự động',
      ngayTao: daysAgoIso(2, 16, 0),
      nguoiDuyet: 'Nguyễn Thị Lan (Quản lý)',
      ngayDuyet: daysAgoIso(1, 9, 30),
      ghiChu: 'Đã duyệt, sẵn sàng chuyển thành Đơn đặt hàng với NCC01',
    },
  ];

  // Parts requests for real Stockout Rate calculation (5.I)
  const requests = [
    {
      id: 'YC-001',
      maYeuCau: 'YC-2026-001',
      phuTungId: 'PT001',
      maPhieuSuaChua: 'PBH-1189',
      soLuongYeuCau: 15,
      soLuongDapUng: 15,
      duocDapUngDayDu: true,
      ngayYeuCau: daysAgoIso(2, 16, 0),
      ghiChu: 'Đáp ứng đủ từ kho chính',
    },
    {
      id: 'YC-002',
      maYeuCau: 'YC-2026-002',
      phuTungId: 'PT002',
      maPhieuSuaChua: 'PBH-1201',
      soLuongYeuCau: 30,
      soLuongDapUng: 30,
      duocDapUngDayDu: true,
      ngayYeuCau: daysAgoIso(1, 16, 30),
      ghiChu: 'Đáp ứng đủ',
    },
    {
      id: 'YC-003',
      maYeuCau: 'YC-2026-003',
      phuTungId: 'PT006',
      maPhieuSuaChua: 'PSC-2345',
      soLuongYeuCau: 2,
      soLuongDapUng: 0,
      duocDapUngDayDu: false,
      ngayYeuCau: daysAgoIso(1, 15, 10),
      ghiChu: 'Hết hàng dây curoa Bando, khách hẹn quay lại sau khi nhập kho',
    },
    {
      id: 'YC-004',
      maYeuCau: 'YC-2026-004',
      phuTungId: 'PT003',
      maPhieuSuaChua: 'PBH-1174',
      soLuongYeuCau: 45,
      soLuongDapUng: 45,
      duocDapUngDayDu: true,
      ngayYeuCau: daysAgoIso(3, 14, 0),
      ghiChu: 'Đáp ứng đủ',
    },
    {
      id: 'YC-005',
      maYeuCau: 'YC-2026-005',
      phuTungId: 'PT004',
      maPhieuSuaChua: 'PBH-1192',
      soLuongYeuCau: 20,
      soLuongDapUng: 20,
      duocDapUngDayDu: true,
      ngayYeuCau: daysAgoIso(2, 11, 0),
      ghiChu: 'Đáp ứng đủ, tồn xuống dưới Safety Stock',
    },
  ];

  const auditLogs: LichSuThaoTac[] = [
    {
      id: 'LOG-001',
      thoiGian: daysAgoIso(2, 16, 10),
      nguoiThucHien: 'Trần Văn Nam',
      vaiTro: 'NHAN_VIEN_KHO',
      hanhDong: 'XUAT_KHO',
      doiTuong: 'PT001 - Má phanh xe máy',
      chiTiet: 'Xuất 15 Bộ theo phiếu PBH-1189. Tồn kho còn 20 Bộ.',
    },
    {
      id: 'LOG-002',
      thoiGian: daysAgoIso(1, 9, 30),
      nguoiThucHien: 'Nguyễn Thị Lan',
      vaiTro: 'QUAN_LY',
      hanhDong: 'DUYET_DE_XUAT',
      doiTuong: 'DX-2026-001 (PT010)',
      chiTiet: 'Phê duyệt đề xuất đặt hàng 65 Bộ Bố ba càng ly hợp xe tay ga.',
    },
  ];

  const db: DatabaseSchema = {
    PHU_TUNG: parts,
    NHA_CUNG_CAP: suppliers,
    NHAP_XUAT_KHO: transactions,
    DON_DAT_HANG: orders,
    CHI_TIET_DON_HANG: orderItems,
    DE_XUAT_DAT_HANG: proposals,
    CANH_BAO_TON_KHO: [],
    YEU_CAU_PHU_TUNG: requests,
    CAU_HINH_KPI: {
      kyPhanTichMacDinh: 30,
      phuongPhapROQMacDinh: 'eoq',
      emailConfig: {
        daCauHinh: false,
        recipientEmail: '',
        appsScriptWebhookUrl: '',
      },
      googleSheetsConfig: {
        daKetNoi: false,
        spreadsheetId: '',
        appsScriptUrl: '',
        trangThaiKetNoi: 'Chưa kết nối (Đang chạy chế độ Demo lưu trữ cục bộ bền vững)',
      },
    },
    LICH_SU_THAO_TAC: auditLogs,
  };

  evaluateAlertsAndProposals(db, 'Hệ thống', 'QUAN_LY', false);
  return db;
}

export function loadDatabase(): DatabaseSchema {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    const seed = createSeedDatabase();
    saveDatabase(seed);
    return seed;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(raw) as DatabaseSchema;
  } catch {
    const seed = createSeedDatabase();
    saveDatabase(seed);
    return seed;
  }
}

export function saveDatabase(db: DatabaseSchema): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tmpFile, DB_FILE);
}

export function resetDatabaseToDemo(): DatabaseSchema {
  const seed = createSeedDatabase();
  saveDatabase(seed);
  return seed;
}

export function nextCode(prefix: string, existingCodes: string[]): string {
  const year = new Date().getFullYear();
  let maxNum = 0;
  const regex = new RegExp(`^${prefix}-${year}-(\\d+)$`);
  for (const c of existingCodes) {
    const m = c.match(regex);
    if (m) {
      const n = Number(m[1]);
      if (n > maxNum) maxNum = n;
    }
  }
  return `${prefix}-${year}-${String(maxNum + 1).padStart(3, '0')}`;
}

export function appendAuditLog(
  db: DatabaseSchema,
  nguoiThucHien: string,
  vaiTro: UserRole,
  hanhDong: string,
  doiTuong: string,
  chiTiet: string
): void {
  db.LICH_SU_THAO_TAC.unshift({
    id: `LOG-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    thoiGian: new Date().toISOString(),
    nguoiThucHien,
    vaiTro,
    hanhDong,
    doiTuong,
    chiTiet,
  });
  if (db.LICH_SU_THAO_TAC.length > 300) {
    db.LICH_SU_THAO_TAC = db.LICH_SU_THAO_TAC.slice(0, 300);
  }
}

export function evaluateAlertsAndProposals(
  db: DatabaseSchema,
  actorName: string,
  actorRole: UserRole,
  writeAuditForAutoProposal = true
): void {
  const now = new Date();
  const nowIso = now.toISOString();
  const { parts, orders } = hydrateDatabase(db, 'month', db.CAU_HINH_KPI.kyPhanTichMacDinh, now);

  for (const part of parts) {
    const k = part.kpi;

    // Resolve old stock alerts if part is now completely sufficient
    if (!k.canDatHang && !k.duoiSafetyStock && !k.hetHang) {
      for (const a of db.CANH_BAO_TON_KHO) {
        if (
          a.phuTungId === part.id &&
          (a.loaiCanhBao === 'CHAM_ROP' ||
            a.loaiCanhBao === 'DUOI_SAFETY_STOCK' ||
            a.loaiCanhBao === 'HET_HANG') &&
          !a.daXuLy
        ) {
          a.daXuLy = true;
        }
      }
      continue;
    }

    // 1. Trigger specific stock alerts without duplicating active unresolved alert of same type
    const createAlertIfMissing = (
      loai: CanhBaoTonKho['loaiCanhBao'],
      mucDo: CanhBaoTonKho['mucDo'],
      tieuDe: string,
      noiDung: string
    ) => {
      const exists = db.CANH_BAO_TON_KHO.some(
        (a) => a.phuTungId === part.id && a.loaiCanhBao === loai && !a.daXuLy
      );
      if (!exists) {
        db.CANH_BAO_TON_KHO.unshift({
          id: `CB-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          loaiCanhBao: loai,
          mucDo,
          phuTungId: part.id,
          tieuDe,
          noiDung,
          thoiGianPhatSinh: nowIso,
          daDoc: false,
          daXuLy: false,
        });
      }
    };

    if (k.hetHang) {
      createAlertIfMissing(
        'HET_HANG',
        'KHAN_CAP',
        `Hết hàng: ${part.maPhuTung} - ${part.tenPhuTung}`,
        `Tồn kho khả dụng đã về 0 ${part.donViTinh}. ROP = ${k.rop}, Safety Stock = ${k.safetyStock}. Cần đặt bổ sung ngay.`
      );
    } else if (k.duoiSafetyStock) {
      createAlertIfMissing(
        'DUOI_SAFETY_STOCK',
        'CAO',
        `Dưới Safety Stock: ${part.maPhuTung} - ${part.tenPhuTung}`,
        `Tồn khả dụng ${k.tonKhaDung} ${part.donViTinh} < Safety Stock (${k.safetyStock} ${part.donViTinh}).`
      );
    }

    if (k.canDatHang) {
      createAlertIfMissing(
        'CHAM_ROP',
        k.hetHang || k.duoiSafetyStock ? 'CAO' : 'TRUNG_BINH',
        `Chạm điểm đặt hàng (ROP): ${part.maPhuTung} - ${part.tenPhuTung}`,
        `Vị thế tồn kho (${k.inventoryPosition} ${part.donViTinh}) ≤ ROP (${k.rop} ${part.donViTinh}). Đề xuất đặt ${k.roq} ${part.donViTinh}.`
      );

      // 2. Check if already covered by active proposal or in-transit order (prevent duplicate proposal)
      const hasOpenProposal = db.DE_XUAT_DAT_HANG.some(
        (p) =>
          p.phuTungId === part.id &&
          (p.trangThai === 'CHO_DUYET' || p.trangThai === 'DA_DUYET')
      );

      const alreadyCoveredByOrder = k.soLuongDangDat > 0 && k.inventoryPosition > k.rop;

      if (!hasOpenProposal && !alreadyCoveredByOrder) {
        const maDeXuat = nextCode(
          'DX',
          db.DE_XUAT_DAT_HANG.map((p) => p.maDeXuat)
        );
        const qty = Math.max(part.soLuongDatToiThieu || 1, k.roq);
        const proposal: DeXuatDatHang = {
          id: `DX-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          maDeXuat,
          phuTungId: part.id,
          nhaCungCapId: part.nhaCungCapId,
          soLuongDeXuat: qty,
          phuongPhapTinh: k.roqPhuongPhap,
          tonHienTaiLucTao: k.tonHienTai,
          inventoryPositionLucTao: k.inventoryPosition,
          ropLucTao: k.rop,
          safetyStockLucTao: k.safetyStock,
          eoqThamKhao: k.eoq,
          giaTriDuKien: qty * part.giaNhap,
          trangThai: 'CHO_DUYET',
          nguonTao: 'TU_DONG',
          nguoiTao: 'Hệ thống cảnh báo tự động',
          ngayTao: nowIso,
          ghiChu: `Tự động tạo do IP (${k.inventoryPosition}) ≤ ROP (${k.rop}). Phương pháp: ${k.roqPhuongPhap === 'eoq' ? 'Theo EOQ' : 'Theo mức tồn mục tiêu'}.`,
        };
        db.DE_XUAT_DAT_HANG.unshift(proposal);

        // Notify pending proposal alert
        db.CANH_BAO_TON_KHO.unshift({
          id: `CB-${Date.now()}-DX-${Math.random().toString(36).slice(2, 5)}`,
          loaiCanhBao: 'DE_XUAT_CHO_DUYET',
          mucDo: 'TRUNG_BINH',
          phuTungId: part.id,
          deXuatId: proposal.id,
          tieuDe: `Đề xuất mới chờ duyệt: ${maDeXuat} (${part.maPhuTung})`,
          noiDung: `Hệ thống tạo đề xuất đặt ${qty} ${part.donViTinh} ${part.tenPhuTung} (Giá trị dự kiến ${(qty * part.giaNhap).toLocaleString('vi-VN')} đ).`,
          thoiGianPhatSinh: nowIso,
          daDoc: false,
          daXuLy: false,
        });

        if (writeAuditForAutoProposal) {
          appendAuditLog(
            db,
            actorName,
            actorRole,
            'TAO_DE_XUAT_TU_DONG',
            `${maDeXuat} · ${part.maPhuTung}`,
            `Tồn/IP (${k.inventoryPosition}) ≤ ROP (${k.rop}) → Đổi trạng thái "${k.hetHang ? 'Hết hàng' : k.duoiSafetyStock ? 'Dưới tồn kho an toàn' : 'Cần đặt hàng'}" và tạo đề xuất ${qty} ${part.donViTinh}.`
          );
        }
      }
    }
  }

  // 3. Check overdue or due-soon POs
  for (const order of orders) {
    if (order.trangThai === 'DANG_DAT' && (order.isOverdue || order.isDueSoon)) {
      const exists = db.CANH_BAO_TON_KHO.some(
        (a) => a.donDatHangId === order.id && a.loaiCanhBao === 'DON_HANG_TRE_HAN' && !a.daXuLy
      );
      if (!exists) {
        db.CANH_BAO_TON_KHO.unshift({
          id: `CB-${Date.now()}-PO-${Math.random().toString(36).slice(2, 5)}`,
          loaiCanhBao: 'DON_HANG_TRE_HAN',
          mucDo: order.isOverdue ? 'CAO' : 'TRUNG_BINH',
          donDatHangId: order.id,
          tieuDe: order.isOverdue
            ? `Đơn hàng trễ hạn: ${order.maDonHang}`
            : `Đơn hàng sắp đến hạn giao: ${order.maDonHang}`,
          noiDung: `NCC ${order.nhaCungCap?.tenNCC ?? order.nhaCungCapId} · Dự kiến giao ${new Date(order.ngayGiaoDuKien).toLocaleDateString('vi-VN')}.`,
          thoiGianPhatSinh: nowIso,
          daDoc: false,
          daXuLy: false,
        });
      }
    }
  }
}

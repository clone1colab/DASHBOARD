import express from 'express';
import type {
  AppStateResponse,
  DashboardPeriodFilter,
  KpiWindowDays,
  PhuTung,
  UserRole,
} from '../src/types/inventory.ts';
import {
  appendAuditLog,
  evaluateAlertsAndProposals,
  loadDatabase,
  nextCode,
  resetDatabaseToDemo,
  saveDatabase,
} from './db.ts';
import { hydrateDatabase } from './kpiEngine.ts';

function getActor(req: express.Request): { name: string; role: UserRole } {
  const roleHeader = String(req.headers['x-user-role'] || 'NHAN_VIEN_KHO');
  const role: UserRole = roleHeader === 'QUAN_LY' ? 'QUAN_LY' : 'NHAN_VIEN_KHO';
  const rawName = req.headers['x-user-name'];
  const defaultName =
    role === 'QUAN_LY' ? 'Nguyễn Thị Lan (Quản lý)' : 'Trần Văn Nam (Nhân viên kho)';
  const name =
    typeof rawName === 'string' && rawName.trim()
      ? decodeURIComponent(rawName.trim())
      : defaultName;
  return { name, role };
}

function buildStateResponse(
  periodFilter: DashboardPeriodFilter = 'month',
  kpiWindowDays?: KpiWindowDays
): AppStateResponse {
  const db = loadDatabase();
  const windowDays = kpiWindowDays || db.CAU_HINH_KPI.kyPhanTichMacDinh || 30;
  const { parts, orders, proposals, dashboard } = hydrateDatabase(
    db,
    periodFilter,
    windowDays,
    new Date()
  );

  const sortedTx = [...db.NHAP_XUAT_KHO].sort(
    (a, b) => new Date(b.ngayGiaoDich).getTime() - new Date(a.ngayGiaoDich).getTime()
  );
  const sortedAlerts = [...db.CANH_BAO_TON_KHO].sort(
    (a, b) => new Date(b.thoiGianPhatSinh).getTime() - new Date(a.thoiGianPhatSinh).getTime()
  );

  return {
    parts,
    suppliers: db.NHA_CUNG_CAP,
    transactions: sortedTx,
    proposals,
    orders,
    alerts: sortedAlerts,
    requests: [...db.YEU_CAU_PHU_TUNG].sort(
      (a, b) => new Date(b.ngayYeuCau).getTime() - new Date(a.ngayYeuCau).getTime()
    ),
    config: db.CAU_HINH_KPI,
    auditLogs: db.LICH_SU_THAO_TAC,
    dashboard,
    serverTime: new Date().toISOString(),
  };
}

export function createApiApp(): express.Express {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/state', (req, res) => {
    const periodRaw = String(req.query.period || 'month');
    const period: DashboardPeriodFilter =
      periodRaw === 'day' || periodRaw === 'month' || periodRaw === 'quarter' || periodRaw === 'year'
        ? periodRaw
        : 'month';
    const kpiDaysRaw = Number(req.query.kpiDays);
    const kpiDays: KpiWindowDays | undefined =
      kpiDaysRaw === 30 || kpiDaysRaw === 60 || kpiDaysRaw === 90 ? kpiDaysRaw : undefined;

    res.json(buildStateResponse(period, kpiDays));
  });

  app.post('/api/parts', (req, res) => {
    const actor = getActor(req);
    const db = loadDatabase();
    const body = req.body as Partial<PhuTung>;

    if (!body.maPhuTung?.trim() || !body.tenPhuTung?.trim()) {
      res.status(400).json({ error: 'Vui lòng nhập đầy đủ Mã phụ tùng và Tên phụ tùng.' });
      return;
    }
    const ma = body.maPhuTung.trim().toUpperCase();
    if (db.PHU_TUNG.some((p) => p.maPhuTung.toUpperCase() === ma)) {
      res.status(400).json({ error: `Mã phụ tùng "${ma}" đã tồn tại trong danh mục.` });
      return;
    }

    const tonDauKy = Math.max(0, Number(body.tonDauKy ?? 0));
    const nowIso = new Date().toISOString();
    const newPart: PhuTung = {
      id: ma,
      maPhuTung: ma,
      tenPhuTung: body.tenPhuTung.trim(),
      loaiPhuTung: body.loaiPhuTung?.trim() || 'Khác',
      donViTinh: body.donViTinh?.trim() || 'Cái',
      giaNhap: Math.max(0, Number(body.giaNhap ?? 0)),
      giaXuatThamKhao: Math.max(0, Number(body.giaXuatThamKhao ?? 0)),
      nhaCungCapId: body.nhaCungCapId || db.NHA_CUNG_CAP[0]?.id || 'NCC01',
      tonDauKy,
      tonHienTai: tonDauKy,
      soLuongGiuCho: Math.max(0, Number(body.soLuongGiuCho ?? 0)),
      phuongPhapSS: body.phuongPhapSS === 'auto' ? 'auto' : 'manual',
      safetyStockThuCong:
        body.safetyStockThuCong === null || body.safetyStockThuCong === undefined
          ? 5
          : Math.max(0, Number(body.safetyStockThuCong)),
      phuongPhapLT: body.phuongPhapLT === 'history' ? 'history' : 'manual',
      leadTimeThuCong:
        body.leadTimeThuCong === null || body.leadTimeThuCong === undefined
          ? 5
          : Math.max(0, Number(body.leadTimeThuCong)),
      chiPhiDatHang:
        body.chiPhiDatHang !== null && body.chiPhiDatHang !== undefined && Number(body.chiPhiDatHang) > 0
          ? Number(body.chiPhiDatHang)
          : null,
      chiPhiLuuKhoNam:
        body.chiPhiLuuKhoNam !== null && body.chiPhiLuuKhoNam !== undefined && Number(body.chiPhiLuuKhoNam) > 0
          ? Number(body.chiPhiLuuKhoNam)
          : null,
      phuongPhapROQ: body.phuongPhapROQ === 'target' ? 'target' : 'eoq',
      mucTonMucTieu:
        body.mucTonMucTieu !== null && body.mucTonMucTieu !== undefined && Number(body.mucTonMucTieu) > 0
          ? Number(body.mucTonMucTieu)
          : null,
      quyCachDongGoi: Math.max(1, Number(body.quyCachDongGoi ?? 1)),
      soLuongDatToiThieu: Math.max(1, Number(body.soLuongDatToiThieu ?? 1)),
      ngayTao: nowIso,
      ngayCapNhat: nowIso,
    };

    db.PHU_TUNG.push(newPart);
    appendAuditLog(
      db,
      actor.name,
      actor.role,
      'THEM_PHU_TUNG',
      `${newPart.maPhuTung} - ${newPart.tenPhuTung}`,
      `Thêm mới phụ tùng với tồn đầu kỳ ${newPart.tonDauKy} ${newPart.donViTinh}.`
    );
    evaluateAlertsAndProposals(db, actor.name, actor.role, true);
    saveDatabase(db);
    res.json({ ok: true, part: newPart });
  });

  app.put('/api/parts/:id', (req, res) => {
    const actor = getActor(req);
    const db = loadDatabase();
    const part = db.PHU_TUNG.find((p) => p.id === req.params.id);
    if (!part) {
      res.status(404).json({ error: 'Không tìm thấy phụ tùng.' });
      return;
    }
    const body = req.body as Partial<PhuTung>;

    const thresholdChanged =
      (body.phuongPhapSS !== undefined && body.phuongPhapSS !== part.phuongPhapSS) ||
      (body.safetyStockThuCong !== undefined && body.safetyStockThuCong !== part.safetyStockThuCong) ||
      (body.phuongPhapLT !== undefined && body.phuongPhapLT !== part.phuongPhapLT) ||
      (body.leadTimeThuCong !== undefined && body.leadTimeThuCong !== part.leadTimeThuCong);

    if (thresholdChanged && actor.role !== 'QUAN_LY') {
      res.status(403).json({
        error: 'Chỉ Quản lý mới có quyền thay đổi ngưỡng cảnh báo (Safety Stock, Lead Time).',
      });
      return;
    }

    if (body.tenPhuTung !== undefined) part.tenPhuTung = body.tenPhuTung.trim();
    if (body.loaiPhuTung !== undefined) part.loaiPhuTung = body.loaiPhuTung.trim();
    if (body.donViTinh !== undefined) part.donViTinh = body.donViTinh.trim();
    if (body.giaNhap !== undefined) part.giaNhap = Math.max(0, Number(body.giaNhap));
    if (body.giaXuatThamKhao !== undefined) part.giaXuatThamKhao = Math.max(0, Number(body.giaXuatThamKhao));
    if (body.nhaCungCapId !== undefined) part.nhaCungCapId = body.nhaCungCapId;
    if (body.soLuongGiuCho !== undefined) part.soLuongGiuCho = Math.max(0, Number(body.soLuongGiuCho));
    if (body.phuongPhapSS !== undefined) part.phuongPhapSS = body.phuongPhapSS;
    if (body.safetyStockThuCong !== undefined) {
      part.safetyStockThuCong =
        body.safetyStockThuCong === null ? null : Math.max(0, Number(body.safetyStockThuCong));
    }
    if (body.phuongPhapLT !== undefined) part.phuongPhapLT = body.phuongPhapLT;
    if (body.leadTimeThuCong !== undefined) {
      part.leadTimeThuCong = body.leadTimeThuCong === null ? null : Math.max(0, Number(body.leadTimeThuCong));
    }
    if (body.chiPhiDatHang !== undefined) {
      part.chiPhiDatHang =
        body.chiPhiDatHang !== null && Number(body.chiPhiDatHang) > 0 ? Number(body.chiPhiDatHang) : null;
    }
    if (body.chiPhiLuuKhoNam !== undefined) {
      part.chiPhiLuuKhoNam =
        body.chiPhiLuuKhoNam !== null && Number(body.chiPhiLuuKhoNam) > 0 ? Number(body.chiPhiLuuKhoNam) : null;
    }
    if (body.phuongPhapROQ !== undefined) part.phuongPhapROQ = body.phuongPhapROQ;
    if (body.mucTonMucTieu !== undefined) {
      part.mucTonMucTieu =
        body.mucTonMucTieu !== null && Number(body.mucTonMucTieu) > 0 ? Number(body.mucTonMucTieu) : null;
    }
    if (body.quyCachDongGoi !== undefined) part.quyCachDongGoi = Math.max(1, Number(body.quyCachDongGoi));
    if (body.soLuongDatToiThieu !== undefined) part.soLuongDatToiThieu = Math.max(1, Number(body.soLuongDatToiThieu));
    part.ngayCapNhat = new Date().toISOString();

    appendAuditLog(
      db,
      actor.name,
      actor.role,
      'CAP_NHAT_PHU_TUNG',
      `${part.maPhuTung} - ${part.tenPhuTung}`,
      `Cập nhật thông số danh mục / ngưỡng KPI.`
    );
    evaluateAlertsAndProposals(db, actor.name, actor.role, true);
    saveDatabase(db);
    res.json({ ok: true, part });
  });

  app.delete('/api/parts/:id', (req, res) => {
    const actor = getActor(req);
    if (actor.role !== 'QUAN_LY') {
      res.status(403).json({ error: 'Chỉ Quản lý mới có quyền xóa mã phụ tùng.' });
      return;
    }
    const db = loadDatabase();
    const idx = db.PHU_TUNG.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      res.status(404).json({ error: 'Không tìm thấy phụ tùng.' });
      return;
    }
    const removed = db.PHU_TUNG[idx];
    db.PHU_TUNG.splice(idx, 1);
    appendAuditLog(
      db,
      actor.name,
      actor.role,
      'XOA_PHU_TUNG',
      `${removed.maPhuTung} - ${removed.tenPhuTung}`,
      'Đã xóa phụ tùng khỏi danh mục.'
    );
    saveDatabase(db);
    res.json({ ok: true });
  });

  app.post('/api/transactions', (req, res) => {
    const actor = getActor(req);
    const db = loadDatabase();
    const {
      phuTungId,
      loaiGiaoDich,
      soLuong,
      ngayGiaoDich,
      nhaCungCapId,
      maChungTu,
      lyDo,
      dieuChinhMode,
    } = req.body as {
      phuTungId: string;
      loaiGiaoDich: 'NHAP_KHO' | 'XUAT_KHO' | 'DIEU_CHINH';
      soLuong: number;
      ngayGiaoDich?: string;
      nhaCungCapId?: string;
      maChungTu?: string;
      lyDo?: string;
      dieuChinhMode?: 'delta' | 'set_actual';
    };

    const part = db.PHU_TUNG.find((p) => p.id === phuTungId);
    if (!part) {
      res.status(404).json({ error: 'Không tìm thấy phụ tùng đã chọn.' });
      return;
    }

    const qtyNum = Number(soLuong);
    if (Number.isNaN(qtyNum)) {
      res.status(400).json({ error: 'Số lượng không hợp lệ.' });
      return;
    }

    const txDate = ngayGiaoDich ? new Date(ngayGiaoDich) : new Date();
    if (ngayGiaoDich && /^\d{4}-\d{2}-\d{2}$/.test(ngayGiaoDich)) {
      const now = new Date();
      txDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
    }
    const txIso = txDate.toISOString();

    let delta = 0;
    let storedQty = 0;
    let prefix = 'GD';

    if (loaiGiaoDich === 'NHAP_KHO') {
      if (qtyNum <= 0) {
        res.status(400).json({ error: 'Số lượng nhập kho phải lớn hơn 0.' });
        return;
      }
      delta = qtyNum;
      storedQty = qtyNum;
      prefix = 'NK';
    } else if (loaiGiaoDich === 'XUAT_KHO') {
      if (qtyNum <= 0) {
        res.status(400).json({ error: 'Số lượng xuất kho phải lớn hơn 0.' });
        return;
      }
      const tonKhaDung = Math.max(0, part.tonHienTai - (part.soLuongGiuCho || 0));
      if (qtyNum > tonKhaDung) {
        res.status(400).json({
          error: `Không thể xuất vượt tồn kho khả dụng (${tonKhaDung} ${part.donViTinh}). Yêu cầu xuất: ${qtyNum} ${part.donViTinh}.`,
          shortage: true,
          tonKhaDung,
        });
        return;
      }
      if (!maChungTu?.trim()) {
        res.status(400).json({ error: 'Vui lòng nhập Mã phiếu bảo hành hoặc sửa chữa khi xuất kho.' });
        return;
      }
      delta = -qtyNum;
      storedQty = qtyNum;
      prefix = 'XK';
    } else if (loaiGiaoDich === 'DIEU_CHINH') {
      if (!lyDo?.trim()) {
        res.status(400).json({ error: 'Vui lòng nhập lý do điều chỉnh tồn kho.' });
        return;
      }
      if (dieuChinhMode === 'set_actual') {
        if (qtyNum < 0) {
          res.status(400).json({ error: 'Số lượng tồn thực tế sau kiểm kê không được âm.' });
          return;
        }
        delta = qtyNum - part.tonHienTai;
      } else {
        delta = qtyNum;
      }
      if (part.tonHienTai + delta < 0) {
        res.status(400).json({ error: 'Tồn kho sau điều chỉnh không được nhỏ hơn 0.' });
        return;
      }
      storedQty = delta;
      prefix = 'DC';
    } else {
      res.status(400).json({ error: 'Loại giao dịch không hợp lệ.' });
      return;
    }

    const oldStock = part.tonHienTai;
    const newStock = oldStock + delta;
    part.tonHienTai = newStock;
    part.ngayCapNhat = new Date().toISOString();

    const maGiaoDich = nextCode(
      prefix,
      db.NHAP_XUAT_KHO.map((t) => t.maGiaoDich)
    );

    const tx = {
      id: `GD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      maGiaoDich,
      phuTungId: part.id,
      loaiGiaoDich,
      soLuong: storedQty,
      tonSauGiaoDich: newStock,
      donGia: part.giaNhap,
      ngayGiaoDich: txIso,
      nhaCungCapId: loaiGiaoDich === 'NHAP_KHO' ? nhaCungCapId || part.nhaCungCapId : undefined,
      maChungTu: maChungTu?.trim() || maGiaoDich,
      lyDo:
        lyDo?.trim() ||
        (loaiGiaoDich === 'NHAP_KHO' ? 'Nhập kho phụ tùng' : 'Xuất kho sử dụng'),
      nguoiThucHien: actor.name,
      vaiTro: actor.role,
    };
    db.NHAP_XUAT_KHO.unshift(tx);

    if (loaiGiaoDich === 'XUAT_KHO') {
      const maYeuCau = nextCode(
        'YC',
        db.YEU_CAU_PHU_TUNG.map((r) => r.maYeuCau)
      );
      db.YEU_CAU_PHU_TUNG.unshift({
        id: `YC-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        maYeuCau,
        phuTungId: part.id,
        maPhieuSuaChua: tx.maChungTu,
        soLuongYeuCau: storedQty,
        soLuongDapUng: storedQty,
        duocDapUngDayDu: true,
        ngayYeuCau: txIso,
        ghiChu: tx.lyDo,
      });
    }

    appendAuditLog(
      db,
      actor.name,
      actor.role,
      loaiGiaoDich,
      `${part.maPhuTung} - ${part.tenPhuTung}`,
      `${loaiGiaoDich === 'NHAP_KHO' ? 'Nhập' : loaiGiaoDich === 'XUAT_KHO' ? 'Xuất' : 'Điều chỉnh'} ${Math.abs(delta)} ${part.donViTinh} (Chứng từ: ${tx.maChungTu}). Tồn: ${oldStock} → ${newStock} ${part.donViTinh}.`
    );

    const beforeProposalIds = new Set(db.DE_XUAT_DAT_HANG.map((p) => p.id));
    evaluateAlertsAndProposals(db, actor.name, actor.role, true);
    const createdProposal = db.DE_XUAT_DAT_HANG.find((p) => !beforeProposalIds.has(p.id));

    saveDatabase(db);
    res.json({
      ok: true,
      transaction: tx,
      oldStock,
      newStock,
      autoProposalCreated: createdProposal || null,
    });
  });

  app.post('/api/requests', (req, res) => {
    const actor = getActor(req);
    const db = loadDatabase();
    const { phuTungId, maPhieuSuaChua, soLuongYeuCau, soLuongDapUng, ghiChu } = req.body as {
      phuTungId: string;
      maPhieuSuaChua: string;
      soLuongYeuCau: number;
      soLuongDapUng: number;
      ghiChu?: string;
    };
    const part = db.PHU_TUNG.find((p) => p.id === phuTungId);
    if (!part) {
      res.status(404).json({ error: 'Không tìm thấy phụ tùng.' });
      return;
    }
    const reqQty = Math.max(1, Number(soLuongYeuCau));
    const fulQty = Math.max(0, Math.min(reqQty, Number(soLuongDapUng)));
    const maYeuCau = nextCode(
      'YC',
      db.YEU_CAU_PHU_TUNG.map((r) => r.maYeuCau)
    );
    const record = {
      id: `YC-${Date.now()}`,
      maYeuCau,
      phuTungId,
      maPhieuSuaChua: maPhieuSuaChua?.trim() || maYeuCau,
      soLuongYeuCau: reqQty,
      soLuongDapUng: fulQty,
      duocDapUngDayDu: fulQty >= reqQty,
      ngayYeuCau: new Date().toISOString(),
      ghiChu: ghiChu?.trim() || (fulQty < reqQty ? 'Thiếu hàng không đáp ứng đủ' : 'Đáp ứng đủ'),
    };
    db.YEU_CAU_PHU_TUNG.unshift(record);
    appendAuditLog(
      db,
      actor.name,
      actor.role,
      'GHI_NHAN_YEU_CAU_PHU_TUNG',
      `${maYeuCau} · ${part.maPhuTung}`,
      `Yêu cầu ${reqQty}, đáp ứng ${fulQty} ${part.donViTinh}.`
    );
    saveDatabase(db);
    res.json({ ok: true, request: record });
  });

  app.post('/api/proposals', (req, res) => {
    const actor = getActor(req);
    const db = loadDatabase();
    const { phuTungId, soLuongDeXuat, nhaCungCapId, ghiChu } = req.body as {
      phuTungId: string;
      soLuongDeXuat: number;
      nhaCungCapId?: string;
      ghiChu?: string;
    };

    const { parts } = hydrateDatabase(db, 'month', db.CAU_HINH_KPI.kyPhanTichMacDinh);
    const part = parts.find((p) => p.id === phuTungId);
    if (!part) {
      res.status(404).json({ error: 'Không tìm thấy phụ tùng.' });
      return;
    }

    const qty = Math.max(1, Number(soLuongDeXuat));
    const maDeXuat = nextCode(
      'DX',
      db.DE_XUAT_DAT_HANG.map((p) => p.maDeXuat)
    );
    const nowIso = new Date().toISOString();

    const proposal = {
      id: `DX-${Date.now()}`,
      maDeXuat,
      phuTungId: part.id,
      nhaCungCapId: nhaCungCapId || part.nhaCungCapId,
      soLuongDeXuat: qty,
      phuongPhapTinh: 'manual' as const,
      tonHienTaiLucTao: part.tonHienTai,
      inventoryPositionLucTao: part.kpi.inventoryPosition,
      ropLucTao: part.kpi.rop,
      safetyStockLucTao: part.kpi.safetyStock,
      eoqThamKhao: part.kpi.eoq,
      giaTriDuKien: qty * part.giaNhap,
      trangThai: 'CHO_DUYET' as const,
      nguonTao: 'THU_CONG' as const,
      nguoiTao: actor.name,
      ngayTao: nowIso,
      ghiChu: ghiChu?.trim() || 'Đề xuất đặt hàng tạo thủ công',
    };
    db.DE_XUAT_DAT_HANG.unshift(proposal);

    db.CANH_BAO_TON_KHO.unshift({
      id: `CB-${Date.now()}`,
      loaiCanhBao: 'DE_XUAT_CHO_DUYET',
      mucDo: 'TRUNG_BINH',
      phuTungId: part.id,
      deXuatId: proposal.id,
      tieuDe: `Đề xuất chờ duyệt: ${maDeXuat} (${part.maPhuTung})`,
      noiDung: `${actor.name} tạo đề xuất đặt ${qty} ${part.donViTinh} ${part.tenPhuTung}.`,
      thoiGianPhatSinh: nowIso,
      daDoc: false,
      daXuLy: false,
    });

    appendAuditLog(
      db,
      actor.name,
      actor.role,
      'TAO_DE_XUAT',
      `${maDeXuat} · ${part.maPhuTung}`,
      `Tạo đề xuất đặt ${qty} ${part.donViTinh}.`
    );
    saveDatabase(db);
    res.json({ ok: true, proposal });
  });

  app.put('/api/proposals/:id', (req, res) => {
    const actor = getActor(req);
    const db = loadDatabase();
    const proposal = db.DE_XUAT_DAT_HANG.find((p) => p.id === req.params.id);
    if (!proposal) {
      res.status(404).json({ error: 'Không tìm thấy đề xuất đặt hàng.' });
      return;
    }
    if (proposal.trangThai !== 'CHO_DUYET') {
      res.status(400).json({ error: 'Chỉ được chỉnh sửa đề xuất đang ở trạng thái Chờ duyệt.' });
      return;
    }
    const { soLuongDeXuat, nhaCungCapId, ghiChu } = req.body as {
      soLuongDeXuat?: number;
      nhaCungCapId?: string;
      ghiChu?: string;
    };
    const part = db.PHU_TUNG.find((p) => p.id === proposal.phuTungId);
    if (soLuongDeXuat !== undefined) {
      const qty = Math.max(1, Number(soLuongDeXuat));
      proposal.soLuongDeXuat = qty;
      proposal.giaTriDuKien = qty * (part?.giaNhap ?? 0);
    }
    if (nhaCungCapId) proposal.nhaCungCapId = nhaCungCapId;
    if (ghiChu !== undefined) proposal.ghiChu = ghiChu;

    appendAuditLog(
      db,
      actor.name,
      actor.role,
      'SUA_DE_XUAT',
      proposal.maDeXuat,
      `Cập nhật số lượng đề xuất thành ${proposal.soLuongDeXuat}.`
    );
    saveDatabase(db);
    res.json({ ok: true, proposal });
  });

  app.post('/api/proposals/:id/approve', (req, res) => {
    const actor = getActor(req);
    if (actor.role !== 'QUAN_LY') {
      res.status(403).json({ error: 'Chỉ Quản lý mới có quyền phê duyệt đề xuất đặt hàng.' });
      return;
    }
    const db = loadDatabase();
    const proposal = db.DE_XUAT_DAT_HANG.find((p) => p.id === req.params.id);
    if (!proposal) {
      res.status(404).json({ error: 'Không tìm thấy đề xuất.' });
      return;
    }
    if (proposal.trangThai !== 'CHO_DUYET') {
      res.status(400).json({ error: 'Đề xuất này không ở trạng thái Chờ duyệt.' });
      return;
    }
    proposal.trangThai = 'DA_DUYET';
    proposal.nguoiDuyet = actor.name;
    proposal.ngayDuyet = new Date().toISOString();

    for (const a of db.CANH_BAO_TON_KHO) {
      if (a.deXuatId === proposal.id) a.daXuLy = true;
    }

    appendAuditLog(
      db,
      actor.name,
      actor.role,
      'DUYET_DE_XUAT',
      proposal.maDeXuat,
      `Phê duyệt đặt ${proposal.soLuongDeXuat} đơn vị (Giá trị ${proposal.giaTriDuKien.toLocaleString('vi-VN')} đ).`
    );
    saveDatabase(db);
    res.json({ ok: true, proposal });
  });

  app.post('/api/proposals/:id/reject', (req, res) => {
    const actor = getActor(req);
    if (actor.role !== 'QUAN_LY') {
      res.status(403).json({ error: 'Chỉ Quản lý mới có quyền từ chối đề xuất đặt hàng.' });
      return;
    }
    const db = loadDatabase();
    const proposal = db.DE_XUAT_DAT_HANG.find((p) => p.id === req.params.id);
    if (!proposal) {
      res.status(404).json({ error: 'Không tìm thấy đề xuất.' });
      return;
    }
    if (proposal.trangThai !== 'CHO_DUYET') {
      res.status(400).json({ error: 'Đề xuất này không ở trạng thái Chờ duyệt.' });
      return;
    }
    const { lyDoTuChoi } = req.body as { lyDoTuChoi?: string };
    proposal.trangThai = 'TU_CHOI';
    proposal.nguoiDuyet = actor.name;
    proposal.ngayDuyet = new Date().toISOString();
    proposal.lyDoTuChoi = lyDoTuChoi?.trim() || 'Không duyệt theo kế hoạch kỳ này';

    for (const a of db.CANH_BAO_TON_KHO) {
      if (a.deXuatId === proposal.id) a.daXuLy = true;
    }

    appendAuditLog(
      db,
      actor.name,
      actor.role,
      'TU_CHOI_DE_XUAT',
      proposal.maDeXuat,
      `Từ chối đề xuất. Lý do: ${proposal.lyDoTuChoi}.`
    );
    saveDatabase(db);
    res.json({ ok: true, proposal });
  });

  app.post('/api/proposals/:id/convert-to-order', (req, res) => {
    const actor = getActor(req);
    if (actor.role !== 'QUAN_LY') {
      res.status(403).json({ error: 'Chỉ Quản lý mới có quyền phát hành Đơn đặt hàng với nhà cung cấp.' });
      return;
    }
    const db = loadDatabase();
    const proposal = db.DE_XUAT_DAT_HANG.find((p) => p.id === req.params.id);
    if (!proposal) {
      res.status(404).json({ error: 'Không tìm thấy đề xuất.' });
      return;
    }
    if (proposal.trangThai !== 'DA_DUYET') {
      res.status(400).json({ error: 'Đề xuất phải được Quản lý phê duyệt trước khi chuyển thành Đơn đặt hàng.' });
      return;
    }
    const part = db.PHU_TUNG.find((p) => p.id === proposal.phuTungId);
    const supplier = db.NHA_CUNG_CAP.find((s) => s.id === proposal.nhaCungCapId);
    if (!part) {
      res.status(404).json({ error: 'Không tìm thấy phụ tùng.' });
      return;
    }

    const lt = part.leadTimeThuCong ?? supplier?.leadTimeMacDinh ?? 5;
    const now = new Date();
    const dueDate = new Date(now);
    dueDate.setDate(dueDate.getDate() + lt);

    const maDonHang = nextCode(
      'PO',
      db.DON_DAT_HANG.map((o) => o.maDonHang)
    );
    const orderId = `PO-${Date.now()}`;
    const totalValue = proposal.soLuongDeXuat * part.giaNhap;

    const order = {
      id: orderId,
      maDonHang,
      nhaCungCapId: proposal.nhaCungCapId,
      deXuatId: proposal.id,
      ngayDat: now.toISOString(),
      ngayGiaoDuKien: dueDate.toISOString(),
      tongGiaTri: totalValue,
      trangThai: 'DANG_DAT' as const,
      nguoiTao: actor.name,
      ghiChu: `Chuyển từ đề xuất ${proposal.maDeXuat}. Dự kiến giao sau ${lt} ngày.`,
    };
    db.DON_DAT_HANG.unshift(order);

    db.CHI_TIET_DON_HANG.push({
      id: `CTPO-${Date.now()}`,
      donDatHangId: orderId,
      phuTungId: part.id,
      soLuongDat: proposal.soLuongDeXuat,
      soLuongDaNhan: 0,
      donGia: part.giaNhap,
      thanhTien: totalValue,
    });

    proposal.trangThai = 'DA_TAO_DON';

    appendAuditLog(
      db,
      actor.name,
      actor.role,
      'TAO_DON_DAT_HANG',
      `${maDonHang} ← ${proposal.maDeXuat}`,
      `Đặt ${proposal.soLuongDeXuat} ${part.donViTinh} ${part.tenPhuTung} từ ${supplier?.tenNCC ?? proposal.nhaCungCapId}.`
    );

    evaluateAlertsAndProposals(db, actor.name, actor.role, true);
    saveDatabase(db);
    res.json({ ok: true, order });
  });

  app.post('/api/orders/:id/receive', (req, res) => {
    const actor = getActor(req);
    const db = loadDatabase();
    const order = db.DON_DAT_HANG.find((o) => o.id === req.params.id);
    if (!order) {
      res.status(404).json({ error: 'Không tìm thấy đơn đặt hàng.' });
      return;
    }
    if (order.trangThai !== 'DANG_DAT') {
      res.status(400).json({ error: 'Đơn đặt hàng này đã hoàn tất hoặc đã hủy.' });
      return;
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const orderDate = new Date(order.ngayDat);
    const actualLt = Math.max(
      1,
      Math.round((now.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    order.trangThai = 'DA_NHAN';
    order.ngayNhanThucTe = nowIso;
    order.leadTimeThucTe = actualLt;

    const lineItems = db.CHI_TIET_DON_HANG.filter((c) => c.donDatHangId === order.id);
    for (const item of lineItems) {
      const part = db.PHU_TUNG.find((p) => p.id === item.phuTungId);
      if (!part) continue;
      const qtyToReceive = Math.max(0, item.soLuongDat - item.soLuongDaNhan);
      item.soLuongDaNhan = item.soLuongDat;

      const oldStock = part.tonHienTai;
      part.tonHienTai = oldStock + qtyToReceive;
      part.ngayCapNhat = nowIso;

      const maGiaoDich = nextCode(
        'NK',
        db.NHAP_XUAT_KHO.map((t) => t.maGiaoDich)
      );

      db.NHAP_XUAT_KHO.unshift({
        id: `GD-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        maGiaoDich,
        phuTungId: part.id,
        loaiGiaoDich: 'NHAP_KHO',
        soLuong: qtyToReceive,
        tonSauGiaoDich: part.tonHienTai,
        donGia: item.donGia || part.giaNhap,
        ngayGiaoDich: nowIso,
        nhaCungCapId: order.nhaCungCapId,
        maChungTu: order.maDonHang,
        lyDo: `Nhận hàng từ đơn đặt hàng ${order.maDonHang}`,
        nguoiThucHien: actor.name,
        vaiTro: actor.role,
      });
    }

    for (const a of db.CANH_BAO_TON_KHO) {
      if (a.donDatHangId === order.id) a.daXuLy = true;
    }

    appendAuditLog(
      db,
      actor.name,
      actor.role,
      'NHAN_HANG_DON_DAT',
      order.maDonHang,
      `Xác nhận đã nhận đủ hàng đơn ${order.maDonHang}. Tạo giao dịch nhập kho và cập nhật tồn kho tự động.`
    );

    evaluateAlertsAndProposals(db, actor.name, actor.role, true);
    saveDatabase(db);
    res.json({ ok: true, order });
  });

  app.post('/api/orders/:id/cancel', (req, res) => {
    const actor = getActor(req);
    if (actor.role !== 'QUAN_LY') {
      res.status(403).json({ error: 'Chỉ Quản lý mới có quyền hủy đơn đặt hàng.' });
      return;
    }
    const db = loadDatabase();
    const order = db.DON_DAT_HANG.find((o) => o.id === req.params.id);
    if (!order || order.trangThai !== 'DANG_DAT') {
      res.status(400).json({ error: 'Không thể hủy đơn đặt hàng này.' });
      return;
    }
    order.trangThai = 'DA_HUY';
    for (const a of db.CANH_BAO_TON_KHO) {
      if (a.donDatHangId === order.id) a.daXuLy = true;
    }
    appendAuditLog(db, actor.name, actor.role, 'HUY_DON_DAT_HANG', order.maDonHang, 'Hủy đơn đặt hàng.');
    evaluateAlertsAndProposals(db, actor.name, actor.role, true);
    saveDatabase(db);
    res.json({ ok: true, order });
  });

  app.post('/api/alerts/mark-read', (_req, res) => {
    const db = loadDatabase();
    for (const a of db.CANH_BAO_TON_KHO) a.daDoc = true;
    saveDatabase(db);
    res.json({ ok: true });
  });

  app.post('/api/alerts/:id/resolve', (req, res) => {
    const db = loadDatabase();
    const alert = db.CANH_BAO_TON_KHO.find((a) => a.id === req.params.id);
    if (alert) {
      alert.daDoc = true;
      alert.daXuLy = true;
      saveDatabase(db);
    }
    res.json({ ok: true });
  });

  app.post('/api/suppliers', (req, res) => {
    const actor = getActor(req);
    const db = loadDatabase();
    const { maNCC, tenNCC, nguoiLienHe, soDienThoai, email, diaChi, leadTimeMacDinh, ghiChu } = req.body;
    if (!maNCC?.trim() || !tenNCC?.trim()) {
      res.status(400).json({ error: 'Vui lòng nhập Mã NCC và Tên nhà cung cấp.' });
      return;
    }
    const supplier = {
      id: maNCC.trim().toUpperCase(),
      maNCC: maNCC.trim().toUpperCase(),
      tenNCC: tenNCC.trim(),
      nguoiLienHe: nguoiLienHe?.trim() || '',
      soDienThoai: soDienThoai?.trim() || '',
      email: email?.trim() || '',
      diaChi: diaChi?.trim() || '',
      leadTimeMacDinh: Math.max(1, Number(leadTimeMacDinh ?? 5)),
      ghiChu: ghiChu?.trim() || '',
    };
    db.NHA_CUNG_CAP.push(supplier);
    appendAuditLog(db, actor.name, actor.role, 'THEM_NCC', supplier.maNCC, `Thêm nhà cung cấp ${supplier.tenNCC}.`);
    saveDatabase(db);
    res.json({ ok: true, supplier });
  });

  app.put('/api/config', (req, res) => {
    const actor = getActor(req);
    if (actor.role !== 'QUAN_LY') {
      res.status(403).json({ error: 'Chỉ Quản lý mới có quyền cập nhật cấu hình hệ thống.' });
      return;
    }
    const db = loadDatabase();
    const body = req.body;
    if (body.kyPhanTichMacDinh) {
      db.CAU_HINH_KPI.kyPhanTichMacDinh = body.kyPhanTichMacDinh;
    }
    if (body.phuongPhapROQMacDinh) {
      db.CAU_HINH_KPI.phuongPhapROQMacDinh = body.phuongPhapROQMacDinh;
    }
    if (body.emailConfig) {
      const recipientEmail = String(body.emailConfig.recipientEmail || '').trim();
      const webhook = String(body.emailConfig.appsScriptWebhookUrl || '').trim();
      db.CAU_HINH_KPI.emailConfig = {
        ...db.CAU_HINH_KPI.emailConfig,
        recipientEmail,
        appsScriptWebhookUrl: webhook,
        daCauHinh: Boolean(recipientEmail && webhook),
      };
    }
    if (body.googleSheetsConfig) {
      const spreadsheetId = String(body.googleSheetsConfig.spreadsheetId || '').trim();
      const appsScriptUrl = String(body.googleSheetsConfig.appsScriptUrl || '').trim();
      db.CAU_HINH_KPI.googleSheetsConfig = {
        ...db.CAU_HINH_KPI.googleSheetsConfig,
        spreadsheetId,
        appsScriptUrl,
        daKetNoi: false,
        trangThaiKetNoi:
          appsScriptUrl && spreadsheetId
            ? 'Đã lưu URL Apps Script · Nhấn "Kiểm tra & Đồng bộ" để xác thực kết nối'
            : 'Chưa kết nối (Đang chạy chế độ Demo lưu trữ cục bộ bền vững)',
      };
    }
    appendAuditLog(db, actor.name, actor.role, 'CAP_NHAT_CAU_HINH', 'CAU_HINH_KPI', 'Cập nhật cấu hình KPI & tích hợp.');
    saveDatabase(db);
    res.json({ ok: true, config: db.CAU_HINH_KPI });
  });

  app.post('/api/integrations/sheets-sync', async (req, res) => {
    const actor = getActor(req);
    const db = loadDatabase();
    const cfg = db.CAU_HINH_KPI.googleSheetsConfig;
    if (!cfg.appsScriptUrl || !cfg.spreadsheetId) {
      res.status(400).json({
        error: 'Chưa cấu hình Google Sheets / Apps Script Web App URL. Không thể đồng bộ.',
      });
      return;
    }

    try {
      const response = await fetch(cfg.appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SYNC_TIENTHU_INVENTORY',
          spreadsheetId: cfg.spreadsheetId,
          timestamp: new Date().toISOString(),
          tables: {
            PHU_TUNG: db.PHU_TUNG,
            NHA_CUNG_CAP: db.NHA_CUNG_CAP,
            NHAP_XUAT_KHO: db.NHAP_XUAT_KHO,
            DON_DAT_HANG: db.DON_DAT_HANG,
            CHI_TIET_DON_HANG: db.CHI_TIET_DON_HANG,
            DE_XUAT_DAT_HANG: db.DE_XUAT_DAT_HANG,
            CANH_BAO_TON_KHO: db.CANH_BAO_TON_KHO,
            CAU_HINH_KPI: db.CAU_HINH_KPI,
          },
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      cfg.daKetNoi = true;
      cfg.lanDongBoCuoi = new Date().toISOString();
      cfg.trangThaiKetNoi = 'Đã kết nối & đồng bộ thành công với Google Sheets';
      appendAuditLog(db, actor.name, actor.role, 'DONG_BO_GOOGLE_SHEETS', cfg.spreadsheetId, 'Đồng bộ dữ liệu 8 bảng lên Google Sheets.');
      saveDatabase(db);
      res.json({ ok: true, config: cfg });
    } catch (err) {
      cfg.daKetNoi = false;
      cfg.trangThaiKetNoi = `Kết nối thất bại (${err instanceof Error ? err.message : 'Lỗi mạng'})`;
      saveDatabase(db);
      res.status(502).json({
        error: `Không kết nối được tới Apps Script URL: ${err instanceof Error ? err.message : 'Lỗi không xác định'}.`,
      });
    }
  });

  app.post('/api/integrations/test-email', async (_req, res) => {
    const db = loadDatabase();
    const emailCfg = db.CAU_HINH_KPI.emailConfig;
    if (!emailCfg.daCauHinh || !emailCfg.appsScriptWebhookUrl || !emailCfg.recipientEmail) {
      res.status(400).json({
        error: 'Dịch vụ gửi email cảnh báo chưa được cấu hình (thiếu Email nhận hoặc Webhook URL). Hệ thống không giả lập gửi email.',
      });
      return;
    }
    try {
      const response = await fetch(emailCfg.appsScriptWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SEND_ALERT_EMAIL',
          to: emailCfg.recipientEmail,
          subject: '[Tiến Thu] Kiểm tra cảnh báo tồn kho phụ tùng',
          body: 'Thông báo kiểm tra kết nối email cảnh báo tồn kho Tiến Thu.',
        }),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      emailCfg.lanGuiCuoi = new Date().toISOString();
      saveDatabase(db);
      res.json({ ok: true });
    } catch (err) {
      res.status(502).json({
        error: `Gửi email qua webhook thất bại: ${err instanceof Error ? err.message : 'Lỗi kết nối'}.`,
      });
    }
  });

  app.post('/api/demo/reset', (req, res) => {
    const actor = getActor(req);
    const db = resetDatabaseToDemo();
    appendAuditLog(
      db,
      actor.name,
      actor.role,
      'RESET_DU_LIEU_DEMO',
      'TOAN_BO_HE_THONG',
      'Khôi phục dữ liệu mẫu ban đầu (PT001 = 20 bộ, ADD = 2, LT = 5, SS = 5, ROP = 15).'
    );
    saveDatabase(db);
    res.json({ ok: true });
  });

  return app;
}

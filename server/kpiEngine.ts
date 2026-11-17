import type {
  CauHinhKPI,
  DashboardPeriodFilter,
  DashboardSummary,
  DashboardTimeSeriesPoint,
  DatabaseSchema,
  DonDatHang,
  HydratedOrder,
  HydratedPart,
  HydratedProposal,
  InventoryStatus,
  KpiWindowDays,
  NhaCungCap,
  NhapXuatKho,
  PartKpiBreakdown,
  PhuTung,
  StatusDistributionPoint,
  TopUsedPartPoint,
  YeuCauPhuTung,
} from '../src/types/inventory.ts';

function toDateKey(iso: string): string {
  return iso.slice(0, 10);
}

function getPeriodRange(filter: DashboardPeriodFilter, now: Date): { start: Date; end: Date; days: number; label: string } {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  const start = new Date(now);
  if (filter === 'day') {
    start.setHours(0, 0, 0, 0);
    return { start, end, days: 1, label: 'Hôm nay' };
  }
  if (filter === 'month') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    return { start, end, days, label: `Tháng ${now.getMonth() + 1}/${now.getFullYear()}` };
  }
  if (filter === 'quarter') {
    const qMonth = Math.floor(now.getMonth() / 3) * 3;
    start.setMonth(qMonth, 1);
    start.setHours(0, 0, 0, 0);
    const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    const q = Math.floor(now.getMonth() / 3) + 1;
    return { start, end, days, label: `Quý ${q}/${now.getFullYear()}` };
  }
  // year
  start.setMonth(0, 1);
  start.setHours(0, 0, 0, 0);
  const days = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  return { start, end, days, label: `Năm ${now.getFullYear()}` };
}

function roundToPackAndMoq(rawQty: number, packSize: number, moq: number): number {
  if (rawQty <= 0) return 0;
  const safePack = Math.max(1, packSize || 1);
  const safeMoq = Math.max(1, moq || 1);
  const atLeastMoq = Math.max(rawQty, safeMoq);
  return Math.ceil(atLeastMoq / safePack) * safePack;
}

export function calculatePartKPIs(
  part: PhuTung,
  supplier: NhaCungCap | undefined,
  transactions: NhapXuatKho[],
  orders: HydratedOrder[],
  kpiWindowDays: KpiWindowDays,
  now: Date = new Date()
): PartKpiBreakdown {
  const windowEnd = new Date(now);
  windowEnd.setHours(23, 59, 59, 999);
  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - kpiWindowDays);
  windowStart.setHours(0, 0, 0, 0);

  // A. Average Daily Demand (only XUAT_KHO, exclude DIEU_CHINH)
  const partOutboundInWindow = transactions.filter((t) => {
    if (t.phuTungId !== part.id || t.loaiGiaoDich !== 'XUAT_KHO') return false;
    const d = new Date(t.ngayGiaoDich);
    return d >= windowStart && d <= windowEnd;
  });

  const tongTieuThuTrongKy = partOutboundInWindow.reduce((sum, t) => sum + Math.abs(t.soLuong), 0);
  const add = Number((tongTieuThuTrongKy / kpiWindowDays).toFixed(2));

  // Group by day to find real maximum daily demand in window
  const dailyMap = new Map<string, number>();
  for (const t of partOutboundInWindow) {
    const key = toDateKey(t.ngayGiaoDich);
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + Math.abs(t.soLuong));
  }
  const nhuCauToiDaNgay = dailyMap.size > 0 ? Math.max(...Array.from(dailyMap.values())) : Math.ceil(add);

  const addFormula = `${tongTieuThuTrongKy} ${part.donViTinh} / ${kpiWindowDays} ngày = ${add} ${part.donViTinh}/ngày`;

  // B. Lead Time (LT)
  const receivedPartOrders = orders.filter(
    (o) =>
      o.trangThai === 'DA_NHAN' &&
      typeof o.leadTimeThucTe === 'number' &&
      o.chiTiet.some((c) => c.phuTungId === part.id)
  );
  const ltSamples = receivedPartOrders.map((o) => o.leadTimeThucTe as number);

  let leadTime: number;
  let leadTimeToiDa: number;
  let leadTimeNguon: PartKpiBreakdown['leadTimeNguon'];

  if (part.phuongPhapLT === 'history' && ltSamples.length > 0) {
    const avgLt = ltSamples.reduce((a, b) => a + b, 0) / ltSamples.length;
    leadTime = Number(avgLt.toFixed(1));
    leadTimeToiDa = Math.max(...ltSamples);
    leadTimeNguon = 'Trung bình lịch sử đơn hàng';
  } else if (part.leadTimeThuCong !== null && part.leadTimeThuCong >= 0) {
    leadTime = part.leadTimeThuCong;
    leadTimeToiDa = Math.max(leadTime, ltSamples.length > 0 ? Math.max(...ltSamples) : leadTime + 2);
    leadTimeNguon = 'Thủ công';
  } else {
    leadTime = supplier?.leadTimeMacDinh ?? 5;
    leadTimeToiDa = leadTime + 2;
    leadTimeNguon = 'Mặc định nhà cung cấp';
  }

  // C. Safety Stock (SS)
  let safetyStock: number;
  let safetyStockNguon: PartKpiBreakdown['safetyStockNguon'];
  let safetyStockFormula: string;

  if (part.phuongPhapSS === 'manual' && part.safetyStockThuCong !== null) {
    safetyStock = Math.max(0, part.safetyStockThuCong);
    safetyStockNguon = 'Thủ công';
    safetyStockFormula = `Thiết lập thủ công: ${safetyStock} ${part.donViTinh}`;
  } else {
    const rawSS = nhuCauToiDaNgay * leadTimeToiDa - add * leadTime;
    safetyStock = Math.max(0, Math.round(rawSS));
    safetyStockNguon = 'Tự động (Max - Avg)';
    safetyStockFormula = `MAX(0, (${nhuCauToiDaNgay} × ${leadTimeToiDa}) - (${add} × ${leadTime})) = ${safetyStock} ${part.donViTinh}`;
  }

  // D. Reorder Point (ROP) & Inventory Position
  const rop = Number((add * leadTime + safetyStock).toFixed(1));
  const ropFormula = `(${add} × ${leadTime}) + ${safetyStock} = ${rop} ${part.donViTinh}`;

  const soLuongDangDat = orders
    .filter((o) => o.trangThai === 'DANG_DAT')
    .reduce((sum, o) => {
      const lineQty = o.chiTiet
        .filter((c) => c.phuTungId === part.id)
        .reduce((s, c) => s + Math.max(0, c.soLuongDat - c.soLuongDaNhan), 0);
      return sum + lineQty;
    }, 0);

  const tonHienTai = part.tonHienTai;
  const soLuongGiuCho = Math.max(0, part.soLuongGiuCho || 0);
  const tonKhaDung = Math.max(0, tonHienTai - soLuongGiuCho);
  const inventoryPosition = tonHienTai + soLuongDangDat - soLuongGiuCho;
  const giaTriTonKho = tonHienTai * part.giaNhap;

  // E. EOQ
  const annualDemandD = Number((add * 365).toFixed(1));
  const S = part.chiPhiDatHang;
  const H = part.chiPhiLuuKhoNam;

  let eoq: number | null = null;
  let eoqDuDuLieu = false;
  let eoqThongBao = '';
  let eoqFormula = '';

  if (annualDemandD > 0 && S !== null && S > 0 && H !== null && H > 0) {
    const rawEoq = Math.sqrt((2 * annualDemandD * S) / H);
    eoq = Math.max(1, Math.round(rawEoq));
    eoqDuDuLieu = true;
    eoqThongBao = `${eoq} ${part.donViTinh}`;
    eoqFormula = `√(2 × ${annualDemandD} × ${S.toLocaleString('vi-VN')} / ${H.toLocaleString('vi-VN')}) = ${eoq} ${part.donViTinh}`;
  } else {
    eoq = null;
    eoqDuDuLieu = false;
    eoqThongBao = 'Chưa đủ dữ liệu tính EOQ';
    const missing: string[] = [];
    if (annualDemandD <= 0) missing.push('Nhu cầu D > 0');
    if (S === null || S <= 0) missing.push('Chi phí đặt hàng (S)');
    if (H === null || H <= 0) missing.push('Chi phí lưu kho (H)');
    eoqFormula = `Chưa đủ dữ liệu tính EOQ (thiếu: ${missing.join(', ')})`;
  }

  // F. ROQ (Reorder Quantity)
  const roqPhuongPhap = part.phuongPhapROQ || 'eoq';
  let roq = 0;
  let roqFormula = '';

  if (roqPhuongPhap === 'target') {
    const target = part.mucTonMucTieu !== null && part.mucTonMucTieu > 0
      ? part.mucTonMucTieu
      : Math.ceil(rop + safetyStock + add * leadTime);
    const deficit = Math.max(0, target - inventoryPosition);
    roq = deficit > 0 ? roundToPackAndMoq(deficit, part.quyCachDongGoi, part.soLuongDatToiThieu) : 0;
    roqFormula = `MAX(0, Mức mục tiêu ${target} - IP ${inventoryPosition}) = ${deficit} → Đề xuất ${roq} ${part.donViTinh} (Đóng gói ${part.quyCachDongGoi}, Tối thiểu ${part.soLuongDatToiThieu})`;
  } else {
    if (eoq !== null) {
      roq = roundToPackAndMoq(eoq, part.quyCachDongGoi, part.soLuongDatToiThieu);
      if (inventoryPosition <= rop && inventoryPosition + roq <= rop) {
        roq = roundToPackAndMoq(rop - inventoryPosition + Math.max(1, Math.ceil(add * leadTime)), part.quyCachDongGoi, part.soLuongDatToiThieu);
      }
      roqFormula = `Theo EOQ (${eoq}) → Đề xuất ${roq} ${part.donViTinh} (Quy cách ${part.quyCachDongGoi}, MOQ ${part.soLuongDatToiThieu})`;
    } else {
      const fallbackNeeded = inventoryPosition <= rop
        ? Math.max(part.soLuongDatToiThieu, Math.ceil(rop - inventoryPosition + safetyStock))
        : 0;
      roq = fallbackNeeded > 0
        ? roundToPackAndMoq(fallbackNeeded, part.quyCachDongGoi, part.soLuongDatToiThieu)
        : 0;
      roqFormula = `Chưa đủ dữ liệu EOQ → Tạm tính bù ngưỡng an toàn: ${roq} ${part.donViTinh}`;
    }
  }

  // Turnover & DOH per part over kpiWindowDays
  const giaVonXuatTrongKy = partOutboundInWindow.reduce((sum, t) => sum + Math.abs(t.soLuong) * (t.donGia || part.giaNhap), 0);
  // Walk back to find starting stock of window
  const netDeltaInWindow = transactions
    .filter((t) => {
      if (t.phuTungId !== part.id) return false;
      const d = new Date(t.ngayGiaoDich);
      return d >= windowStart && d <= windowEnd;
    })
    .reduce((sum, t) => {
      if (t.loaiGiaoDich === 'NHAP_KHO') return sum + Math.abs(t.soLuong);
      if (t.loaiGiaoDich === 'XUAT_KHO') return sum - Math.abs(t.soLuong);
      return sum + t.soLuong;
    }, 0);
  const tonDauWindow = Math.max(0, tonHienTai - netDeltaInWindow);
  const giaTriTonBinhQuan = ((tonDauWindow + tonHienTai) / 2) * part.giaNhap;
  const inventoryTurnover = giaTriTonBinhQuan > 0 && giaVonXuatTrongKy > 0
    ? Number((giaVonXuatTrongKy / giaTriTonBinhQuan).toFixed(2))
    : giaVonXuatTrongKy === 0 ? 0 : null;
  const doh = inventoryTurnover !== null && inventoryTurnover > 0
    ? Number((kpiWindowDays / inventoryTurnover).toFixed(1))
    : null;

  // Status evaluation (Section 6)
  const hetHang = tonKhaDung === 0;
  const duoiSafetyStock = !hetHang && tonKhaDung < safetyStock;
  const canDatHang = inventoryPosition <= rop;

  let trangThai: InventoryStatus = 'DU_HANG';
  if (hetHang) {
    trangThai = 'HET_HANG';
  } else if (duoiSafetyStock) {
    trangThai = 'DUOI_SAFETY_STOCK';
  } else if (canDatHang) {
    trangThai = 'CAN_DAT_HANG';
  }

  return {
    phuTungId: part.id,
    kpiWindowDays,
    tonHienTai,
    tonKhaDung,
    soLuongDangDat,
    soLuongGiuCho,
    inventoryPosition,
    giaTriTonKho,
    tongTieuThuTrongKy,
    add,
    nhuCauToiDaNgay,
    addFormula,
    leadTime,
    leadTimeToiDa,
    leadTimeNguon,
    leadTimeSampleCount: ltSamples.length,
    safetyStock,
    safetyStockNguon,
    safetyStockFormula,
    rop,
    ropFormula,
    annualDemandD,
    eoq,
    eoqDuDuLieu,
    eoqThongBao,
    eoqFormula,
    roq,
    roqPhuongPhap,
    roqFormula,
    giaVonXuatTrongKy,
    inventoryTurnover,
    doh,
    trangThai,
    canDatHang,
    duoiSafetyStock,
    hetHang,
  };
}

export function hydrateDatabase(
  db: DatabaseSchema,
  periodFilter: DashboardPeriodFilter = 'month',
  kpiWindowDays: KpiWindowDays = db.CAU_HINH_KPI.kyPhanTichMacDinh,
  now: Date = new Date()
): {
  parts: HydratedPart[];
  orders: HydratedOrder[];
  proposals: HydratedProposal[];
  dashboard: DashboardSummary;
} {
  const supplierMap = new Map(db.NHA_CUNG_CAP.map((s) => [s.id, s]));
  const partRawMap = new Map(db.PHU_TUNG.map((p) => [p.id, p]));

  const orders: HydratedOrder[] = db.DON_DAT_HANG.map((o) => {
    const details = db.CHI_TIET_DON_HANG
      .filter((c) => c.donDatHangId === o.id)
      .map((c) => ({ ...c, phuTung: partRawMap.get(c.phuTungId) }));
    const due = new Date(o.ngayGiaoDuKien);
    const diffDays = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    const isOverdue = o.trangThai === 'DANG_DAT' && diffDays < 0;
    const isDueSoon = o.trangThai === 'DANG_DAT' && diffDays >= 0 && diffDays <= 1;
    return {
      ...o,
      nhaCungCap: supplierMap.get(o.nhaCungCapId),
      chiTiet: details,
      isOverdue,
      isDueSoon,
    };
  }).sort((a, b) => new Date(b.ngayDat).getTime() - new Date(a.ngayDat).getTime());

  const parts: HydratedPart[] = db.PHU_TUNG.map((part) => {
    const supplier = supplierMap.get(part.nhaCungCapId);
    const kpi = calculatePartKPIs(part, supplier, db.NHAP_XUAT_KHO, orders, kpiWindowDays, now);
    return {
      ...part,
      nhaCungCap: supplier,
      kpi,
    };
  });

  const hydratedPartMap = new Map(parts.map((p) => [p.id, p]));

  const proposals: HydratedProposal[] = db.DE_XUAT_DAT_HANG
    .map((prop) => ({
      ...prop,
      phuTung: hydratedPartMap.get(prop.phuTungId),
      nhaCungCap: supplierMap.get(prop.nhaCungCapId),
    }))
    .sort((a, b) => new Date(b.ngayTao).getTime() - new Date(a.ngayTao).getTime());

  const dashboard = buildDashboardSummary(
    db,
    parts,
    proposals,
    periodFilter,
    kpiWindowDays,
    now
  );

  return { parts, orders, proposals, dashboard };
}

function buildDashboardSummary(
  db: DatabaseSchema,
  parts: HydratedPart[],
  proposals: HydratedProposal[],
  periodFilter: DashboardPeriodFilter,
  kpiWindowDays: KpiWindowDays,
  now: Date
): DashboardSummary {
  const { start, end, days, label } = getPeriodRange(periodFilter, now);

  const txInPeriod = db.NHAP_XUAT_KHO.filter((t) => {
    const d = new Date(t.ngayGiaoDich);
    return d >= start && d <= end;
  });

  const tongMaPhuTung = parts.length;
  const tongSoLuongTon = parts.reduce((sum, p) => sum + p.tonHienTai, 0);
  const tongGiaTriTonKho = parts.reduce((sum, p) => sum + p.kpi.giaTriTonKho, 0);

  const soPhuTungCanDatHang = parts.filter((p) => p.kpi.canDatHang).length;
  const soPhuTungHetHang = parts.filter((p) => p.kpi.hetHang).length;
  const soPhuTungDuoiSafetyStock = parts.filter((p) => p.kpi.duoiSafetyStock || p.kpi.hetHang).length;

  const tongNhapTrongKy = txInPeriod
    .filter((t) => t.loaiGiaoDich === 'NHAP_KHO')
    .reduce((sum, t) => sum + Math.abs(t.soLuong), 0);

  const tongXuatTrongKy = txInPeriod
    .filter((t) => t.loaiGiaoDich === 'XUAT_KHO')
    .reduce((sum, t) => sum + Math.abs(t.soLuong), 0);

  const partMap = new Map(parts.map((p) => [p.id, p]));
  const giaVonXuatTrongKy = txInPeriod
    .filter((t) => t.loaiGiaoDich === 'XUAT_KHO')
    .reduce((sum, t) => {
      const part = partMap.get(t.phuTungId);
      const unitCost = t.donGia || part?.giaNhap || 0;
      return sum + Math.abs(t.soLuong) * unitCost;
    }, 0);

  // Beginning inventory value at period start
  let giaTriTonDauKy = 0;
  for (const part of parts) {
    const netChangeFromStartToNow = db.NHAP_XUAT_KHO
      .filter((t) => t.phuTungId === part.id && new Date(t.ngayGiaoDich) >= start)
      .reduce((sum, t) => {
        if (t.loaiGiaoDich === 'NHAP_KHO') return sum + Math.abs(t.soLuong);
        if (t.loaiGiaoDich === 'XUAT_KHO') return sum - Math.abs(t.soLuong);
        return sum + t.soLuong;
      }, 0);
    const startQty = Math.max(0, part.tonHienTai - netChangeFromStartToNow);
    giaTriTonDauKy += startQty * part.giaNhap;
  }

  const giaTriTonBinhQuan = Math.round((giaTriTonDauKy + tongGiaTriTonKho) / 2);
  const inventoryTurnover = giaTriTonBinhQuan > 0
    ? Number((giaVonXuatTrongKy / giaTriTonBinhQuan).toFixed(2))
    : null;
  const inventoryTurnoverFormula = giaTriTonBinhQuan > 0
    ? `${giaVonXuatTrongKy.toLocaleString('vi-VN')} đ / ${giaTriTonBinhQuan.toLocaleString('vi-VN')} đ = ${inventoryTurnover} vòng`
    : 'Chưa đủ giá trị tồn kho bình quân';

  const doh = inventoryTurnover !== null && inventoryTurnover > 0
    ? Number((days / inventoryTurnover).toFixed(1))
    : null;
  const dohFormula = doh !== null && inventoryTurnover !== null
    ? `${days} ngày / ${inventoryTurnover} = ${doh} ngày`
    : 'Chưa có phát sinh xuất kho trong kỳ';

  const tongGiaTriDeXuatDatHang = proposals
    .filter((pr) => pr.trangThai === 'CHO_DUYET' || pr.trangThai === 'DA_DUYET')
    .reduce((sum, pr) => sum + pr.giaTriDuKien, 0);

  // Stockout Rate (5.I)
  const reqsInPeriod = db.YEU_CAU_PHU_TUNG.filter((r) => {
    const d = new Date(r.ngayYeuCau);
    return d >= start && d <= end;
  });
  const tongYeuCauPhuTung = reqsInPeriod.length;
  const soLanThieuHang = reqsInPeriod.filter((r) => !r.duocDapUngDayDu).length;
  const stockoutRate = tongYeuCauPhuTung > 0
    ? Number(((soLanThieuHang / tongYeuCauPhuTung) * 100).toFixed(1))
    : null;
  const stockoutFormula = tongYeuCauPhuTung > 0
    ? `${soLanThieuHang} / ${tongYeuCauPhuTung} × 100% = ${stockoutRate}%`
    : 'Chưa có dữ liệu phiếu yêu cầu phụ tùng trong kỳ';

  // Time series Nhap - Xuat - Ton
  const nhapXuatTonSeries = buildTimeSeries(db, parts, periodFilter, now);

  // Top 5 most used parts in period (or fallback to kpiWindow if period is empty today)
  const usageByPart = new Map<string, { qty: number; value: number }>();
  const usageSource = txInPeriod.filter((t) => t.loaiGiaoDich === 'XUAT_KHO');
  for (const t of usageSource) {
    const part = partMap.get(t.phuTungId);
    const prev = usageByPart.get(t.phuTungId) ?? { qty: 0, value: 0 };
    const qty = Math.abs(t.soLuong);
    usageByPart.set(t.phuTungId, {
      qty: prev.qty + qty,
      value: prev.value + qty * (t.donGia || part?.giaNhap || 0),
    });
  }

  const top5SuDung: TopUsedPartPoint[] = Array.from(usageByPart.entries())
    .map(([phuTungId, stats]) => {
      const part = partMap.get(phuTungId);
      return {
        phuTungId,
        maPhuTung: part?.maPhuTung ?? phuTungId,
        tenPhuTung: part?.tenPhuTung ?? 'Phụ tùng',
        soLuongSuDung: stats.qty,
        giaTriSuDung: stats.value,
      };
    })
    .sort((a, b) => b.soLuongSuDung - a.soLuongSuDung)
    .slice(0, 5);

  // Status distribution
  const countByStatus = {
    DU_HANG: parts.filter((p) => p.kpi.trangThai === 'DU_HANG').length,
    CAN_DAT_HANG: parts.filter((p) => p.kpi.trangThai === 'CAN_DAT_HANG').length,
    DUOI_SAFETY_STOCK: parts.filter((p) => p.kpi.trangThai === 'DUOI_SAFETY_STOCK').length,
    HET_HANG: parts.filter((p) => p.kpi.trangThai === 'HET_HANG').length,
  };

  const phanBoTrangThai: StatusDistributionPoint[] = [
    { status: 'DU_HANG', label: 'Đủ hàng', count: countByStatus.DU_HANG, color: '#16A34A' },
    { status: 'CAN_DAT_HANG', label: 'Cần đặt hàng', count: countByStatus.CAN_DAT_HANG, color: '#F59E0B' },
    { status: 'DUOI_SAFETY_STOCK', label: 'Dưới Safety Stock', count: countByStatus.DUOI_SAFETY_STOCK, color: '#EA580C' },
    { status: 'HET_HANG', label: 'Hết hàng', count: countByStatus.HET_HANG, color: '#DC2626' },
  ];

  // Consumption trend
  const avgConsumption = nhapXuatTonSeries.length > 0
    ? Number((nhapXuatTonSeries.reduce((s, p) => s + p.xuat, 0) / nhapXuatTonSeries.length).toFixed(1))
    : 0;
  const xuHuongTieuThu = nhapXuatTonSeries.map((pt) => ({
    label: pt.label,
    tieuThu: pt.xuat,
    trungBinh: avgConsumption,
  }));

  return {
    periodFilter,
    periodLabel: label,
    periodDays: days,
    kpiWindowDays,
    tongMaPhuTung,
    tongSoLuongTon,
    tongGiaTriTonKho,
    soPhuTungCanDatHang,
    soPhuTungHetHang,
    soPhuTungDuoiSafetyStock,
    tongNhapTrongKy,
    tongXuatTrongKy,
    giaVonXuatTrongKy,
    giaTriTonBinhQuan,
    inventoryTurnover,
    inventoryTurnoverFormula,
    doh,
    dohFormula,
    tongGiaTriDeXuatDatHang,
    tongYeuCauPhuTung,
    soLanThieuHang,
    stockoutRate,
    stockoutFormula,
    nhapXuatTonSeries,
    top5SuDung,
    phanBoTrangThai,
    xuHuongTieuThu,
  };
}

function buildTimeSeries(
  db: DatabaseSchema,
  parts: HydratedPart[],
  periodFilter: DashboardPeriodFilter,
  now: Date
): DashboardTimeSeriesPoint[] {
  const totalCurrentStock = parts.reduce((sum, p) => sum + p.tonHienTai, 0);

  if (periodFilter === 'year') {
    // 12 months of current year up to current month
    const year = now.getFullYear();
    const maxMonth = now.getMonth();
    const buckets: Array<{ label: string; dateKey: string; start: Date; end: Date }> = [];
    for (let m = 0; m <= maxMonth; m++) {
      const s = new Date(year, m, 1, 0, 0, 0, 0);
      const e = new Date(year, m + 1, 0, 23, 59, 59, 999);
      buckets.push({
        label: `T${m + 1}`,
        dateKey: `${year}-${String(m + 1).padStart(2, '0')}`,
        start: s,
        end: e,
      });
    }
    return computeBucketSeries(db.NHAP_XUAT_KHO, buckets, totalCurrentStock);
  }

  if (periodFilter === 'quarter') {
    // Weekly buckets across last 12 weeks / quarter
    const qStartMonth = Math.floor(now.getMonth() / 3) * 3;
    const qStart = new Date(now.getFullYear(), qStartMonth, 1, 0, 0, 0, 0);
    const buckets: Array<{ label: string; dateKey: string; start: Date; end: Date }> = [];
    let cursor = new Date(qStart);
    let weekIdx = 1;
    while (cursor <= now) {
      const s = new Date(cursor);
      const e = new Date(cursor);
      e.setDate(e.getDate() + 6);
      e.setHours(23, 59, 59, 999);
      buckets.push({
        label: `Tuần ${weekIdx}`,
        dateKey: s.toISOString().slice(0, 10),
        start: s,
        end: e > now ? now : e,
      });
      cursor.setDate(cursor.getDate() + 7);
      weekIdx++;
    }
    return computeBucketSeries(db.NHAP_XUAT_KHO, buckets, totalCurrentStock);
  }

  if (periodFilter === 'day') {
    // Last 7 days ending today so daily chart has visual continuity, highlighting today
    const buckets: Array<{ label: string; dateKey: string; start: Date; end: Date }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const s = new Date(d);
      s.setHours(0, 0, 0, 0);
      const e = new Date(d);
      e.setHours(23, 59, 59, 999);
      buckets.push({
        label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
        dateKey: s.toISOString().slice(0, 10),
        start: s,
        end: e,
      });
    }
    return computeBucketSeries(db.NHAP_XUAT_KHO, buckets, totalCurrentStock);
  }

  // 'month': daily buckets for last 14 days or current month days
  const daysBack = Math.max(14, now.getDate());
  const buckets: Array<{ label: string; dateKey: string; start: Date; end: Date }> = [];
  for (let i = daysBack - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const s = new Date(d);
    s.setHours(0, 0, 0, 0);
    const e = new Date(d);
    e.setHours(23, 59, 59, 999);
    buckets.push({
      label: `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`,
      dateKey: s.toISOString().slice(0, 10),
      start: s,
      end: e,
    });
  }
  return computeBucketSeries(db.NHAP_XUAT_KHO, buckets, totalCurrentStock);
}

function computeBucketSeries(
  transactions: NhapXuatKho[],
  buckets: Array<{ label: string; dateKey: string; start: Date; end: Date }>,
  totalCurrentStock: number
): DashboardTimeSeriesPoint[] {
  const result: DashboardTimeSeriesPoint[] = [];

  for (const b of buckets) {
    let nhap = 0;
    let xuat = 0;
    for (const t of transactions) {
      const d = new Date(t.ngayGiaoDich);
      if (d >= b.start && d <= b.end) {
        if (t.loaiGiaoDich === 'NHAP_KHO') nhap += Math.abs(t.soLuong);
        else if (t.loaiGiaoDich === 'XUAT_KHO') xuat += Math.abs(t.soLuong);
      }
    }

    // Ending stock at b.end = totalCurrentStock - net changes strictly after b.end
    const netAfterEnd = transactions
      .filter((t) => new Date(t.ngayGiaoDich) > b.end)
      .reduce((sum, t) => {
        if (t.loaiGiaoDich === 'NHAP_KHO') return sum + Math.abs(t.soLuong);
        if (t.loaiGiaoDich === 'XUAT_KHO') return sum - Math.abs(t.soLuong);
        return sum + t.soLuong;
      }, 0);

    result.push({
      label: b.label,
      dateKey: b.dateKey,
      nhap,
      xuat,
      tonCuoiKy: Math.max(0, totalCurrentStock - netAfterEnd),
    });
  }

  return result;
}

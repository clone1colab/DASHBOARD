import React from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Play,
  RotateCcw,
} from 'lucide-react';
import type {
  AppStateResponse,
  DashboardPeriodFilter,
  HydratedPart,
  KpiWindowDays,
} from '../types/inventory';
import { formatCurrency, formatNumber, getStatusMeta } from '../lib/format';

interface DashboardPageProps {
  state: AppStateResponse;
  period: DashboardPeriodFilter;
  onPeriodChange: (p: DashboardPeriodFilter) => void;
  kpiDays: KpiWindowDays;
  onKpiDaysChange: (d: KpiWindowDays) => void;
  onSelectPart: (part: HydratedPart) => void;
  onGoToProposals: () => void;
  onQuickDemoIssuePT001: () => Promise<void>;
  onResetDemo: () => Promise<void>;
  busyAction: boolean;
}

export function DashboardPage({
  state,
  period,
  onPeriodChange,
  kpiDays,
  onKpiDaysChange,
  onSelectPart,
  onGoToProposals,
  onQuickDemoIssuePT001,
  onResetDemo,
  busyAction,
}: DashboardPageProps) {
  const d = state.dashboard;
  const pt001 = state.parts.find((p) => p.maPhuTung === 'PT001');
  const urgentParts = state.parts
    .filter((p) => p.kpi.hetHang || p.kpi.duoiSafetyStock || p.kpi.canDatHang)
    .sort((a, b) => {
      const rank = { HET_HANG: 0, DUOI_SAFETY_STOCK: 1, CAN_DAT_HANG: 2, DU_HANG: 3 };
      return rank[a.kpi.trangThai] - rank[b.kpi.trangThai];
    });

  const periodOptions: Array<{ id: DashboardPeriodFilter; label: string }> = [
    { id: 'day', label: 'Ngày' },
    { id: 'month', label: 'Tháng' },
    { id: 'quarter', label: 'Quý' },
    { id: 'year', label: 'Năm' },
  ];

  const kpiDayOptions: KpiWindowDays[] = [30, 60, 90];

  return (
    <div className="space-y-6">
      {/* Page Title & Filters Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-900 tracking-tight">
            Tổng quan tồn kho phụ tùng
          </h1>
          <p className="text-xs sm:text-sm text-zinc-500 mt-0.5">
            Trung tâm Dịch vụ & Bảo hành Tiến Thu · Kỳ báo cáo: {d.periodLabel} · Chu kỳ tính ADD:{' '}
            {kpiDays} ngày
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period Segmented Filter */}
          <div className="inline-flex items-center p-1 bg-white border border-zinc-200 rounded-lg">
            {periodOptions.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onPeriodChange(opt.id)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  period === opt.id
                    ? 'bg-zinc-900 text-white'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* KPI Window Filter */}
          <div className="inline-flex items-center p-1 bg-white border border-zinc-200 rounded-lg">
            {kpiDayOptions.map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => onKpiDaysChange(days)}
                className={`px-2.5 py-1.5 text-xs font-mono font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  kpiDays === days
                    ? 'bg-orange-600 text-white'
                    : 'text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
                }`}
              >
                {days}N
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Live Demo Scenario Card for PT001 */}
      {pt001 && (
        <div className="bg-white border border-zinc-200 rounded-xl p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
              <span className="font-semibold text-orange-700">Kịch bản kiểm thử BPMN To-Be</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono font-semibold text-zinc-900">PT001 - Má phanh xe máy</span>
              <span aria-hidden="true">·</span>
              <span>
                Trạng thái hiện tại:{' '}
                <strong className={getStatusMeta(pt001.kpi.trangThai).textClass}>
                  {getStatusMeta(pt001.kpi.trangThai).label}
                </strong>
              </span>
            </div>
            <div className="text-xs sm:text-sm text-zinc-700 font-mono tabular-nums">
              Tồn: <strong>{pt001.tonHienTai}</strong> {pt001.donViTinh} · IP:{' '}
              <strong>{pt001.kpi.inventoryPosition}</strong> · ADD:{' '}
              <strong>{pt001.kpi.add}/ngày</strong> · LT: <strong>{pt001.kpi.leadTime} ngày</strong>{' '}
              · SS: <strong>{pt001.kpi.safetyStock}</strong> · ROP:{' '}
              <strong className="text-orange-700">{pt001.kpi.rop}</strong>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={busyAction || pt001.kpi.tonKhaDung < 6}
              onClick={onQuickDemoIssuePT001}
              className="h-9 px-3.5 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-zinc-950 text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <Play className="w-3.5 h-3.5" />
              Xuất thử 6 bộ PT001
            </button>
            <button
              type="button"
              disabled={busyAction}
              onClick={onResetDemo}
              className="h-9 px-3 rounded-lg border border-zinc-200 bg-white hover:bg-zinc-50 disabled:opacity-50 text-zinc-700 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Khôi phục dữ liệu mẫu
            </button>
          </div>
        </div>
      )}

      {/* 10 Dashboard KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 1 */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <div className="text-xs font-medium text-zinc-500">1. Tổng số mã phụ tùng</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-zinc-900 mt-1.5">
            {formatNumber(d.tongMaPhuTung)}
          </div>
          <div className="text-xs text-zinc-500 mt-1">Đang quản lý trong danh mục</div>
        </div>

        {/* 2 */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <div className="text-xs font-medium text-zinc-500">2. Tổng số lượng tồn kho</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-zinc-900 mt-1.5">
            {formatNumber(d.tongSoLuongTon)}
          </div>
          <div className="text-xs text-zinc-500 mt-1">Tổng đơn vị tồn thực tế</div>
        </div>

        {/* 3 */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <div className="text-xs font-medium text-zinc-500">3. Tổng giá trị tồn kho</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-zinc-900 mt-1.5">
            {formatCurrency(d.tongGiaTriTonKho)}
          </div>
          <div className="text-xs text-zinc-500 mt-1">Tính theo giá vốn nhập kho</div>
        </div>

        {/* 4 */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <div className="text-xs font-medium text-zinc-500">4. Phụ tùng cần đặt hàng lại</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-amber-700 mt-1.5">
            {formatNumber(d.soPhuTungCanDatHang)}
          </div>
          <div className="text-xs text-zinc-500 mt-1">Inventory Position ≤ ROP</div>
        </div>

        {/* 5 */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <div className="text-xs font-medium text-zinc-500">5. Phụ tùng hết hàng</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-red-600 mt-1.5">
            {formatNumber(d.soPhuTungHetHang)}
          </div>
          <div className="text-xs text-zinc-500 mt-1">Tồn khả dụng = 0</div>
        </div>

        {/* 6 */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <div className="text-xs font-medium text-zinc-500">6. Dưới mức Safety Stock</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-orange-600 mt-1.5">
            {formatNumber(d.soPhuTungDuoiSafetyStock)}
          </div>
          <div className="text-xs text-zinc-500 mt-1">Tồn khả dụng &lt; ngưỡng an toàn</div>
        </div>

        {/* 7 */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <div className="text-xs font-medium text-zinc-500">7. Nhập / Xuất trong kỳ</div>
          <div className="text-xl font-bold font-mono tabular-nums text-zinc-900 mt-1.5 flex items-baseline gap-2">
            <span className="text-emerald-700">+{formatNumber(d.tongNhapTrongKy)}</span>
            <span className="text-zinc-300">/</span>
            <span className="text-orange-700">-{formatNumber(d.tongXuatTrongKy)}</span>
          </div>
          <div className="text-xs text-zinc-500 mt-1">Trong {d.periodLabel}</div>
        </div>

        {/* 8 */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <div className="text-xs font-medium text-zinc-500">8. Inventory Turnover</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-zinc-900 mt-1.5">
            {d.inventoryTurnover !== null ? `${d.inventoryTurnover} vòng` : '—'}
          </div>
          <div className="text-xs text-zinc-500 mt-1 truncate" title={d.inventoryTurnoverFormula}>
            Vòng quay tồn kho ({d.periodLabel})
          </div>
        </div>

        {/* 9 */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <div className="text-xs font-medium text-zinc-500">9. Days of Inventory (DOH)</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-zinc-900 mt-1.5">
            {d.doh !== null ? `${d.doh} ngày` : '—'}
          </div>
          <div className="text-xs text-zinc-500 mt-1 truncate" title={d.dohFormula}>
            Số ngày tồn kho bình quân
          </div>
        </div>

        {/* 10 */}
        <div className="bg-white border border-zinc-200 rounded-xl p-4">
          <div className="text-xs font-medium text-zinc-500">10. Giá trị đề xuất đặt hàng</div>
          <div className="text-2xl font-bold font-mono tabular-nums text-orange-700 mt-1.5">
            {formatCurrency(d.tongGiaTriDeXuatDatHang)}
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            Stockout Rate:{' '}
            <strong className="font-mono text-zinc-800">
              {d.stockoutRate !== null ? `${d.stockoutRate}%` : 'Chưa có dữ liệu'}
            </strong>
          </div>
        </div>
      </div>

      {/* Charts Grid Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Biểu đồ Nhập - Xuất - Tồn theo thời gian */}
        <div className="lg:col-span-2 bg-white border border-zinc-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-zinc-900">
                Biểu đồ Nhập – Xuất – Tồn theo thời gian
              </h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                Theo dõi biến động lượng nhập, lượng xuất và tổng tồn kho cuối kỳ ({d.periodLabel})
              </p>
            </div>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={d.nhapXuatTonSeries}
                margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#71717A' }} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#71717A' }} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#71717A' }} />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    borderColor: '#E4E4E7',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar yAxisId="left" dataKey="nhap" name="Nhập kho" fill="#16A34A" radius={[4, 4, 0, 0]} />
                <Bar yAxisId="left" dataKey="xuat" name="Xuất kho" fill="#EA580C" radius={[4, 4, 0, 0]} />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="tonCuoiKy"
                  name="Tồn cuối kỳ"
                  stroke="#18181B"
                  strokeWidth={2.5}
                  dot={{ r: 3 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Biểu đồ phân loại trạng thái tồn kho */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5 flex flex-col">
          <h2 className="text-sm font-bold text-zinc-900">Phân loại trạng thái tồn kho</h2>
          <p className="text-xs text-zinc-500 mt-0.5 mb-3">
            Cơ cấu {d.tongMaPhuTung} mã phụ tùng theo ngưỡng ROP & Safety Stock
          </p>
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={d.phanBoTrangThai.filter((s) => s.count > 0)}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={52}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {d.phanBoTrangThai
                    .filter((s) => s.count > 0)
                    .map((entry) => (
                      <Cell key={entry.status} fill={entry.color} />
                    ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    borderColor: '#E4E4E7',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-auto space-y-2 pt-3 border-t border-zinc-100">
            {d.phanBoTrangThai.map((item) => (
              <div key={item.status} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-zinc-700 font-medium">
                  <span
                    className="w-2.5 h-2.5 rounded-sm shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.label}
                </span>
                <span className="font-mono tabular-nums font-bold text-zinc-900">
                  {item.count} mã
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Charts Grid Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top 5 phụ tùng sử dụng nhiều nhất */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-zinc-900">
            Top 5 phụ tùng sử dụng nhiều nhất ({d.periodLabel})
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5 mb-4">
            Tổng hợp từ các phiếu xuất kho bảo hành & sửa chữa (không gồm điều chỉnh kiểm kê)
          </p>
          {d.top5SuDung.length > 0 ? (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={d.top5SuDung}
                  layout="vertical"
                  margin={{ top: 4, right: 24, left: 10, bottom: 4 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#71717A' }} />
                  <YAxis
                    type="category"
                    dataKey="maPhuTung"
                    width={64}
                    tick={{ fontSize: 11, fill: '#18181B', fontWeight: 600 }}
                  />
                  <Tooltip
                    formatter={(value, _name, props) => [
                      `${value ?? 0} đơn vị (${(props?.payload as { tenPhuTung?: string } | undefined)?.tenPhuTung ?? ''})`,
                      'Đã xuất',
                    ]}
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      borderColor: '#E4E4E7',
                    }}
                  />
                  <Bar
                    dataKey="soLuongSuDung"
                    name="Số lượng xuất"
                    fill="#F59E0B"
                    radius={[0, 4, 4, 0]}
                    barSize={22}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-64 flex items-center justify-center text-xs text-zinc-500">
              Chưa có giao dịch xuất kho trong kỳ {d.periodLabel}.
            </div>
          )}
        </div>

        {/* Xu hướng tiêu thụ phụ tùng */}
        <div className="bg-white border border-zinc-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-zinc-900">Xu hướng tiêu thụ phụ tùng</h2>
          <p className="text-xs text-zinc-500 mt-0.5 mb-4">
            So sánh nhu cầu xuất kho theo mốc thời gian với mức tiêu thụ bình quân kỳ
          </p>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={d.xuHuongTieuThu}
                margin={{ top: 8, right: 12, left: -12, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#E4E4E7" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#71717A' }} />
                <YAxis tick={{ fontSize: 11, fill: '#71717A' }} />
                <Tooltip
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    borderColor: '#E4E4E7',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="tieuThu"
                  name="Tiêu thụ thực tế"
                  stroke="#EA580C"
                  fill="#FFEDD5"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="trungBinh"
                  name="Bình quân kỳ"
                  stroke="#52525B"
                  strokeDasharray="4 4"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Urgent Reorder Table */}
      <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-zinc-900">
              Bảng phụ tùng cần đặt hàng gấp ({urgentParts.length})
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Các mã có Inventory Position ≤ ROP, dưới Safety Stock hoặc đã hết hàng
            </p>
          </div>
          <button
            type="button"
            onClick={onGoToProposals}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-700 whitespace-nowrap"
          >
            <span>Xử lý tại trang Đề xuất đặt hàng</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {urgentParts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-zinc-50 text-zinc-500 border-b border-zinc-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Mã PT</th>
                  <th className="px-4 py-3 font-semibold">Tên phụ tùng</th>
                  <th className="px-4 py-3 font-semibold text-right">Tồn kho</th>
                  <th className="px-4 py-3 font-semibold text-right">Đang đặt</th>
                  <th className="px-4 py-3 font-semibold text-right">IP</th>
                  <th className="px-4 py-3 font-semibold text-right">ROP</th>
                  <th className="px-4 py-3 font-semibold text-right">Safety Stock</th>
                  <th className="px-4 py-3 font-semibold text-right">Lead Time</th>
                  <th className="px-4 py-3 font-semibold text-right">Đề xuất đặt</th>
                  <th className="px-4 py-3 font-semibold">Trạng thái cảnh báo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {urgentParts.map((part) => {
                  const k = part.kpi;
                  const meta = getStatusMeta(k.trangThai);
                  return (
                    <tr
                      key={part.id}
                      onClick={() => onSelectPart(part)}
                      className="hover:bg-amber-50/40 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-zinc-900 whitespace-nowrap">
                        {part.maPhuTung}
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-900">{part.tenPhuTung}</td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-zinc-900">
                        {k.tonHienTai} {part.donViTinh}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-600">
                        {k.soLuongDangDat > 0 ? `+${k.soLuongDangDat}` : '0'}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-zinc-900">
                        {k.inventoryPosition}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-semibold text-orange-700">
                        {k.rop}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-700">
                        {k.safetyStock}
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums text-zinc-600">
                        {k.leadTime} ngày
                      </td>
                      <td className="px-4 py-3 text-right font-mono tabular-nums font-bold text-orange-700">
                        {k.roq} {part.donViTinh}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-[11px] font-semibold ${meta.bgClass} ${meta.textClass} ${meta.borderClass}`}
                        >
                          {k.hetHang ? (
                            <AlertOctagon className="w-3 h-3" />
                          ) : (
                            <AlertTriangle className="w-3 h-3" />
                          )}
                          {meta.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <div className="text-sm font-semibold text-zinc-900">
              Tất cả phụ tùng đang ở mức tồn kho an toàn
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              Không có mã nào có Inventory Position nhỏ hơn hoặc bằng Reorder Point.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

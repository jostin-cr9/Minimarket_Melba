const reportDao = require('../dao/reportDao');

const REPORT_RANGES = {
  day: 'Hoy',
  week: 'Últimos 7 días',
  month: 'Últimos 30 días',
  year: 'Último año',
  '5years': 'Últimos 5 años'
};

const reportMoney = v => Math.round((Number(v) || 0) * 100) / 100;

function reportSince(range) {
  const d = new Date();
  if (range === 'day') d.setHours(0, 0, 0, 0);
  else if (range === 'week') d.setDate(d.getDate() - 7);
  else if (range === 'month') d.setDate(d.getDate() - 30);
  else if (range === 'year') d.setFullYear(d.getFullYear() - 1);
  else d.setFullYear(d.getFullYear() - 5);
  return d;
}

async function buildReport(range) {
  const since = reportSince(range);
  const [totales, unidades, productos, vendedores, porDia, ventas] = await Promise.all([
    reportDao.getTotals(since),
    reportDao.getUnits(since),
    reportDao.topProducts(since),
    reportDao.bySeller(since),
    reportDao.byDay(since),
    reportDao.findSales(since, 200)
  ]);

  return {
    range,
    label: REPORT_RANGES[range],
    since,
    resumen: { ventas: Number(totales.ventas), unidades: Number(unidades), total: reportMoney(totales.total) },
    productos: productos.map(p => ({ ...p, unidades: Number(p.unidades), monto: reportMoney(p.monto) })),
    vendedores: vendedores.map(v => ({ ...v, ventas: Number(v.ventas), total: reportMoney(v.total) })),
    porDia: porDia.map(d => ({ ...d, ventas: Number(d.ventas), total: reportMoney(d.total) })),
    ventas
  };
}

module.exports = { REPORT_RANGES, reportMoney, buildReport };
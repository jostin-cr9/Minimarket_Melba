const ExcelJS = require('exceljs');
const { reportMoney } = require('./reportService');

const MONEY = '"S/ "#,##0.00';
const GREEN = 'FF267447';
const fmtFecha = d => new Date(d).toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' });
const styleHeader = row => row.eachCell(cell => {
  cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GREEN } };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
});

// report: resultado de buildReport | detalle: productDetail | ventas: findSales (hasta 5000)
function buildWorkbook({ report, detalle, ventas }) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Minimarket Melba';
  wb.created = new Date();

  // ---- Hoja 1: Resumen ----
  const ws = wb.addWorksheet('Resumen');
  ws.columns = [{ width: 34 }, { width: 18 }, { width: 14 }, { width: 18 }];
  ws.mergeCells('A1:D1');
  ws.getCell('A1').value = 'INFORME DE VENTAS - MINIMARKET MELBA';
  ws.getCell('A1').font = { bold: true, size: 16, color: { argb: GREEN } };
  ws.getCell('A2').value = `Período: ${report.label}`;
  ws.getCell('A3').value = `Desde: ${fmtFecha(report.since)}`;
  ws.getCell('A4').value = `Generado: ${fmtFecha(new Date())}`;

  const r = report.resumen;
  [
    ['Número de ventas', r.ventas, null],
    ['Unidades vendidas', r.unidades, null],
    ['TOTAL DE VENTAS', r.total, MONEY]
  ].forEach(([label, valor, fmt], i) => {
    const row = ws.getRow(6 + i);
    row.getCell(1).value = label;
    row.getCell(2).value = valor;
    if (fmt) row.getCell(2).numFmt = fmt;
    row.font = { bold: i === 2 };
  });

  let fila = 10;
  ws.getCell(`A${fila}`).value = 'Ventas por vendedor';
  ws.getCell(`A${fila}`).font = { bold: true, size: 12 };
  fila++;
  const encV = ws.getRow(fila);
  encV.values = ['Vendedor', 'Usuario', 'Ventas', 'Total'];
  styleHeader(encV);
  report.vendedores.forEach(v => {
    fila++;
    const row = ws.getRow(fila);
    row.values = [v.vendedor, v.username, v.ventas, v.total];
    row.getCell(4).numFmt = MONEY;
  });

  // ---- Hoja 2: Productos ----
  const wp = wb.addWorksheet('Productos');
  wp.columns = [
    { header: 'N.º de artículo', key: 'codigo', width: 16 },
    { header: 'Nombre del artículo', key: 'producto', width: 34 },
    { header: 'Precio prom.', key: 'precio', width: 14, style: { numFmt: MONEY } },
    { header: 'Cantidad', key: 'cantidad', width: 12 },
    { header: 'Total', key: 'total', width: 14, style: { numFmt: MONEY } }
  ];
  const filasProd = detalle.map(d => {
    const cantidad = Number(d.cantidad);
    const total = reportMoney(d.total);
    return { codigo: d.codigo, producto: d.producto, precio: reportMoney(total / cantidad), cantidad, total };
  });
  wp.addRows(filasProd);
  if (filasProd.length) {
    const last = wp.rowCount;
    const sum = k => reportMoney(filasProd.reduce((s, f) => s + f[k], 0));
    const t = wp.addRow({ producto: 'TOTAL' });
    [['D', 'cantidad'], ['E', 'total']].forEach(([col, k]) => {
      t.getCell(col).value = { formula: `SUM(${col}2:${col}${last})`, result: sum(k) };
    });
    t.font = { bold: true };
  }
  styleHeader(wp.getRow(1));
  wp.views = [{ state: 'frozen', ySplit: 1 }];

  // ---- Hoja 3: Ventas por día ----
  const wd = wb.addWorksheet('Ventas por día');
  wd.columns = [
    { header: 'Fecha', key: 'dia', width: 14 },
    { header: 'N.º de ventas', key: 'ventas', width: 14 },
    { header: 'Total', key: 'total', width: 14, style: { numFmt: MONEY } }
  ];
  wd.addRows(report.porDia);
  styleHeader(wd.getRow(1));
  wd.views = [{ state: 'frozen', ySplit: 1 }];

  // ---- Hoja 4: Ventas ----
  const wv = wb.addWorksheet('Ventas');
  wv.columns = [
    { header: 'Transacción', key: 'transaccion', width: 22 },
    { header: 'Fecha', key: 'fecha', width: 18 },
    { header: 'Vendedor', key: 'vendedor', width: 16 },
    { header: 'Cliente', key: 'cliente', width: 36 },
    { header: 'Pago', key: 'pago', width: 14 },
    { header: 'Total', key: 'total', width: 14, style: { numFmt: MONEY } }
  ];
  wv.addRows(ventas.map(v => ({ ...v, fecha: fmtFecha(v.fecha), total: Number(v.total) })));
  styleHeader(wv.getRow(1));
  wv.views = [{ state: 'frozen', ySplit: 1 }];

  return wb;
}

module.exports = { buildWorkbook };
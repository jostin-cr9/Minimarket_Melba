const express = require('express');
const reportDao = require('../dao/reportDao');
const { REPORT_RANGES, buildReport } = require('../services/reportService');
const { buildWorkbook } = require('../services/excelReport');
const logger = require('../logger');
const { asyncRoute, requireRole } = require('../middleware/auth');

const router = express.Router();
const INVALID_RANGE = 'Periodo no válido. Usa: day, week, month, year o 5years.';

// Vista previa del reporte en el panel
router.get('/', requireRole('admin'), asyncRoute(async (req, res) => {
  const range = String(req.query.range || 'day');
  if (!Object.hasOwn(REPORT_RANGES, range)) return res.status(400).json({ error: INVALID_RANGE });
  res.json(await buildReport(range));
}));

// Descarga en Excel (.xlsx)
router.get('/excel', requireRole('admin'), asyncRoute(async (req, res) => {
  const range = String(req.query.range || 'day');
  if (!Object.hasOwn(REPORT_RANGES, range)) return res.status(400).json({ error: INVALID_RANGE });

  const report = await buildReport(range);
  const [detalle, ventas] = await Promise.all([
    reportDao.productDetail(report.since),
    reportDao.findSales(report.since, 5000)
  ]);
  const wb = buildWorkbook({ report, detalle, ventas });

  logger.info('Reporte Excel generado', { range, by: req.session.user.username });
  const archivo = `reporte-ventas-${range}-${new Date().toISOString().slice(0, 10)}.xlsx`;
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${archivo}"`);
  await wb.xlsx.write(res);
  res.end();
}));

module.exports = router;
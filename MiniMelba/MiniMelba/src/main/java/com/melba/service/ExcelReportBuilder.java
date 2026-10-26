package com.melba.service;

import com.melba.dao.Rows;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.VerticalAlignment;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFFont;
import org.apache.poi.xssf.usermodel.XSSFSheet;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Component;

/** Arma el libro de Excel del reporte (equivale a services/excelReport.js). */
@Component
public class ExcelReportBuilder {

    private static final String MONEY = "\"S/ \"#,##0.00";
    private static final byte[] GREEN = {(byte) 0x26, (byte) 0x74, (byte) 0x47}; // FF267447
    private static final DateTimeFormatter FECHA = DateTimeFormatter.ofPattern("dd/MM/yy, HH:mm");

    /** Estilos reutilizados en todas las hojas. */
    private static final class Styles {
        final XSSFCellStyle header;
        final XSSFCellStyle money;
        final XSSFCellStyle boldMoney;
        final XSSFCellStyle bold;
        final XSSFCellStyle title;
        final XSSFCellStyle section;

        Styles(XSSFWorkbook wb) {
            XSSFColor green = new XSSFColor(GREEN, null);
            short moneyFormat = wb.createDataFormat().getFormat(MONEY);

            XSSFFont whiteBold = wb.createFont();
            whiteBold.setBold(true);
            whiteBold.setColor(IndexedColors.WHITE.getIndex());
            header = wb.createCellStyle();
            header.setFont(whiteBold);
            header.setFillForegroundColor(green);
            header.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            header.setAlignment(HorizontalAlignment.CENTER);
            header.setVerticalAlignment(VerticalAlignment.CENTER);
            header.setWrapText(true);

            XSSFFont boldFont = wb.createFont();
            boldFont.setBold(true);
            bold = wb.createCellStyle();
            bold.setFont(boldFont);

            money = wb.createCellStyle();
            money.setDataFormat(moneyFormat);

            boldMoney = wb.createCellStyle();
            boldMoney.setFont(boldFont);
            boldMoney.setDataFormat(moneyFormat);

            XSSFFont titleFont = wb.createFont();
            titleFont.setBold(true);
            titleFont.setFontHeightInPoints((short) 16);
            titleFont.setColor(green);
            title = wb.createCellStyle();
            title.setFont(titleFont);

            XSSFFont sectionFont = wb.createFont();
            sectionFont.setBold(true);
            sectionFont.setFontHeightInPoints((short) 12);
            section = wb.createCellStyle();
            section.setFont(sectionFont);
        }
    }

    public byte[] build(ReportService.Report report, List<Rows.ProductDetail> detalle,
                        List<Rows.SaleRow> ventas) throws IOException {
        try (XSSFWorkbook wb = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            wb.getProperties().getCoreProperties().setCreator("Minimarket Melba");
            Styles st = new Styles(wb);

            resumen(wb, st, report);
            productos(wb, st, detalle);
            ventasPorDia(wb, st, report);
            ventas(wb, st, ventas);

            wb.setForceFormulaRecalculation(true);
            wb.write(out);
            return out.toByteArray();
        }
    }

    // ---- Hoja 1: Resumen ----
    private void resumen(XSSFWorkbook wb, Styles st, ReportService.Report report) {
        XSSFSheet ws = wb.createSheet("Resumen");
        widths(ws, 34, 18, 14, 18);

        ws.addMergedRegion(new CellRangeAddress(0, 0, 0, 3));
        Cell titulo = cell(ws, 0, 0);
        titulo.setCellValue("INFORME DE VENTAS - MINIMARKET MELBA");
        titulo.setCellStyle(st.title);
        cell(ws, 1, 0).setCellValue("Período: " + report.label());
        cell(ws, 2, 0).setCellValue("Desde: " + fecha(report.since()));
        cell(ws, 3, 0).setCellValue("Generado: " + fecha(java.time.Instant.now()));

        ReportService.Summary r = report.resumen();
        cell(ws, 5, 0).setCellValue("Número de ventas");
        cell(ws, 5, 1).setCellValue(r.ventas());
        cell(ws, 6, 0).setCellValue("Unidades vendidas");
        cell(ws, 6, 1).setCellValue(r.unidades());
        Cell totalLabel = cell(ws, 7, 0);
        totalLabel.setCellValue("TOTAL DE VENTAS");
        totalLabel.setCellStyle(st.bold);
        Cell totalValue = cell(ws, 7, 1);
        totalValue.setCellValue(r.total().doubleValue());
        totalValue.setCellStyle(st.boldMoney);

        Cell seccion = cell(ws, 9, 0);
        seccion.setCellValue("Ventas por vendedor");
        seccion.setCellStyle(st.section);
        header(ws, st, 10, "Vendedor", "Usuario", "Ventas", "Total");
        int fila = 11;
        for (Rows.SellerTotal v : report.vendedores()) {
            cell(ws, fila, 0).setCellValue(v.vendedor());
            cell(ws, fila, 1).setCellValue(v.username());
            cell(ws, fila, 2).setCellValue(v.ventas());
            Cell total = cell(ws, fila, 3);
            total.setCellValue(v.total().doubleValue());
            total.setCellStyle(st.money);
            fila++;
        }
    }

    // ---- Hoja 2: Productos ----
    private void productos(XSSFWorkbook wb, Styles st, List<Rows.ProductDetail> detalle) {
        XSSFSheet wp = wb.createSheet("Productos");
        widths(wp, 16, 34, 14, 12, 14);
        header(wp, st, 0, "N.º de artículo", "Nombre del artículo", "Precio prom.", "Cantidad", "Total");

        long sumCantidad = 0;
        BigDecimal sumTotal = BigDecimal.ZERO;
        int fila = 1;
        for (Rows.ProductDetail d : detalle) {
            BigDecimal total = d.total() == null ? BigDecimal.ZERO : d.total().setScale(2, RoundingMode.HALF_UP);
            BigDecimal precio = d.cantidad() > 0
                    ? total.divide(BigDecimal.valueOf(d.cantidad()), 2, RoundingMode.HALF_UP)
                    : BigDecimal.ZERO;
            cell(wp, fila, 0).setCellValue(d.codigo());
            cell(wp, fila, 1).setCellValue(d.producto());
            Cell cPrecio = cell(wp, fila, 2);
            cPrecio.setCellValue(precio.doubleValue());
            cPrecio.setCellStyle(st.money);
            cell(wp, fila, 3).setCellValue(d.cantidad());
            Cell cTotal = cell(wp, fila, 4);
            cTotal.setCellValue(total.doubleValue());
            cTotal.setCellStyle(st.money);
            sumCantidad += d.cantidad();
            sumTotal = sumTotal.add(total);
            fila++;
        }

        if (!detalle.isEmpty()) {
            int last = detalle.size() + 1; // número de la última fila de datos
            Cell label = cell(wp, fila, 1);
            label.setCellValue("TOTAL");
            label.setCellStyle(st.bold);
            Cell cantidad = cell(wp, fila, 3);
            cantidad.setCellFormula("SUM(D2:D" + last + ")");
            cantidad.setCellStyle(st.bold);
            Cell total = cell(wp, fila, 4);
            total.setCellFormula("SUM(E2:E" + last + ")");
            total.setCellStyle(st.boldMoney);
        }
        wp.createFreezePane(0, 1);
    }

    // ---- Hoja 3: Ventas por día ----
    private void ventasPorDia(XSSFWorkbook wb, Styles st, ReportService.Report report) {
        XSSFSheet wd = wb.createSheet("Ventas por día");
        widths(wd, 14, 14, 14);
        header(wd, st, 0, "Fecha", "N.º de ventas", "Total");
        int fila = 1;
        for (Rows.DayTotal d : report.porDia()) {
            cell(wd, fila, 0).setCellValue(d.dia());
            cell(wd, fila, 1).setCellValue(d.ventas());
            Cell total = cell(wd, fila, 2);
            total.setCellValue(d.total().doubleValue());
            total.setCellStyle(st.money);
            fila++;
        }
        wd.createFreezePane(0, 1);
    }

    // ---- Hoja 4: Ventas ----
    private void ventas(XSSFWorkbook wb, Styles st, List<Rows.SaleRow> ventas) {
        XSSFSheet wv = wb.createSheet("Ventas");
        widths(wv, 22, 18, 16, 36, 14, 14);
        header(wv, st, 0, "Transacción", "Fecha", "Vendedor", "Cliente", "Pago", "Total");
        int fila = 1;
        for (Rows.SaleRow v : ventas) {
            cell(wv, fila, 0).setCellValue(v.transaccion());
            cell(wv, fila, 1).setCellValue(fecha(v.fecha()));
            cell(wv, fila, 2).setCellValue(v.vendedor());
            cell(wv, fila, 3).setCellValue(v.cliente());
            cell(wv, fila, 4).setCellValue(v.pago());
            Cell total = cell(wv, fila, 5);
            total.setCellValue(v.total().doubleValue());
            total.setCellStyle(st.money);
            fila++;
        }
        wv.createFreezePane(0, 1);
    }

    // ---- Utilidades ----
    private static void header(Sheet sheet, Styles st, int rowIndex, String... titles) {
        for (int i = 0; i < titles.length; i++) {
            Cell c = cell(sheet, rowIndex, i);
            c.setCellValue(titles[i]);
            c.setCellStyle(st.header);
        }
    }

    private static void widths(Sheet sheet, int... chars) {
        for (int i = 0; i < chars.length; i++) {
            sheet.setColumnWidth(i, chars[i] * 256);
        }
    }

    private static Cell cell(Sheet sheet, int rowIndex, int colIndex) {
        Row row = sheet.getRow(rowIndex);
        if (row == null) row = sheet.createRow(rowIndex);
        Cell cell = row.getCell(colIndex);
        return cell != null ? cell : row.createCell(colIndex);
    }

    private static String fecha(java.time.Instant instant) {
        if (instant == null) return "";
        return FECHA.format(ZonedDateTime.ofInstant(instant, ZoneId.systemDefault()));
    }
}
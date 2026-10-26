package pe.minimelba.report.service;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Instant;
import java.util.List;
import java.util.Map;

@Service
public class ExcelReportService {
    private final ReportService reports;
    public ExcelReportService(ReportService reports) { this.reports = reports; }

    public byte[] create(String range) {
        Map<String,Object> report = reports.build(range);
        Instant from = reports.reportSince(range);
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            CellStyle headerStyle = workbook.createCellStyle();
            Font font = workbook.createFont(); font.setBold(true); headerStyle.setFont(font);
            Sheet summary = workbook.createSheet("Resumen");
            row(summary, 0, headerStyle, "Informe de ventas - Minimarket Melba");
            row(summary, 1, null, "Período", report.get("label"));
            row(summary, 2, null, "Desde", from.toString());
            Map<?,?> totals = (Map<?,?>)report.get("resumen");
            row(summary, 4, headerStyle, "Número de ventas", "Unidades vendidas", "Total vendido");
            row(summary, 5, null, totals.get("ventas"), totals.get("unidades"), totals.get("total"));
            addTable(workbook, "Productos", new String[]{"Código", "Producto", "Cantidad", "Total"},
                    reports.productDetail(from), new String[]{"codigo", "producto", "cantidad", "total"}, headerStyle);
            addTable(workbook, "Ventas por día", new String[]{"Fecha", "Ventas", "Total"},
                    cast(report.get("porDia")), new String[]{"dia", "ventas", "total"}, headerStyle);
            addTable(workbook, "Ventas", new String[]{"Transacción", "Fecha", "Vendedor", "Cliente", "Pago", "Total"},
                    reports.sales(from, 5000), new String[]{"transaccion", "fecha", "vendedor", "cliente", "pago", "total"}, headerStyle);
            workbook.write(output);
            return output.toByteArray();
        } catch (IOException e) { throw new IllegalStateException("No se pudo generar el archivo Excel.", e); }
    }

    private static void addTable(Workbook workbook, String name, String[] headers, List<Map<String,Object>> data,
                                 String[] keys, CellStyle style) {
        Sheet sheet = workbook.createSheet(name);
        Row header = sheet.createRow(0);
        for (int i=0; i<headers.length; i++) { Cell cell=header.createCell(i); cell.setCellValue(headers[i]); cell.setCellStyle(style); }
        int r=1;
        for (Map<String,Object> item : data) {
            Row row=sheet.createRow(r++);
            for (int c=0; c<keys.length; c++) put(row.createCell(c), item.get(keys[c]));
        }
        for (int i=0; i<headers.length; i++) sheet.autoSizeColumn(i);
    }
    private static void row(Sheet sheet, int row, CellStyle style, Object... values) {
        Row r=sheet.createRow(row);
        for (int i=0;i<values.length;i++){ Cell c=r.createCell(i); put(c,values[i]); if(style!=null)c.setCellStyle(style); }
    }
    private static void put(Cell cell, Object value) {
        if (value == null) return;
        if (value instanceof Number n) cell.setCellValue(n.doubleValue()); else cell.setCellValue(value.toString());
    }
    @SuppressWarnings("unchecked")
    private static List<Map<String,Object>> cast(Object o) { return (List<Map<String,Object>>)o; }
}

package com.melba.controller;

import com.melba.dao.Rows;
import com.melba.exception.ApiException;
import com.melba.model.Role;
import com.melba.security.RequireRole;
import com.melba.security.SessionUser;
import com.melba.service.ExcelReportBuilder;
import com.melba.service.ReportService;
import jakarta.servlet.http.HttpServletRequest;
import java.io.IOException;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/reports")
@RequireRole(Role.ADMIN)
public class ReportController {

    private static final Logger log = LoggerFactory.getLogger(ReportController.class);
    private static final String INVALID_RANGE = "Periodo no válido. Usa: day, week, month, year o 5years.";
    private static final String XLSX = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

    private final ReportService service;
    private final ExcelReportBuilder excel;

    public ReportController(ReportService service, ExcelReportBuilder excel) {
        this.service = service;
        this.excel = excel;
    }

    /** Vista previa del reporte en el panel. */
    @GetMapping
    public ReportService.Report preview(@RequestParam(required = false) String range) {
        return service.buildReport(validRange(range));
    }

    /** Descarga en Excel (.xlsx). */
    @GetMapping("/excel")
    public ResponseEntity<byte[]> download(@RequestParam(required = false) String range,
                                           HttpServletRequest request) throws IOException {
        String period = validRange(range);
        ReportService.Report report = service.buildReport(period);
        List<Rows.ProductDetail> detalle = service.productDetail(report.since());
        List<Rows.SaleRow> ventas = service.sales(report.since(), 5000);
        byte[] file = excel.build(report, detalle, ventas);

        SessionUser user = SessionUser.of(request);
        log.info("Reporte Excel generado range={} by={}", period, user.username());

        String name = "reporte-ventas-" + period + "-" + LocalDate.now(ZoneOffset.UTC) + ".xlsx";
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(XLSX))
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + name + "\"")
                .body(file);
    }

    private String validRange(String range) {
        String period = (range == null || range.isEmpty()) ? "day" : range;
        if (!service.isValidRange(period)) throw new ApiException(400, INVALID_RANGE);
        return period;
    }
}
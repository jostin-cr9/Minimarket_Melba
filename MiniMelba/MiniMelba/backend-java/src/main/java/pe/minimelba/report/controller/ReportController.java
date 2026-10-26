package pe.minimelba.report.controller;

import jakarta.servlet.http.HttpSession;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import pe.minimelba.common.SessionAccess;
import pe.minimelba.report.service.ExcelReportService;
import pe.minimelba.report.service.ReportService;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/reports")
public class ReportController {
    private final ReportService reports;
    private final ExcelReportService excel;
    private final SessionAccess access;
    public ReportController(ReportService reports, ExcelReportService excel, SessionAccess access) {
        this.reports=reports; this.excel=excel; this.access=access;
    }
    @GetMapping
    public Map<String,Object> report(@RequestParam(defaultValue="day") String range, HttpSession session) {
        access.requireRole(session,"admin"); return reports.build(range);
    }
    @GetMapping("/excel")
    public ResponseEntity<byte[]> excel(@RequestParam(defaultValue="day") String range, HttpSession session) {
        access.requireRole(session,"admin");
        byte[] bytes=excel.create(range);
        return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=\"reporte-ventas-"+range+".xlsx\"")
                .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .body(bytes);
    }
}
